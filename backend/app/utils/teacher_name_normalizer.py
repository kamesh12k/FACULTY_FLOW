"""
utils/teacher_name_normalizer.py
─────────────────────────────────
Standalone teacher-name normalization utility.

Purpose
───────
Excel timetable files and the PostgreSQL users table store teacher names in
incompatible formats:

  Excel   : Dr.V.VIJAYA DEEPA  /  S. MANOKARTHICK  /  R.P.SATHIYA PRIYA
  Database: VIJAYA DEEPA V     /  MANOKARTHICK S    /  SATHIYA PRIYA R P

This module produces a canonical, order-independent key for any name so that
matching is always performed on normalized tokens — never on raw strings.

Algorithm
─────────
  1.  Uppercase the entire string.
  2.  Replace ALL dots with spaces  →  "V.VIJAYA" becomes "V VIJAYA"
      (do this BEFORE title stripping so word boundaries are clean)
  3.  Remove title prefixes: DR, PROF, MR, MRS, MS, SRI, SMT
      (matched as whole words, after dots are gone)
  4.  Remove any remaining non-alphanumeric, non-space characters.
  5.  Collapse multiple spaces to one.
  6.  Split into tokens.
  7.  Sort tokens alphabetically  →  order-independent canonical key.
  8.  Join with a single space and lowercase the result.

Guarantees
──────────
  - "Dr.V.VIJAYA DEEPA"  →  "deepa v vijaya"
  - "VIJAYA DEEPA V"     →  "deepa v vijaya"   (match)
  - "R.P.SATHIYA PRIYA"  →  "p priya r sathiya"
  - "SATHIYA PRIYA R P"  →  "p priya r sathiya" (match)
  - "S. MANOKARTHICK"    →  "manokarthick s"
  - "MANOKARTHICK S"     →  "manokarthick s"    (match)
  - "R. MOHANRAJ"        →  "mohanraj r"
  - "MOHANRAJ R"         →  "mohanraj r"        (match)
"""

from __future__ import annotations

import logging
import re
from typing import Sequence

logger = logging.getLogger(__name__)

# ── Title words to strip (whole-word only) ─────────────────────────────────────
# Applied AFTER dots have already been converted to spaces, so we only need
# to match plain word tokens — no dot-variants needed here.
_TITLE_TOKENS: frozenset[str] = frozenset(
    {"DR", "PROF", "MR", "MRS", "MS", "SRI", "SMT"}
)

# Compiled pattern: whole-word match for any title token
_TITLE_PATTERN: re.Pattern[str] = re.compile(
    r"\b(" + "|".join(re.escape(t) for t in sorted(_TITLE_TOKENS)) + r")\b"
)

# ── Placeholder / skip patterns ────────────────────────────────────────────────
# These teacher entries appear in some Excel files to mark unfilled slots.
# They must be silently skipped — never reported as unknown-teacher errors.
_SKIP_PATTERN: re.Pattern[str] = re.compile(
    r"\b(NEW\s*STAFF|VACANT|TBA|TBD|TO\s*BE\s*ANNOUNCED)\b",
    re.IGNORECASE,
)


# ── Core normalizer ────────────────────────────────────────────────────────────

def normalize_teacher_name(name: str) -> str:
    """
    Return a canonical, order-independent key for a teacher name.

    The key is suitable for use as a dictionary key for O(1) lookup.
    Two names that refer to the same person will always produce the same key,
    regardless of:
      - title prefixes (DR, DR., PROF, PROF., etc.)
      - dot-separated vs space-separated initials
      - token order (initials before or after the surname)
      - case differences
      - extra or duplicate spaces
      - punctuation other than letters/digits

    Parameters
    ----------
    name : str
        Raw teacher name from Excel or the database.

    Returns
    -------
    str
        Lowercase, space-joined, alphabetically sorted token string.
        Returns "" for blank / whitespace-only input.

    Examples
    --------
    >>> normalize_teacher_name("Dr.V.VIJAYA DEEPA")
    'deepa v vijaya'
    >>> normalize_teacher_name("VIJAYA DEEPA V")
    'deepa v vijaya'
    >>> normalize_teacher_name("R.P.SATHIYA PRIYA")
    'p priya r sathiya'
    >>> normalize_teacher_name("SATHIYA PRIYA R P")
    'p priya r sathiya'
    >>> normalize_teacher_name("S. MANOKARTHICK")
    'manokarthick s'
    >>> normalize_teacher_name("MANOKARTHICK S")
    'manokarthick s'
    >>> normalize_teacher_name("R. MOHANRAJ")
    'mohanraj r'
    >>> normalize_teacher_name("MOHANRAJ R")
    'mohanraj r'
    """
    if not name or not name.strip():
        return ""

    # Step 1: uppercase — case-insensitive matching
    s = name.upper()

    # Step 2: replace ALL dots with spaces FIRST.
    # Critical ordering: do this BEFORE title stripping.
    # "DR.V.VIJAYA DEEPA" → "DR V VIJAYA DEEPA"
    # This ensures "DR" is a clean whole word so \b anchors in the title
    # pattern work correctly in all cases, including "DR.VIJAYA" where there
    # is no space between the title and the name.
    s = s.replace(".", " ")

    # Step 3: strip title prefixes as whole words.
    # After Step 2, all title dots are gone → "DR ", "PROF ", etc. are clean
    # word tokens that the \b boundary pattern can reliably match.
    s = _TITLE_PATTERN.sub(" ", s)

    # Step 4: remove any remaining non-alphanumeric, non-space characters.
    # Handles: hyphens, apostrophes, brackets, commas, slashes, etc.
    s = re.sub(r"[^A-Z0-9 ]", " ", s)

    # Step 5: collapse whitespace (multiple spaces, leading/trailing)
    s = re.sub(r"\s+", " ", s).strip()

    if not s:
        return ""

    # Step 6: tokenize
    tokens = s.split()

    # Step 7: sort alphabetically — key is identical regardless of token order
    tokens.sort()

    # Step 8: join and lowercase → final canonical key
    return " ".join(tokens).lower()


# ── Placeholder check ──────────────────────────────────────────────────────────

def is_placeholder_teacher(name: str) -> bool:
    """
    Return True if the name is a known placeholder that should be silently
    skipped during import (e.g. "NEW STAFF", "VACANT", "TBA").

    These entries are NOT reported as unknown-teacher errors.

    Parameters
    ----------
    name : str
        Raw teacher name from Excel.

    Returns
    -------
    bool

    Examples
    --------
    >>> is_placeholder_teacher("NEW STAFF")
    True
    >>> is_placeholder_teacher("new staff")
    True
    >>> is_placeholder_teacher("VACANT")
    True
    >>> is_placeholder_teacher("TBA")
    True
    >>> is_placeholder_teacher("TBD")
    True
    >>> is_placeholder_teacher("Dr.V.VIJAYA DEEPA")
    False
    """
    return bool(_SKIP_PATTERN.search(name.strip()))


# ── Lookup dictionary builder ──────────────────────────────────────────────────

def build_teacher_lookup(
    teacher_rows: Sequence[tuple[int, str]],
) -> dict[str, int]:
    """
    Build an O(1) teacher lookup dictionary from database rows.

    Normalizes every DB teacher name once at import time so that per-slot
    lookup during Excel parsing is a pure dictionary ``.get()``.

    Parameters
    ----------
    teacher_rows : sequence of (teacher_id, teacher_name) tuples
        Typically the result of querying the users table filtered to
        role='teacher' and is_active=True.

    Returns
    -------
    dict[str, int]
        Maps ``normalize_teacher_name(teacher_name)`` → ``teacher_id``.

    Notes
    -----
    - Teachers whose name normalizes to an empty string are skipped with a
      WARNING log message. This indicates degenerate data in the database.
    - If two distinct teacher records produce the same normalized key, the
      first occurrence wins and a WARNING is logged. This indicates duplicate
      or near-duplicate names in the database that require human review.
    """
    lookup: dict[str, int] = {}
    for tid, tname in teacher_rows:
        key = normalize_teacher_name(tname)
        if not key:
            logger.warning(
                "Teacher id=%d skipped — name %r normalized to empty string. "
                "Check for degenerate data in the users table.",
                tid,
                tname,
            )
            continue
        if key in lookup:
            logger.warning(
                "Duplicate normalized key %r: teacher id=%d shares the same "
                "token-set as an already-indexed teacher. "
                "First entry kept. Verify for duplicate names in the DB.",
                key,
                tid,
            )
        else:
            lookup[key] = tid
            logger.debug("Teacher indexed: %r  →  key=%r", tname, key)
    logger.info("Teacher lookup map built: %d entries.", len(lookup))
    return lookup
