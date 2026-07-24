"""
services/timetable_import_service.py
──────────────────────────────────────
Core business logic for the timetable Excel import pipeline.

Architecture (SOLID)
─────────────────────
  Single Responsibility : each private helper does exactly one thing
  Open/Closed           : new cell formats can be supported by extending
                          _parse_cell_text() in excel_parser.py only
  Dependency Inversion  : the service depends on the DB Session abstraction,
                          not on concrete models directly
  Interface Segregation : the public surface is a single function — import_timetable()

Pipeline
─────────
  1. parse_staff_sheet()     →  list[ParsedSlot]   (Excel layer)
  2. _build_lookup_maps()    →  teacher/subject/class dicts keyed by normalized name
  3. _resolve_slots()        →  list[ResolvedSlot] + validation_errors
  4. _filter_duplicates()    →  remove already-existing (teacher,day,period) combos
  5. _detect_conflicts()     →  class-level conflict report
  6. _bulk_insert()          →  one transaction, rollback only on DB error
  7. Return TimetableImportResult

Name normalization — two strategies
──────────────────────────────────────
  _normalize(text)         : used for subjects and classes.
                             Strips whitespace, collapses spaces, lowercases.
                             Order of words is preserved ("I CS A" must stay "i cs a").

  _normalize_teacher(name) : thin wrapper around
                             app.utils.teacher_name_normalizer.normalize_teacher_name.
                             Strips titles (DR, PROF), converts dots to spaces,
                             splits into tokens, sorts alphabetically, joins.
                             Critically: dots are converted to spaces BEFORE title
                             stripping so \\b word-boundary anchors work for all
                             patterns including "DR.VIJAYA" (no space after dot).

                             Examples:
                               "Dr.V.VIJAYA DEEPA"  →  "deepa v vijaya"
                               "VIJAYA DEEPA V"      →  "deepa v vijaya"  (match!)
                               "R.P.SATHIYA PRIYA"  →  "p priya r sathiya"
                               "SATHIYA PRIYA R P"   →  "p priya r sathiya" (match!)

Class matching strategy
────────────────────────
  The classes table stores `name` and `section` separately.
  Excel cells may contain:
    "I CS A"  →  name="I CS", section="A"   →  combined key "i cs a"
    "III IT"  →  name="III IT", section=""  →  key "iii it"

  We index classes by both:
    - normalize(cls.name + " " + cls.section)  →  full match
    - normalize(cls.name)                       →  fallback (section-less match)
"""

from __future__ import annotations

import logging
import re
from collections import defaultdict
from typing import NamedTuple

from sqlalchemy.orm import Session

from app.models.class_ import Class
from app.models.subject import Subject
from app.models.timetable import TimetableSlot
from app.models.user import Role, User
from app.models.department import Department
from app.models.room import Room
from app.schemas.timetable_import import (
    TimetableImportResult,
    TimetableImportPreviewResponse,
    TimetableImportPreviewRow,
    TimetableImportPreviewSummary,
    TimetableImportCommitRow,
)
from app.utils.excel_parser import ParsedSlot, parse_staff_sheet
from app.utils.teacher_name_normalizer import (
    build_teacher_lookup,
    is_placeholder_teacher,
    normalize_teacher_name,
)
from app.services.admin_service import log_audit_event
from difflib import SequenceMatcher

logger = logging.getLogger(__name__)


# ── Internal resolved record ───────────────────────────────────────────────────

class ResolvedSlot(NamedTuple):
    """A slot after all DB IDs have been resolved."""
    teacher_id: int
    teacher_name: str
    subject_id: int | None
    class_id: int | None
    day_order: int
    period_number: int


# ── Name normalization ─────────────────────────────────────────────────────────
#
# Teacher names: delegate entirely to app.utils.teacher_name_normalizer.
#   - normalize_teacher_name()  : canonical, order-independent key
#   - is_placeholder_teacher()  : detect NEW STAFF / VACANT / TBA etc.
#   - build_teacher_lookup()    : build the O(1) lookup dict from DB rows
#
# The normalizer guarantees:
#   1. Uppercase
#   2. Dots → spaces (BEFORE title stripping — avoids \b edge cases)
#   3. Strip DR / PROF / MR / MRS / MS / SRI / SMT as whole words
#   4. Remove remaining non-alphanumeric characters
#   5. Collapse whitespace
#   6. Tokenize and sort alphabetically
#   7. Lowercase join
#
# This makes "Dr.V.VIJAYA DEEPA" == "VIJAYA DEEPA V" == key "deepa v vijaya".
# Matching NEVER relies on exact string equality.


def _extract_year_section_from_raw(class_raw_text: str) -> tuple[str | None, str | None]:
    """
    Extract roman numeral year (I-V) and single letter section from a raw class string.
    E.g. "I CS A" -> ("I", "A")
         "III - D" -> ("III", "D")
    """
    if not class_raw_text:
        return None, None
    # normalize hyphens and spaces
    cleaned = re.sub(r'([A-Za-z0-9])\-([A-Za-z0-9])', r'\1 \2', class_raw_text)
    tokens = [t.strip() for t in re.split(r'[-—\s]+', cleaned) if t.strip()]
    
    roman_years = {"I", "II", "III", "IV", "V"}
    year = None
    section = None
    
    # Try to find a roman numeral year first
    for t in tokens:
        ut = t.upper()
        if ut in roman_years:
            year = ut
            break
            
    # Try to find a single letter section (excluding the year itself)
    for t in tokens:
        ut = t.upper()
        if len(ut) == 1 and ut.isalpha():
            if ut != year:
                section = ut
                break
                
    return year, section


def _normalize(text: str) -> str:
    """
    General-purpose name normalizer for subjects and classes.

    Preserves word order ("I CS A" must not be sorted — section matters).
    Steps: strip → collapse whitespace → lowercase.
    """
    return re.sub(r"\s+", " ", text.strip()).lower()


# Public aliases kept for any code that imports these symbols directly.
# The actual implementation lives in app.utils.teacher_name_normalizer.
_normalize_teacher = normalize_teacher_name
_is_skip_teacher = is_placeholder_teacher


# ── DB lookup map builders ─────────────────────────────────────────────────────

def _build_teacher_map(db: Session, tenant_department_id: int | None = None) -> dict[str, int]:
    """
    Return { normalize_teacher_name(user.name): user.id } for all active teachers.

    Keys are token-sorted canonical strings so that name order variations
    between the DB and Excel are handled transparently.
    Only users with role='teacher' are indexed. Admins are excluded.

    Matching is ALWAYS based on normalized token comparison.
    Exact string equality is never used.
    """
    query = db.query(User.id, User.name).filter(User.role == Role.teacher, User.is_active == True)  # noqa: E712
    if tenant_department_id is not None:
        query = query.filter(User.department_id == tenant_department_id)
    teacher_rows = query.all()
    # build_teacher_lookup handles degenerate names, duplicate keys, and logging
    return build_teacher_lookup(teacher_rows)


def _build_subject_map(db: Session, tenant_department_id: int | None = None) -> dict[str, int]:
    """
    Return a lookup map for non-archived subjects, keyed by both their
    normalized name and normalized code.
    """
    query = db.query(Subject.id, Subject.name, Subject.code).filter(Subject.is_archived == False)  # noqa: E712
    if tenant_department_id is not None:
        query = query.filter(Subject.department_id == tenant_department_id)
    subjects = query.all()

    subject_map: dict[str, int] = {}
    for sid, sname, scode in subjects:
        # Index by normalized name
        name_key = _normalize(sname)
        if name_key not in subject_map:
            subject_map[name_key] = sid
        # Index by normalized code
        if scode:
            code_key = _normalize(scode)
            if code_key not in subject_map:
                subject_map[code_key] = sid
    logger.debug("Subject lookup map: %d entries", len(subject_map))
    return subject_map


def _resolve_subject_id(s_key: str, subject_map: dict[str, int]) -> int | None:
    """
    Resolve subject ID from the normalized subject key, supporting common codes,
    aliases, spelling variations, and stripping lab suffixes.
    """
    # 1. Direct lookup
    val = subject_map.get(s_key)
    if val is not None:
        return val

    # 2. Basic cleanup (spaces/hyphens)
    cleaned = re.sub(r"[-—\s]+", " ", s_key).strip()
    val = subject_map.get(cleaned)
    if val is not None:
        return val

    # 3. Handle spelling/variation aliases
    if cleaned in ("adbms", "adbms lab"):
        return subject_map.get("adms")
    if cleaned in ("cripto", "crypto"):
        return subject_map.get("crypto")
    if cleaned == "python":
        return subject_map.get("pp") or subject_map.get("py")
    if cleaned in ("nw", "n/w", "network"):
        return subject_map.get("nm")
    if cleaned in ("cs", "cyber"):
        return subject_map.get("cyber")
    if cleaned in ("mp", "mpes"):
        return subject_map.get("mpes")

    # 4. Handle lab suffix variations
    # Replace lab suffixes like: " lab - b5", " lab-b5", " lab", " - b5 lab"
    lab_cleaned = re.sub(r"\b(?:lab\s*[-—\s]?\s*[a-z]\d+|lab\b|[a-z]\d+\s*[-—\s]?\s*lab)\b", "", cleaned, flags=re.IGNORECASE)
    # Remove trailing "prog" if it's part of "c prog"
    lab_cleaned = re.sub(r"\bprog\b", "", lab_cleaned, flags=re.IGNORECASE)
    lab_cleaned = re.sub(r"\s+", " ", lab_cleaned).strip()

    val = subject_map.get(lab_cleaned)
    if val is not None:
        return val

    # Specific fallback for c programming labs
    if lab_cleaned in ("c prog", "c"):
        return subject_map.get("c")
    if lab_cleaned == "prog":
        return subject_map.get("c")

    # Recursive check with stripped lab key
    if lab_cleaned != cleaned:
        return _resolve_subject_id(lab_cleaned, subject_map)

    return None


def _build_class_map(db: Session, tenant_department_id: int | None = None) -> tuple[dict[str, int], dict[str, int]]:
    """
    Return two maps for class matching:
      full_map  : normalize(name + ' ' + section) → class_id
      name_map  : normalize(name) → class_id  (fallback, section omitted)

    Class names like "I CS A" are stored as name="I CS", section="A".
    The parser extracts the raw text from the Excel, so we index both ways.
    """
    query = db.query(Class.id, Class.name, Class.section)
    if tenant_department_id is not None:
        query = query.filter(Class.department_id == tenant_department_id)
    classes = query.all()

    full_map: dict[str, int] = {}
    name_map: dict[str, int] = {}
    for cid, cname, csection in classes:
        # Full key: "i cs a"
        full_key = _normalize(f"{cname} {csection}") if csection else _normalize(cname)
        if full_key not in full_map:
            full_map[full_key] = cid
        # Name-only key: "i cs" (used as fallback)
        name_key = _normalize(cname)
        if name_key not in name_map:
            name_map[name_key] = cid
    logger.debug(
        "Class lookup maps: %d full-key entries, %d name-only entries",
        len(full_map), len(name_map),
    )
    return full_map, name_map


def _resolve_class_id(c_key: str, class_full_map: dict[str, int], class_name_map: dict[str, int]) -> int | None:
    """
    Resolve class ID from the normalized class key, supporting common aliases,
    abbreviations, and formatting variations.
    """
    # 1. Direct lookup in maps
    val = class_full_map.get(c_key) or class_name_map.get(c_key)
    if val is not None:
        return val

    # 2. Apply general cleanup (spaces, hyphens) and retry
    cleaned = re.sub(r"[-—]+", " ", c_key)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    val = class_full_map.get(cleaned) or class_name_map.get(cleaned)
    if val is not None:
        return val

    # 3. Handle specific department naming variations (e.g. M.Sc. CS)
    if cleaned in ("i m sc", "i msc", "i msc cs", "i m.sc", "i m.sc.", "i m.sc. cs"):
        return class_name_map.get("i m.sc. cs") or class_full_map.get("i m.sc. cs")
    if cleaned in ("ii m sc", "ii msc", "ii msc cs", "ii m.sc", "ii m.sc.", "ii m.sc. cs"):
        return class_name_map.get("ii m.sc. cs") or class_full_map.get("ii m.sc. cs")

    # 4. Handle section abbreviations (e.g. "iii - d" or "iii d" -> "iii cs d")
    if cleaned in ("iii d", "iii cs d"):
        return class_full_map.get("iii cs d")
    if cleaned in ("iii c", "iii cs c"):
        return class_full_map.get("iii cs c")
    if cleaned in ("iii b", "iii cs b"):
        return class_full_map.get("iii cs b")
    if cleaned in ("iii a", "iii cs a"):
        return class_full_map.get("iii cs a")

    if cleaned in ("ii d", "ii cs d"):
        return class_full_map.get("ii cs d")
    if cleaned in ("ii c", "ii cs c"):
        return class_full_map.get("ii cs c")
    if cleaned in ("ii b", "ii cs b"):
        return class_full_map.get("ii cs b")
    if cleaned in ("ii a", "ii cs a"):
        return class_full_map.get("ii cs a")

    return None


# ── Resolution layer ───────────────────────────────────────────────────────────

def _resolve_slots(
    raw_slots: list[ParsedSlot],
    teacher_map: dict[str, int],
    subject_map: dict[str, int],
    class_full_map: dict[str, int],
    class_name_map: dict[str, int],
    validation_errors: list[str],
) -> tuple[list[ResolvedSlot], set[str]]:
    """
    Convert ParsedSlot records into ResolvedSlot records by looking up DB IDs.

    Rules
    ─────
    - Teacher not found → log error, skip slot entirely
    - Subject not found → log error, insert with subject_id=None
    - Class not found/missing → log error, skip slot (since class_id is NOT NULL in DB)
    - Valid slots are returned; invalid teacher or class slots are dropped

    Returns
    -------
    resolved  : list of ResolvedSlot ready for insertion
    teachers_seen : set of teacher names successfully processed
    """
    resolved: list[ResolvedSlot] = []
    teachers_seen: set[str] = set()

    # Track which error messages we've already logged (avoid duplicates per teacher)
    _logged_teacher_errors: set[str] = set()
    _logged_subject_errors: set[str] = set()
    _logged_class_errors: set[str] = set()

    for slot in raw_slots:
        # ── Silent skip for placeholder entries (NEW STAFF, VACANT, etc.) ──────
        # is_placeholder_teacher() checks for known placeholder patterns;
        # these are silently dropped and never reported as unknown-teacher errors.
        if is_placeholder_teacher(slot.teacher_name):
            logger.debug("Silently skipping placeholder teacher: '%s'", slot.teacher_name)
            continue

        # Normalize the Excel name and perform O(1) lookup.
        # normalize_teacher_name() is the sole matching mechanism —
        # no exact-string comparison is performed anywhere in this pipeline.
        t_key = normalize_teacher_name(slot.teacher_name)
        teacher_id = teacher_map.get(t_key)

        if teacher_id is None:
            err_key = f"teacher:{t_key}"
            if err_key not in _logged_teacher_errors:
                msg = (
                    f"Unknown teacher — "
                    f"Original: '{slot.teacher_name}'  |  "
                    f"Normalized key: '{t_key}'  |  "
                    f"Not found in users (role=teacher). All slots for this teacher skipped."
                )
                validation_errors.append(msg)
                logger.warning(msg)
                _logged_teacher_errors.add(err_key)
            continue  # skip entire teacher block once marked unknown

        teachers_seen.add(slot.teacher_name)

        # ── Subject resolution ────────────────────────────────────────────────
        subject_id: int | None = None
        if slot.subject_raw:
            s_key = _normalize(slot.subject_raw)
            subject_id = _resolve_subject_id(s_key, subject_map)
            if subject_id is None:
                err_key = f"subject:{s_key}"
                if err_key not in _logged_subject_errors:
                    msg = (
                        f"Unknown subject '{slot.subject_raw}' "
                        f"(teacher: {slot.teacher_name}, {slot.source_cell}) — "
                        f"inserted with subject_id=NULL."
                    )
                    validation_errors.append(msg)
                    logger.warning(msg)
                    _logged_subject_errors.add(err_key)

        # ── Class resolution ──────────────────────────────────────────────────
        class_id: int | None = None
        if slot.class_raw:
            c_key = _normalize(slot.class_raw)
            # Try full key, fallback, and common aliases/abbreviations
            class_id = _resolve_class_id(c_key, class_full_map, class_name_map)
            if class_id is None:
                err_key = f"class:{c_key}"
                if err_key not in _logged_class_errors:
                    msg = (
                        f"Unknown class '{slot.class_raw}' "
                        f"(teacher: {slot.teacher_name}, {slot.source_cell}) — "
                        f"slot skipped (class is required)."
                    )
                    validation_errors.append(msg)
                    logger.warning(msg)
                    _logged_class_errors.add(err_key)
                continue  # skip slot since class is required and not found in database
        else:
            # slot.class_raw is None/empty, but class_id is NOT NULL in database
            msg = (
                f"Missing class for slot '{slot.subject_raw}' "
                f"(teacher: {slot.teacher_name}, {slot.source_cell}) — "
                f"slot skipped (class is required)."
            )
            validation_errors.append(msg)
            logger.warning(msg)
            continue  # skip slot since class is required

        if class_id is None:
            # Under standard execution, this should be unreachable due to the validation/continue
            # blocks above. However, we keep it as a fail-safe check.
            msg = (
                f"Failsafe: class_id is None for slot '{slot.subject_raw}' "
                f"(teacher: {slot.teacher_name}, {slot.source_cell}) — "
                f"slot skipped (class is required)."
            )
            validation_errors.append(msg)
            logger.error(msg)
            continue

        resolved.append(
            ResolvedSlot(
                teacher_id=teacher_id,
                teacher_name=slot.teacher_name,
                subject_id=subject_id,
                class_id=class_id,
                day_order=slot.day_order,
                period_number=slot.period_number,
            )
        )

    return resolved, teachers_seen


# ── Duplicate filter ───────────────────────────────────────────────────────────

def _filter_duplicates(
    resolved: list[ResolvedSlot],
    db: Session,
) -> tuple[list[ResolvedSlot], int]:
    """
    Remove slots where (teacher_id, day_order, period_number) already exists
    in timetable_slots.

    Also deduplicates within the current import batch itself (in case the
    Excel has the same slot listed multiple times).

    Returns
    -------
    (unique_slots, duplicates_skipped_count)
    """
    # Load all existing teacher-day-period keys from the DB
    existing_rows = db.query(
        TimetableSlot.teacher_id,
        TimetableSlot.day_order,
        TimetableSlot.period_number,
    ).all()
    existing_keys: set[tuple[int, int, int]] = {
        (r.teacher_id, r.day_order, r.period_number) for r in existing_rows
    }

    unique: list[ResolvedSlot] = []
    seen_in_batch: set[tuple[int, int, int]] = set()
    skipped = 0

    for slot in resolved:
        key = (slot.teacher_id, slot.day_order, slot.period_number)
        if key in existing_keys or key in seen_in_batch:
            skipped += 1
            logger.debug(
                "Duplicate skipped: teacher_id=%d DO=%d P=%d",
                slot.teacher_id, slot.day_order, slot.period_number,
            )
        else:
            unique.append(slot)
            seen_in_batch.add(key)

    return unique, skipped


# ── Conflict detector ──────────────────────────────────────────────────────────

def _detect_conflicts(
    resolved: list[ResolvedSlot],
    db: Session,
) -> tuple[list[ResolvedSlot], list[str]]:
    """
    Detect class-level scheduling conflicts: same class_id, same day_order,
    same period_number, but assigned to two different teachers.

    Checks:
      1. Conflicts within the import batch itself (two teachers, same class+slot)
      2. Conflicts between the batch and existing DB rows

    Returns a tuple of:
      - list of ResolvedSlot: slots that have no class-level conflicts and can be inserted
      - list of str: human-readable conflict descriptions
    """
    conflicts: list[str] = []

    # ── Within-batch conflicts ────────────────────────────────────────────────
    # Track the slot that "wins" the class slot reservation within this batch
    batch_class_slot_winner: dict[tuple[int, int, int], ResolvedSlot] = {}
    non_conflicting_batch: list[ResolvedSlot] = []

    for slot in resolved:
        if slot.class_id is None:
            continue
        key = (slot.class_id, slot.day_order, slot.period_number)
        if key in batch_class_slot_winner:
            existing_slot = batch_class_slot_winner[key]
            if existing_slot.teacher_name != slot.teacher_name:
                msg = (
                    f"Conflict (within import): class_id={slot.class_id} "
                    f"DO={slot.day_order} P={slot.period_number} — "
                    f"'{existing_slot.teacher_name}' vs '{slot.teacher_name}'"
                )
                conflicts.append(msg)
                logger.warning(msg)
            # Subsequent conflicting slots are discarded from insertion
        else:
            batch_class_slot_winner[key] = slot
            non_conflicting_batch.append(slot)

    # ── Conflicts with existing DB slots ─────────────────────────────────────
    final_non_conflicting: list[ResolvedSlot] = []

    if batch_class_slot_winner:
        class_ids = {k[0] for k in batch_class_slot_winner}
        existing_class_slots = (
            db.query(
                TimetableSlot.class_id,
                TimetableSlot.day_order,
                TimetableSlot.period_number,
                TimetableSlot.teacher_id,
            )
            .filter(TimetableSlot.class_id.in_(class_ids))
            .all()
        )
        # Build id→name map for existing teachers
        existing_teacher_ids = {r.teacher_id for r in existing_class_slots}
        teacher_name_map: dict[int, str] = {}
        if existing_teacher_ids:
            rows = db.query(User.id, User.name).filter(User.id.in_(existing_teacher_ids)).all()
            teacher_name_map = {r.id: r.name for r in rows}

        db_class_slots: dict[tuple[int, int, int], str] = {}
        for row in existing_class_slots:
            tname = teacher_name_map.get(row.teacher_id, f"id={row.teacher_id}")
            db_class_slots[(row.class_id, row.day_order, row.period_number)] = tname

        for slot in non_conflicting_batch:
            key = (slot.class_id, slot.day_order, slot.period_number)
            if key in db_class_slots:
                existing_tname = db_class_slots[key]
                if existing_tname.lower() != slot.teacher_name.lower():
                    msg = (
                        f"Conflict (vs DB): class_id={slot.class_id} "
                        f"DO={slot.day_order} P={slot.period_number} — "
                        f"DB has '{existing_tname}', import has '{slot.teacher_name}'"
                    )
                    conflicts.append(msg)
                    logger.warning(msg)
                    # Discard this slot because it conflicts with the database
                    continue
            final_non_conflicting.append(slot)
    else:
        final_non_conflicting = non_conflicting_batch

    return final_non_conflicting, conflicts


# ── Bulk insert ────────────────────────────────────────────────────────────────

def _bulk_insert(slots: list[ResolvedSlot], db: Session) -> int:
    """
    Insert all resolved slots inside the current transaction.

    Uses bulk_save_objects for efficiency. The caller is responsible for
    committing or rolling back the transaction.

    Returns the number of rows inserted.
    """
    if not slots:
        return 0

    # Fallback/Failsafe assertion: filter out any slots where class_id is None
    valid_slots = []
    for s in slots:
        if s.class_id is None:
            logger.error(
                "Failsafe: slot with class_id=None reached bulk insert! "
                "Teacher: %s, Day: %d, Period: %d. Skipping.",
                s.teacher_name, s.day_order, s.period_number
            )
            continue
        valid_slots.append(s)

    if not valid_slots:
        logger.warning("No valid slots to insert after filtering out unresolved class IDs.")
        return 0

    db_objects = [
        TimetableSlot(
            teacher_id=s.teacher_id,
            subject_id=s.subject_id,
            class_id=s.class_id,  # type: ignore[arg-type]
            room_id=None,          # Excel does not contain room info
            day_order=s.day_order,
            period_number=s.period_number,
        )
        for s in valid_slots
    ]
    db.bulk_save_objects(db_objects)
    logger.info("Bulk-inserted %d timetable slot(s).", len(db_objects))
    return len(db_objects)


# ── Public API ─────────────────────────────────────────────────────────────────

def import_timetable(
    file_bytes: bytes,
    db: Session,
    sheet_name: str = "CS-STAFF",
    tenant_department_id: int | None = None,
) -> TimetableImportResult:
    """
    Full timetable import pipeline.

    Parameters
    ----------
    file_bytes : raw bytes of the uploaded .xlsx file
    db         : SQLAlchemy session (caller manages commit/rollback)
    sheet_name : name of the Excel sheet to parse (default "CS-STAFF")
    tenant_department_id : optional department ID filter for isolation

    Returns
    -------
    TimetableImportResult  with counts and error/conflict lists

    Transaction semantics
    ─────────────────────
    - Validation errors (unknown names) do NOT cause a rollback. Import continues.
    - A DB-level exception (IntegrityError etc.) triggers a rollback of the
      entire batch and re-raises so the route layer can return HTTP 500.
    """
    validation_errors: list[str] = []

    # ── Step 1: Parse Excel ───────────────────────────────────────────────────
    logger.info("Starting timetable import from sheet '%s'.", sheet_name)
    try:
        raw_slots = parse_staff_sheet(file_bytes, sheet_name=sheet_name)
    except ValueError as exc:
        # Propagate parse errors as validation errors, return empty result
        return TimetableImportResult(
            teachers_processed=0,
            slots_inserted=0,
            duplicates_skipped=0,
            validation_errors=[str(exc)],
            conflicts=[],
        )

    logger.info("Parsed %d raw slot records from Excel.", len(raw_slots))

    # ── Step 2: Build DB lookup maps ─────────────────────────────────────────
    teacher_map = _build_teacher_map(db, tenant_department_id)
    subject_map = _build_subject_map(db, tenant_department_id)
    class_full_map, class_name_map = _build_class_map(db, tenant_department_id)


    # ── Step 3: Resolve IDs ───────────────────────────────────────────────────
    resolved, teachers_seen = _resolve_slots(
        raw_slots, teacher_map, subject_map,
        class_full_map, class_name_map,
        validation_errors,
    )
    logger.info(
        "Resolved %d slots from %d unique teachers.",
        len(resolved), len(teachers_seen),
    )

    # ── Step 4: Filter duplicates ─────────────────────────────────────────────
    unique_slots, duplicates_skipped = _filter_duplicates(resolved, db)
    logger.info(
        "%d unique new slots to insert, %d duplicates skipped.",
        len(unique_slots), duplicates_skipped,
    )

    # ── Step 5: Detect conflicts ──────────────────────────────────────────────
    unique_slots, conflicts = _detect_conflicts(unique_slots, db)

    # ── Step 6: Bulk insert ───────────────────────────────────────────────────
    slots_inserted = 0
    if unique_slots:
        try:
            slots_inserted = _bulk_insert(unique_slots, db)
            db.commit()
            logger.info("Transaction committed: %d slots inserted.", slots_inserted)
        except Exception as exc:
            db.rollback()
            logger.error("DB error during timetable import — rolled back. Error: %s", exc)
            raise  # re-raise for the route layer to return HTTP 500

    # ── Count teacher blocks parsed from Excel ────────────────────────────────
    # Count unique teacher names seen in raw Excel (not just those in DB)
    # Count unique non-placeholder teacher names seen in Excel
    all_excel_teachers = {
        normalize_teacher_name(s.teacher_name)
        for s in raw_slots
        if not is_placeholder_teacher(s.teacher_name)
    }
    teachers_processed = len(all_excel_teachers)

    logger.info(
        "Import complete: %d teachers processed, %d slots inserted, "
        "%d duplicates skipped, %d validation errors, %d conflicts.",
        teachers_processed, slots_inserted, duplicates_skipped,
        len(validation_errors), len(conflicts),
    )

    return TimetableImportResult(
        teachers_processed=teachers_processed,
        slots_inserted=slots_inserted,
        duplicates_skipped=duplicates_skipped,
        validation_errors=validation_errors,
        conflicts=conflicts,
    )


# ── Constants for Fuzzy Matching ──────────────────────────────────────────────
CLASS_MATCH_THRESHOLD = 0.80
SUBJECT_MATCH_THRESHOLD = 0.80
TEACHER_MATCH_THRESHOLD = 0.85


def _build_teacher_obj_map(db: Session, tenant_department_id: int | None = None) -> dict[str, User]:
    """Return { normalize_teacher_name(user.name): user } for all active teachers."""
    query = db.query(User).filter(User.role == Role.teacher, User.is_active == True)  # noqa: E712
    if tenant_department_id is not None:
        query = query.filter(User.department_id == tenant_department_id)
    teacher_rows = query.all()

    teacher_map = {}
    for user in teacher_rows:
        key = normalize_teacher_name(user.name)
        if key and key not in teacher_map:
            teacher_map[key] = user
    return teacher_map


def _find_teacher_fuzzy(
    normalized_name: str,
    teacher_map: dict[str, User],
) -> tuple[User | None, float]:
    """Fuzzy-match normalized_name against teacher_map keys."""
    best_teacher = None
    best_score = 0.0
    for key, teacher in teacher_map.items():
        score = SequenceMatcher(None, normalized_name, key).ratio()
        if score > best_score:
            best_score = score
            best_teacher = teacher
    return best_teacher, best_score


def _find_department_from_class_text(class_text: str, departments: list[Department]) -> Department | None:
    tokens = [t.strip() for t in re.split(r'[-—\s]+', class_text) if t.strip()]
    roman_years = {"I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"}
    for t in tokens:
        ut = t.upper()
        if ut in roman_years:
            continue
        if len(ut) == 1 and ut.isalpha():
            continue
        dept = _find_matching_department(t, departments)
        if dept:
            return dept
    return None


def _has_unrecognized_department(class_text: str, departments: list[Department]) -> bool:
    tokens = [t.strip() for t in re.split(r'[-—\s]+', class_text) if t.strip()]
    roman_years = {"I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"}
    ignore_words = {"B.SC", "B.SC.", "M.SC", "M.SC.", "BSC", "MSC", "DEGREE"}
    
    has_candidate = False
    for t in tokens:
        ut = t.upper()
        if ut in roman_years:
            continue
        if len(ut) == 1 and ut.isalpha():
            continue
        if ut in ignore_words:
            continue
        if not re.search(r'[A-Za-z0-9]', ut):
            continue
            
        has_candidate = True
        dept = _find_matching_department(t, departments)
        if dept:
            return False
            
    return has_candidate


def _resolve_class_from_text(
    text: str,
    scoped_classes: list[Class],
    classes: list[Class],
    class_full_map: dict[str, int],
    class_name_map: dict[str, int],
    teacher_dept_obj: Department | None,
    departments: list[Department],
    is_class_only: bool = False,
) -> tuple[int | None, str | None, str | None, str]:
    text_clean = text.strip()
    
    def get_class_year(class_name: str) -> str:
        toks = class_name.strip().split()
        return toks[0].upper() if toks else ""
        
    def is_pg_class(class_name: str) -> bool:
        name_upper = class_name.upper()
        return "M.SC" in name_upper or "M.COM" in name_upper or "MCA" in name_upper or "MBA" in name_upper

    def clean_results(c_raw: str | None, s_raw: str | None) -> tuple[str | None, str | None]:
        if c_raw:
            c_raw = re.sub(r'\s*[-—]\s*$', '', c_raw).strip()
        if s_raw:
            s_raw = re.sub(r'^\s*[-—]\s*', '', s_raw).strip()
        return c_raw, s_raw

    # Helper for department compatibility
    def is_compatible(prefix: str, c: Class) -> bool:
        if _has_unrecognized_department(prefix, departments):
            return False
        dept = _find_department_from_class_text(prefix, departments)
        if dept and c.department_id != dept.id:
            return False
        return True

    # Check course-type-code + roman numeral pattern (e.g. "SEC-III")
    # shape: short 2-4 letter prefix + roman numeral, excluding department codes
    match_course = re.match(r'^([a-zA-Z]{2,4})\s*[- ]?\s*(?:I|II|III|IV|V|VI|VII|VIII|IX|X)$', text_clean, re.IGNORECASE)
    if match_course:
        prefix = match_course.group(1).upper()
        exclude_prefixes = {"CS", "IT", "CD", "CT", "D", "MSC", "MCOM", "MCA", "MBA", "BSC", "BCOM"}
        if prefix not in exclude_prefixes:
            return None, None, text_clean, "skipped_no_class"

    # 1. Check explicit roman-dash-section pattern (Bug 2 Part 2)
    match = re.match(r'^(I{1,3})\s*-\s*([A-Z])\s+(.+)$', text_clean, re.IGNORECASE)
    if match:
        year_roman = match.group(1).upper()
        section_letter = match.group(2).upper()
        subject_text = match.group(3).strip()
        
        # A. Filter within teacher's department first
        candidates = []
        for c in scoped_classes:
            c_year = get_class_year(c.name)
            if c_year == year_roman and c.section.upper() == section_letter:
                if year_roman == "III" and is_pg_class(c.name):
                    continue
                candidates.append(c)
                
        if len(candidates) == 1:
            return candidates[0].id, f"{year_roman} - {section_letter}", subject_text, "exact"
            
        # B. Cross-department fallback for explicit pattern
        if not candidates:
            cross_candidates = []
            for c in classes:
                c_year = get_class_year(c.name)
                if c_year == year_roman and c.section.upper() == section_letter:
                    if year_roman == "III" and is_pg_class(c.name):
                        continue
                    cross_candidates.append(c)
            if len(cross_candidates) == 1:
                return cross_candidates[0].id, f"{year_roman} - {section_letter}", subject_text, "exact"

    # 2. General parsing: Hyphen normalization (Bug 2 Part 1)
    normalized_text = re.sub(r'([A-Za-z0-9])\-([A-Za-z0-9])', r'\1 \2', text_clean)
    
    tokens = normalized_text.split()
    if not tokens:
        return None, None, text_clean, "unresolved"
        
    def extract_year_section(toks: list[str]) -> tuple[str | None, str | None]:
        roman_years = {"I", "II", "III", "IV", "V"}
        year = None
        section = None
        for t in toks:
            ut = t.upper()
            if ut in roman_years:
                year = ut
                break
        for t in toks:
            ut = t.upper()
            if len(ut) == 1 and ut.isalpha():
                if ut != year:
                    section = ut
                    break
        return year, section

    # Step 1: Exact match within teacher's own department (scoped_classes)
    start_i = len(tokens)
    end_i = len(tokens) - 1 if is_class_only else 0
    for i in range(start_i, end_i, -1):
        prefix = " ".join(tokens[:i])
        c_key = _normalize(prefix)
        c_id = _resolve_class_id(c_key, class_full_map, class_name_map)
        if c_id:
            matched_c = next((c for c in scoped_classes if c.id == c_id), None)
            if matched_c and is_compatible(prefix, matched_c):
                c_raw, s_raw = clean_results(prefix, " ".join(tokens[i:]))
                return c_id, c_raw, s_raw, "exact"

    # Step 2: Exact match across ALL classes (any department)
    for i in range(start_i, end_i, -1):
        prefix = " ".join(tokens[:i])
        c_key = _normalize(prefix)
        c_id = _resolve_class_id(c_key, class_full_map, class_name_map)
        if c_id:
            matched_c = next((c for c in classes if c.id == c_id), None)
            if matched_c and is_compatible(prefix, matched_c):
                c_raw, s_raw = clean_results(prefix, " ".join(tokens[i:]))
                return c_id, c_raw, s_raw, "exact"

    # Helper for fuzzy matching
    def find_best_fuzzy(class_list: list[Class]) -> tuple[Class | None, float, int]:
        best_cls = None
        best_score = 0.0
        best_prefix_len = 0
        for c in class_list:
            c_ident = _normalize(f"{c.name} {c.section}" if c.section else c.name)
            start_prefix = len(tokens)
            end_prefix = len(tokens) - 1 if is_class_only else 0
            for i in range(start_prefix, end_prefix, -1):
                prefix = " ".join(tokens[:i])
                if not is_compatible(prefix, c):
                    continue
                score = SequenceMatcher(None, c_ident, _normalize(prefix)).ratio()
                if score > best_score:
                    best_score = score
                    best_cls = c
                    best_prefix_len = i
        return best_cls, best_score, best_prefix_len

    # Step 3: Fuzzy match (scoped vs global comparison)
    scoped_cls, scoped_score, scoped_len = find_best_fuzzy(scoped_classes)
    global_cls, global_score, global_len = find_best_fuzzy(classes)
    
    if global_score >= CLASS_MATCH_THRESHOLD:
        if scoped_cls and global_cls.id == scoped_cls.id:
            # Best match is in teacher's own department
            c_raw, s_raw = clean_results(" ".join(tokens[:scoped_len]), " ".join(tokens[scoped_len:]))
            return scoped_cls.id, c_raw, s_raw, "fuzzy"
            
        if scoped_cls and (global_score - scoped_score < 0.05):
            # Close/ambiguous! Show both candidates
            scoped_name = f"{scoped_cls.name} {scoped_cls.section}".strip()
            global_name = f"{global_cls.name} {global_cls.section}".strip()
            global_dept = global_cls.department.name if (global_cls.department and global_cls.department.name) else (global_cls.department.code if global_cls.department else "Other")
            msg = f"Could be '{scoped_name}' (your department) or '{global_name}' ({global_dept}) — please confirm."
            prefix_len = global_len
            c_raw, s_raw = clean_results(" ".join(tokens[:prefix_len]), " ".join(tokens[prefix_len:]))
            return None, c_raw, s_raw, f"ambiguous: {msg}"
        else:
            # Global is meaningfully higher, or no scoped match exists
            c_raw, s_raw = clean_results(" ".join(tokens[:global_len]), " ".join(tokens[global_len:]))
            return global_cls.id, c_raw, s_raw, "fuzzy"

    # Step 4: Fallback Year + Section matching
    year, section = extract_year_section(tokens)
    if year and section:
        # A. Try within scoped_classes
        matched_scoped = []
        for c in scoped_classes:
            c_year = get_class_year(c.name)
            if c_year == year and c.section.upper() == section:
                if year == "III" and is_pg_class(c.name):
                    continue
                if not is_compatible(text_clean, c):
                    continue
                matched_scoped.append(c)
        if len(matched_scoped) == 1:
            clean_toks = [t for t in tokens if t.upper() != year and t.upper() != section and t != "-"]
            c_raw, s_raw = clean_results(f"{year} {section}", " ".join(clean_toks))
            return matched_scoped[0].id, c_raw, s_raw, "fuzzy"
            
        # B. Try across all classes
        matched_global = []
        for c in classes:
            c_year = get_class_year(c.name)
            if c_year == year and c.section.upper() == section:
                if year == "III" and is_pg_class(c.name):
                    continue
                if not is_compatible(text_clean, c):
                    continue
                matched_global.append(c)
        if len(matched_global) == 1:
            clean_toks = [t for t in tokens if t.upper() != year and t.upper() != section and t != "-"]
            c_raw, s_raw = clean_results(f"{year} {section}", " ".join(clean_toks))
            return matched_global[0].id, c_raw, s_raw, "fuzzy"

    if is_class_only:
        return None, text_clean, None, "unresolved"

    # Split fallback if the prefix belongs to a known or unrecognized department
    for i in range(len(tokens) - 1, 0, -1):
        prefix = " ".join(tokens[:i])
        if _find_department_from_class_text(prefix, departments) or _has_unrecognized_department(prefix, departments):
            c_raw, s_raw = clean_results(prefix, " ".join(tokens[i:]))
            return None, c_raw, s_raw, "unresolved"

    # Final fallback: structural split at " - " if class cannot resolve
    if " - " in text_clean:
        parts = text_clean.split(" - ", 1)
        c_raw, s_raw = clean_results(parts[0], parts[1])
        return None, c_raw, s_raw, "unresolved"
    return None, None, text_clean, "unresolved"


def preview_timetable_import(
    file_bytes: bytes,
    db: Session,
    sheet_name: str = "CS-STAFF",
    tenant_department_id: int | None = None,
) -> TimetableImportPreviewResponse:
    """
    Parse the CS-STAFF sheet and return a staging/preview list of slots with resolved IDs.
    No changes are written to the database.
    """
    try:
        raw_slots = parse_staff_sheet(file_bytes, sheet_name=sheet_name)
    except ValueError as exc:
        raise ValueError(str(exc))

    return _build_preview_response(raw_slots=raw_slots, db=db, sheet_name=sheet_name, tenant_department_id=tenant_department_id)



def preview_timetable_import_from_json(
    payload: dict,
    db: Session,
    tenant_department_id: int | None = None,
) -> TimetableImportPreviewResponse:
    """
    Parse a JSON payload and return a staging/preview list of slots with resolved IDs.
    No changes are written to the database.
    """
    # 1. Structural validation
    if not isinstance(payload, dict) or "slots" not in payload:
        raise ValueError("Invalid payload: must be a dictionary containing a 'slots' list.")
    
    slots_list = payload["slots"]
    if not isinstance(slots_list, list):
        raise ValueError("Invalid payload: 'slots' must be a list.")
        
    raw_slots = []
    for idx, s in enumerate(slots_list):
        if not isinstance(s, dict):
            raise ValueError(f"Slot at index {idx} must be a dictionary.")
            
        required_keys = {"teacher_name", "day_order", "period_number", "subject_raw"}
        missing_keys = required_keys - s.keys()
        if missing_keys:
            raise ValueError(f"Slot at index {idx} is missing required keys: {', '.join(missing_keys)}.")
            
        # Type & Value checks
        teacher_name = s["teacher_name"]
        if not isinstance(teacher_name, str) or not teacher_name.strip():
            raise ValueError(f"Slot at index {idx}: 'teacher_name' must be a non-empty string.")
            
        subject_raw = s["subject_raw"]
        if not isinstance(subject_raw, str) or not subject_raw.strip():
            raise ValueError(f"Slot at index {idx}: 'subject_raw' must be a non-empty string.")
            
        day_order = s["day_order"]
        try:
            day_order = int(day_order)
        except (ValueError, TypeError):
            raise ValueError(f"Slot at index {idx}: 'day_order' must be an integer.")
            
        if day_order < 1 or day_order > 6:
            raise ValueError(f"Slot at index {idx}: 'day_order' must be between 1 and 6.")
            
        period_number = s["period_number"]
        try:
            period_number = int(period_number)
        except (ValueError, TypeError):
            raise ValueError(f"Slot at index {idx}: 'period_number' must be an integer.")
            
        if period_number < 1 or period_number > 5:
            raise ValueError(f"Slot at index {idx}: 'period_number' must be between 1 and 5.")
            
        class_raw = s.get("class_raw")
        if class_raw is not None and not isinstance(class_raw, str):
            raise ValueError(f"Slot at index {idx}: 'class_raw' must be a string or null.")
            
        room_raw = s.get("room_raw")
        if room_raw is not None and not isinstance(room_raw, str):
            raise ValueError(f"Slot at index {idx}: 'room_raw' must be a string or null.")
            
        # Reconstruct cell raw text: "subject_raw\nclass_raw" if class_raw else subject_raw
        cell_raw = f"{subject_raw}\n{class_raw}" if class_raw else subject_raw
        if room_raw:
            cell_raw += f" LAB - {room_raw}"
            
        # Create ParsedSlot
        parsed = ParsedSlot(
            teacher_name=teacher_name,
            day_order=day_order,
            period_number=period_number,
            subject_raw=subject_raw,
            class_raw=class_raw,
            source_cell=f"row_{idx}",
            cell_raw=cell_raw
        )
        raw_slots.append(parsed)
        
    return _build_preview_response(raw_slots=raw_slots, db=db, sheet_name="JSON", tenant_department_id=tenant_department_id)


def _extract_department_token_from_class_text(class_text: str) -> str:
    tokens = [t.strip() for t in re.split(r'[-—\s]+', class_text) if t.strip()]
    roman_years = {"I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"}
    dept_parts = []
    for t in tokens:
        ut = t.upper()
        if ut in roman_years:
            continue
        if len(ut) == 1 and ut.isalpha():
            continue
        if not re.search(r'[A-Za-z0-9]', ut):
            continue
        dept_parts.append(t)
    return " ".join(dept_parts)


def _clean_for_dept_matching(s: str) -> str:
    if not s:
        return ""
    return re.sub(r'[^a-zA-Z0-9]', '', s).lower()


def _find_matching_department(dept_token: str, departments: list[Department]) -> Department | None:
    token_cleaned = _clean_for_dept_matching(dept_token)
    if not token_cleaned:
        return None
    for d in departments:
        if d.code and _clean_for_dept_matching(d.code) == token_cleaned:
            return d
        if d.name and _clean_for_dept_matching(d.name) == token_cleaned:
            return d
    return None


def _build_preview_response(
    raw_slots: list[ParsedSlot],
    db: Session,
    sheet_name: str = "CS-STAFF",
    tenant_department_id: int | None = None,
) -> TimetableImportPreviewResponse:
    teacher_obj_map = _build_teacher_obj_map(db, tenant_department_id)
    
    departments = db.query(Department).all()
    dept_by_code_or_name = {}
    for d in departments:
        if d.code:
            dept_by_code_or_name[d.code.strip().lower()] = d
        dept_by_code_or_name[d.name.strip().lower()] = d

    classes_query = db.query(Class)
    if tenant_department_id is not None:
        classes_query = classes_query.filter(Class.department_id == tenant_department_id)
    classes = classes_query.all()

    subjects_query = db.query(Subject).filter(Subject.is_archived == False)  # noqa: E712
    if tenant_department_id is not None:
        subjects_query = subjects_query.filter(Subject.department_id == tenant_department_id)
    subjects = subjects_query.all()
    
    rooms = db.query(Room).all()

    class_full_map, class_name_map = _build_class_map(db, tenant_department_id)
    subject_map = _build_subject_map(db, tenant_department_id)
    room_number_map = { _normalize(r.room_number): r for r in rooms }


    preview_rows: list[TimetableImportPreviewRow] = []
    total_slots = 0
    resolved_slots_count = 0
    needs_review_slots_count = 0
    skipped_no_class_count = 0

    for idx, slot in enumerate(raw_slots):
        total_slots += 1
        row_id = f"row_{idx}"
        
        source_cell = f"{sheet_name}!{slot.source_cell}"
        raw_text = slot.cell_raw or f"{slot.subject_raw}\n{slot.class_raw}"
        
        # 1. Resolve Teacher
        teacher_id = None
        teacher_name = None
        teacher_raw = slot.teacher_name
        teacher_match_confidence = "exact"
        
        t_key = normalize_teacher_name(teacher_raw)
        matched_teacher = teacher_obj_map.get(t_key)
        if matched_teacher:
            teacher_id = matched_teacher.id
            teacher_name = matched_teacher.name
        else:
            best_t, score = _find_teacher_fuzzy(t_key, teacher_obj_map)
            if best_t and score >= TEACHER_MATCH_THRESHOLD:
                teacher_id = best_t.id
                teacher_name = best_t.name
                teacher_match_confidence = "fuzzy"
            else:
                teacher_match_confidence = "unresolved"

        # Find teacher's department
        teacher_dept_obj = None
        if teacher_name and matched_teacher:
            dept_str = matched_teacher.department
            if dept_str:
                teacher_dept_obj = dept_by_code_or_name.get(dept_str.strip().lower())
        
        if teacher_dept_obj:
            scoped_classes = [c for c in classes if c.department_id == teacher_dept_obj.id]
        else:
            scoped_classes = classes

        # 2. Parse Cell Text
        room_raw = None
        room_id = None
        room_number = None
        
        cell_text = raw_text.strip()
        room_match = re.search(r'\s*-?\s*LAB\s*-\s*(\S+)\s*$', cell_text, re.IGNORECASE)
        if room_match:
            room_raw = room_match.group(1)
            cell_text_without_room = cell_text[:room_match.start()].strip()
            matched_room = room_number_map.get(_normalize(room_raw))
            if matched_room:
                room_id = matched_room.id
                room_number = matched_room.room_number
        else:
            cell_text_without_room = cell_text

        orig_cell_text_without_room = cell_text_without_room

        # Bug 2 Part 1: Normalize hyphen sitting between letter/digit and letter/digit
        cell_text_without_room = re.sub(r'([A-Za-z0-9])\-([A-Za-z0-9])', r'\1 \2', cell_text_without_room)

        lines = [ln.strip() for ln in re.split(r"[\n\r]+", cell_text_without_room) if ln.strip()]
        
        class_raw = None
        class_id = None
        class_name = None
        class_match_confidence = "unresolved"
        
        subject_raw = None
        subject_id = None
        subject_name = None
        subject_code = None
        subject_match_confidence = "unresolved"

        if len(lines) >= 2:
            c_id, c_raw, _, c_conf = _resolve_class_from_text(
                lines[1], scoped_classes, classes, class_full_map, class_name_map, teacher_dept_obj, departments, is_class_only=True
            )
            class_id = c_id
            class_raw = c_raw or lines[1]
            class_match_confidence = c_conf
            subject_raw = lines[0]
        else:
            cell_line = lines[0] if lines else ""
            c_id, c_raw, s_raw, c_conf = _resolve_class_from_text(
                cell_line, scoped_classes, classes, class_full_map, class_name_map, teacher_dept_obj, departments, is_class_only=False
            )
            class_id = c_id
            class_raw = c_raw
            subject_raw = s_raw
            class_match_confidence = c_conf

        if class_match_confidence == "skipped_no_class":
            subject_raw = orig_cell_text_without_room

        create_new_class = False
        class_year = None
        class_section = None
        class_department_id = None
        class_department_name = None
        class_dept_error_msg = None

        if class_id:
            cls_obj = next((c for c in classes if c.id == class_id), None)
            if cls_obj:
                is_cross_dept = teacher_dept_obj and cls_obj.department_id != teacher_dept_obj.id
                dept_code = cls_obj.department.code if cls_obj.department else ""
                if is_cross_dept and dept_code:
                    class_name = f"{cls_obj.name} {cls_obj.section} ({dept_code})".strip()
                else:
                    class_name = f"{cls_obj.name} {cls_obj.section}".strip()
        else:
            if class_raw:
                class_year, class_section = _extract_year_section_from_raw(class_raw)
                dept_token = _extract_department_token_from_class_text(class_raw)
                matched_dept = _find_matching_department(dept_token, departments)
                if matched_dept:
                    create_new_class = True
                    class_department_id = matched_dept.id
                    class_department_name = matched_dept.name
                    class_name = f"{class_year or ''} {class_section or ''} ({matched_dept.code or matched_dept.name})".strip()
                else:
                    create_new_class = False
                    class_dept_error_msg = f"Class '{class_raw}' appears to belong to a department not yet set up in FACREDIT — create the department first, then re-import this row."

        # Resolve subject
        create_new_subject = False
        sub_type = "theory"
        if room_match:
            sub_type = "lab"

        if subject_raw:
            s_key = _normalize(subject_raw)
            cls_obj = next((c for c in classes if c.id == class_id), None) if class_id else None
            if cls_obj:
                scoped_subjects = [s for s in subjects if s.department_id == cls_obj.department_id and s.semester == cls_obj.semester]
            else:
                scoped_subjects = subjects

            s_id = _resolve_subject_id(s_key, subject_map)
            if s_id:
                subject_id = s_id
                subject_match_confidence = "exact"
            else:
                best_sub = None
                best_score = 0.0
                for s in scoped_subjects:
                    name_score = SequenceMatcher(None, s_key, _normalize(s.name)).ratio()
                    code_score = SequenceMatcher(None, s_key, _normalize(s.code)).ratio() if s.code else 0.0
                    score = max(name_score, code_score)
                    if score > best_score:
                        best_score = score
                        best_sub = s
                
                if best_sub and best_score >= SUBJECT_MATCH_THRESHOLD:
                    subject_id = best_sub.id
                    subject_match_confidence = "fuzzy"

            if subject_id:
                sub_obj = next((s for s in subjects if s.id == subject_id), None)
                if sub_obj:
                    subject_name = sub_obj.name
                    subject_code = sub_obj.code
            else:
                # Subject was not matched but text exists -> auto-create
                create_new_subject = True
                subject_name = subject_raw
                subject_code = subject_raw.upper().strip()

        # Determine Row Resolution Status
        missing = []
        fuzzy_matched = []
        
        if teacher_match_confidence == "unresolved":
            missing.append("teacher")
        elif teacher_match_confidence == "fuzzy":
            fuzzy_matched.append("teacher")
            
        if class_match_confidence == "unresolved":
            if not create_new_class:
                missing.append("class")
        elif class_match_confidence == "fuzzy":
            fuzzy_matched.append("class")

        if class_match_confidence == "skipped_no_class":
            status = "skipped_no_class"
            message = "No class specified in the source data for this period — add manually later."
        elif class_match_confidence.startswith("ambiguous:"):
            status = "needs_review"
            message = class_match_confidence.split(":", 1)[1]
        elif class_dept_error_msg:
            status = "needs_review"
            message = class_dept_error_msg
            if teacher_match_confidence == "unresolved":
                message = f"Needs review: missing teacher. Also, {class_dept_error_msg}"
        elif missing:
            status = "needs_review"
            message = f"Needs review: missing {', '.join(missing)}."
            if fuzzy_matched:
                message += f" (Fuzzy-matched {', '.join(fuzzy_matched)})"
        elif fuzzy_matched:
            status = "needs_review"
            message = f"Please confirm fuzzy-matched {', '.join(fuzzy_matched)}."
        else:
            status = "resolved"
            if create_new_class:
                if create_new_subject and subject_raw:
                    message = f"All matches confirmed exactly. (＋ will create class '{class_year} {class_section}', subject '{subject_raw}' — Credits set to 1 (placeholder) — update in Subjects admin page)"
                else:
                    message = f"All matches confirmed exactly. (＋ will create class '{class_year} {class_section}')"
            elif subject_match_confidence == "unresolved":
                if subject_raw:
                    message = f"All matches confirmed exactly. (＋ will create subject '{subject_raw}' — Credits set to 1 (placeholder) — update in Subjects admin page)"
                else:
                    message = "All matches confirmed exactly. (Subject optional)"
            elif subject_match_confidence == "fuzzy":
                message = "All matches confirmed exactly. (Subject fuzzy-matched)"
            else:
                message = "All matches confirmed exactly."

        if create_new_subject and not create_new_class and status != "resolved" and status != "skipped_no_class":
            message += f" (＋ will create subject '{subject_raw}' — Credits set to 1 (placeholder) — update in Subjects admin page)"

        if status == "resolved":
            resolved_slots_count += 1
        elif status == "skipped_no_class":
            skipped_no_class_count += 1
        else:
            needs_review_slots_count += 1

        preview_rows.append(
            TimetableImportPreviewRow(
                id=row_id,
                source_cell=source_cell,
                raw_text=raw_text,
                day_order=slot.day_order,
                period_number=slot.period_number,
                teacher_raw=teacher_raw,
                teacher_id=teacher_id,
                teacher_name=teacher_name,
                class_raw=class_raw,
                class_id=class_id,
                class_name=class_name,
                create_new_class=create_new_class,
                class_year=class_year,
                class_section=class_section,
                class_department_id=class_department_id,
                class_department_name=class_department_name,
                subject_raw=subject_raw,
                subject_id=subject_id,
                subject_name=subject_name,
                subject_code=subject_code,
                create_new_subject=create_new_subject,
                subject_type=sub_type,
                room_raw=room_raw,
                room_id=room_id,
                room_number=room_number,
                status=status,
                message=message,
            )
        )

    return TimetableImportPreviewResponse(
        rows=preview_rows,
        summary=TimetableImportPreviewSummary(
            total_slots=total_slots,
            resolved_slots=resolved_slots_count,
            needs_review_slots=needs_review_slots_count,
            skipped_no_class=skipped_no_class_count,
        ),
    )


def commit_timetable_import(
    slots_data: list[TimetableImportCommitRow],
    actor_id: int,
    db: Session,
    semester_for_new_classes: int | None = None,
    tenant_department_id: int | None = None,
) -> TimetableImportResult:
    """
    Validates conflicts and bulk-inserts/updates timetable slots from preview edit list.
    Supports upserts for existing slots for the same teacher/day/period.
    All slots are committed atomically in a single transaction.
    """
    from app.schemas.timetable import TimetableSlotCreate
    from app.models.timetable import TimetableSlot
    from app.models.user import User, Role
    from app.models.credit import TeacherCredit
    from app.core.security import hash_password
    from fastapi import HTTPException, status
    from sqlalchemy.exc import IntegrityError
    import re
    import uuid

    # Validate tenant isolation
    if tenant_department_id is not None:
        for idx, s in enumerate(slots_data):
            if s.class_id:
                cls = db.query(Class).filter(Class.id == s.class_id).first()
                if cls and cls.department_id != tenant_department_id:
                    raise HTTPException(status_code=403, detail=f"Access denied: class at slot {idx} belongs to another department")
            if s.class_department_id and s.class_department_id != tenant_department_id:
                raise HTTPException(status_code=403, detail=f"Access denied: class department at slot {idx} does not match tenant")
            if s.teacher_id:
                teacher = db.query(User).filter(User.id == s.teacher_id).first()
                if teacher and teacher.department_id != tenant_department_id:
                    raise HTTPException(status_code=403, detail=f"Access denied: teacher at slot {idx} belongs to another department")
            if s.subject_id:
                subj = db.query(Subject).filter(Subject.id == s.subject_id).first()
                if subj and subj.department_id != tenant_department_id:
                    raise HTTPException(status_code=403, detail=f"Access denied: subject at slot {idx} belongs to another department")


    # 0. Resolve and create new classes where needed
    created_classes_map = {}  # (class_name_upper, class_section_upper) -> class_id
    for idx, s in enumerate(slots_data):
        if not s.class_id and (s.create_new_class or s.class_name):
            class_section = s.class_section.strip().upper() if s.class_section else ""
            if s.create_new_class:
                if not s.class_year or not s.class_section or not s.class_department_id:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Slot at index {idx} is missing required fields for class auto-creation (year, section, or department)."
                    )
                dept = db.query(Department).filter(Department.id == s.class_department_id).first()
                if not dept:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Department ID {s.class_department_id} not found for class auto-creation at slot {idx}."
                    )
                dept_code = dept.code or dept.name
                class_name = f"{s.class_year} {dept_code}".strip()
            else:
                if not s.class_name or not s.class_department_id:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Slot at index {idx} is missing required fields for class auto-creation (class_name or department)."
                    )
                class_name = s.class_name.strip()
                
            key = (class_name.upper(), class_section.upper())
            if key in created_classes_map:
                s.class_id = created_classes_map[key]
            else:
                existing_class = db.query(Class).filter(
                    Class.name.ilike(class_name),
                    Class.section.ilike(class_section)
                ).first()
                if existing_class:
                    s.class_id = existing_class.id
                    created_classes_map[key] = existing_class.id
                else:
                    if semester_for_new_classes is None:
                        raise HTTPException(
                            status_code=400,
                            detail="semester_for_new_classes is required when creating a new class"
                        )
                    new_class = Class(
                        name=class_name,
                        section=class_section,
                        department_id=s.class_department_id,
                        semester=semester_for_new_classes,
                    )
                    db.add(new_class)
                    db.flush()
                    
                    log_audit_event(
                        db=db,
                        actor_user_id=actor_id,
                        action="classes.create",
                        target_type="class",
                        target_id=new_class.id,
                        details={"name": class_name, "section": class_section, "semester": semester_for_new_classes, "import": True},
                    )
                    
                    created_classes_map[key] = new_class.id
                    s.class_id = new_class.id

    # 1. Resolve and create new teachers where needed
    created_teachers_map = {}  # Normalized name -> user ID

    for idx, s in enumerate(slots_data):
        # If teacher_id is not provided but teacher_name is provided, we need to resolve/create this teacher
        if not s.teacher_id and s.teacher_name:
            t_name = s.teacher_name.strip()
            t_key = normalize_teacher_name(t_name)

            if t_key in created_teachers_map:
                s.teacher_id = created_teachers_map[t_key]
            else:
                # Double check if teacher exists in DB already (by exact or case-insensitive name)
                existing_teacher = db.query(User).filter(
                    User.role == Role.teacher,
                    User.name.ilike(t_name)
                ).first()
                if existing_teacher:
                    s.teacher_id = existing_teacher.id
                    created_teachers_map[t_key] = existing_teacher.id
                else:
                    # Create minimal teacher account
                    name_slug = re.sub(r'[^a-zA-Z0-9]', '', t_name.lower())
                    if not name_slug:
                        name_slug = "teacher"
                    unique_suffix = uuid.uuid4().hex[:6]
                    temp_email = f"{name_slug}_{unique_suffix}@temp.local"

                    # Resolve department_id from the subject or class of this timetable slot
                    dept_id = None
                    if s.subject_id:
                        subj = db.query(Subject).filter(Subject.id == s.subject_id).first()
                        if subj:
                            dept_id = subj.department_id
                    if not dept_id and s.class_id:
                        cls_obj = db.query(Class).filter(Class.id == s.class_id).first()
                        if cls_obj:
                            dept_id = cls_obj.department_id

                    new_teacher = User(
                        name=t_name,
                        email=temp_email,
                        password_hash=hash_password("changeme"),
                        role=Role.teacher,
                        department_id=dept_id,
                        must_change_credentials=True,
                        is_active=True,
                    )
                    db.add(new_teacher)
                    db.flush()  # to get new_teacher.id

                    # Initialise credit balance at 0
                    db.add(TeacherCredit(teacher_id=new_teacher.id, balance=0))
                    db.flush()

                    # Log audit event for teacher creation
                    log_audit_event(
                        db=db,
                        actor_user_id=actor_id,
                        action="teachers.create",
                        target_type="user",
                        target_id=new_teacher.id,
                        details={"name": t_name, "email": temp_email, "import": True},
                    )

                    created_teachers_map[t_key] = new_teacher.id
                    s.teacher_id = new_teacher.id

    # 1.5. Resolve and create new subjects where needed (Bug/Feature 4)
    created_subjects_map = {}  # (class_id, normalized_subject_name) -> subject_id
    for idx, s in enumerate(slots_data):
        if not s.subject_id and s.subject_name:
            sub_name = s.subject_name.strip()
            sub_key = (s.class_id, sub_name.upper())
            if sub_key in created_subjects_map:
                s.subject_id = created_subjects_map[sub_key]
            else:
                cls = db.query(Class).filter(Class.id == s.class_id).first()
                if cls:
                    # Check DB first for exact case-insensitive match on name or code
                    existing_sub = db.query(Subject).filter(
                        Subject.department_id == cls.department_id,
                        Subject.semester == cls.semester,
                        (Subject.name.ilike(sub_name) | Subject.code.ilike(sub_name.upper()))
                    ).first()
                    if existing_sub:
                        s.subject_id = existing_sub.id
                        created_subjects_map[sub_key] = existing_sub.id
                    else:
                        # Resolve unique code, uppercased and stripped of non-alphanumeric chars
                        base_code = re.sub(r'[^a-zA-Z0-9]', '', sub_name).upper().strip()
                        if not base_code:
                            base_code = "SUB"
                        base_code = base_code[:15]  # Limit length to prevent overflow in db
                        
                        candidate_code = base_code
                        suffix = 2
                        while db.query(Subject).filter(Subject.code == candidate_code).first():
                            candidate_code = f"{base_code}-{suffix}"
                            suffix += 1
                            
                        sub_type = s.subject_type or "theory"
                        if sub_type not in ("theory", "lab"):
                            sub_type = "theory"
                            
                        new_sub = Subject(
                            code=candidate_code,
                            name=sub_name,
                            subject_type=sub_type,
                            credits=1,  # Placeholder — DB requires credits > 0; admin should update the real value later.
                            department_id=cls.department_id,
                            semester=cls.semester,
                            is_archived=False,
                        )
                        db.add(new_sub)
                        db.flush()
                        
                        # Log audit event for subject creation
                        log_audit_event(
                            db=db,
                            actor_user_id=actor_id,
                            action="subjects.create",
                            target_type="subject",
                            target_id=new_sub.id,
                            details={"code": candidate_code, "name": sub_name, "import": True},
                        )
                        
                        created_subjects_map[sub_key] = new_sub.id
                        s.subject_id = new_sub.id

    # 2. Pre-lookup existing slots for the teachers in the batch
    teacher_ids = {s.teacher_id for s in slots_data if s.teacher_id}
    
    if teacher_ids:
        existing_slots = db.query(TimetableSlot).filter(
            TimetableSlot.teacher_id.in_(teacher_ids)
        ).all()
    else:
        existing_slots = []

    # Map (teacher_id, day_order, period_number) -> existing_slot object
    existing_map = {
        (s.teacher_id, s.day_order, s.period_number): s
        for s in existing_slots
    }

    # Tracking sets for intra-batch duplicate checks
    seen_teacher_keys = set()
    seen_class_keys = set()
    seen_room_keys = set()

    slots_to_insert = []
    slots_to_update = []

    for idx, s in enumerate(slots_data):
        if not s.teacher_id or not s.class_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Slot at index {idx} is missing required fields (teacher or class)."
            )

        t_key = (s.teacher_id, s.day_order, s.period_number)
        c_key = (s.class_id, s.day_order, s.period_number)
        r_key = (s.room_id, s.day_order, s.period_number) if s.room_id else None

        # Check intra-batch duplicates
        if t_key in seen_teacher_keys:
            raise HTTPException(
                status_code=409,
                detail=f"Duplicate teacher booking within this upload for Day Order {s.day_order}, Period {s.period_number}"
            )
        if c_key in seen_class_keys:
            raise HTTPException(
                status_code=409,
                detail=f"Duplicate class booking within this upload for Day Order {s.day_order}, Period {s.period_number}"
            )
        if r_key and r_key in seen_room_keys:
            raise HTTPException(
                status_code=409,
                detail=f"Duplicate room booking within this upload for Day Order {s.day_order}, Period {s.period_number}"
            )

        seen_teacher_keys.add(t_key)
        seen_class_keys.add(c_key)
        if r_key:
            seen_room_keys.add(r_key)

        # Check DB-level conflicts
        slot_create = TimetableSlotCreate(
            teacher_id=s.teacher_id,
            class_id=s.class_id,
            subject_id=s.subject_id,
            room_id=s.room_id,
            day_order=s.day_order,
            period_number=s.period_number,
        )

        existing = existing_map.get(t_key)
        if existing:
            # Check conflicts, excluding the existing slot
            from app.services.timetable_service import _check_conflicts
            _check_conflicts(db, slot_create, exclude_id=existing.id)
            slots_to_update.append((existing, s))
        else:
            # Check conflicts normally
            from app.services.timetable_service import _check_conflicts
            _check_conflicts(db, slot_create)
            slots_to_insert.append(s)

    # 3. Perform DB mutations inside transaction
    try:
        # Update existing
        for existing, s in slots_to_update:
            existing.class_id = s.class_id
            existing.subject_id = s.subject_id
            existing.room_id = s.room_id

        # Insert new
        new_slots = [
            TimetableSlot(
                teacher_id=s.teacher_id,
                class_id=s.class_id,
                subject_id=s.subject_id,
                room_id=s.room_id,
                day_order=s.day_order,
                period_number=s.period_number,
            )
            for s in slots_to_insert
        ]
        db.add_all(new_slots)
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        logger.error("DB IntegrityError during commit: %s", exc)
        raise HTTPException(
            status_code=409,
            detail="Conflicting timetable slot detected during save — no slots were saved"
        )
    except Exception as exc:
        db.rollback()
        logger.error("DB error during commit: %s", exc)
        raise

    # 4. Log audit event for timetable import
    slots_inserted_count = len(slots_to_insert) + len(slots_to_update)
    log_audit_event(
        db=db,
        actor_user_id=actor_id,
        action="timetable.import",
        target_type="timetable",
        target_id=None,
        details={"slots_count": slots_inserted_count},
    )
    db.commit()

    teachers_processed_count = len(teacher_ids)
    return TimetableImportResult(
        teachers_processed=teachers_processed_count,
        slots_inserted=slots_inserted_count,
        duplicates_skipped=0,
        validation_errors=[],
        conflicts=[],
    )
