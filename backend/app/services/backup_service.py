"""
backup_service.py — FAFLOW Backup & Restore Service

Creates, lists, validates, restores, and deletes JSON-format database backups.
Reuses and extends the proven snapshot approach from factory_reset_service.py.

Format:
  Each backup is a .json file containing a dict of table_name -> list[row_dict].
  A backup_index.json manifest tracks metadata for all backups.

RBAC:
  All public functions here are called only from backup routes which are
  guarded by require_system_admin — authorization is enforced at the route layer.
"""
from __future__ import annotations

import hashlib
import json
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.services.admin_service import log_audit_event

logger = logging.getLogger(__name__)

# ── Constants ──────────────────────────────────────────────────────────────────

# Resolve the configured backup directory relative to backend root.
_BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent
_INDEX_FILENAME = "backup_index.json"

# All application tables in the correct deletion/insertion order (children before
# parents for deletion, parents before children for insertion). Derived from the
# authoritative list in factory_reset_service.py and the model __init__.py.
BACKUP_TABLES = [
    "users",
    "departments",
    "academic_years",
    "semesters",
    "calendar_days",
    "subjects",
    "rooms",
    "classes",
    "timetable_slots",
    "timetable_submissions",
    "leave_requests",
    "alter_assignments",
    "substitution_preferences",
    "teacher_credits",
    "credit_transactions",
    "operational_staff",
    "notifications",
    "push_subscriptions",
    "audit_logs",
    "system_settings",
    "staff_leave_requests",
    "staff_credits",
    "staff_credit_transactions",
]

# Deletion order: children first to satisfy FK constraints.
_RESTORE_DELETE_ORDER = [
    "staff_credit_transactions",
    "staff_credits",
    "staff_leave_requests",
    "push_subscriptions",
    "notifications",
    "credit_transactions",
    "teacher_credits",
    "substitution_preferences",
    "alter_assignments",
    "leave_requests",
    "timetable_submissions",
    "timetable_slots",
    "calendar_days",
    "semesters",
    "academic_years",
    "operational_staff",
    "classes",
    "rooms",
    "subjects",
    "audit_logs",
    "system_settings",
    "users",
    "departments",
]

# ── Helpers ────────────────────────────────────────────────────────────────────


def _backup_dir() -> Path:
    """Resolve backup storage directory from settings. Created on demand."""
    raw = settings.BACKUP_STORAGE_PATH
    path = Path(raw)
    if not path.is_absolute():
        path = _BACKEND_ROOT / path
    path.mkdir(parents=True, exist_ok=True)
    return path


def _index_path() -> Path:
    return _backup_dir() / _INDEX_FILENAME


def _load_index() -> list[dict]:
    p = _index_path()
    if not p.exists():
        return []
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return []


def _save_index(index: list[dict]) -> None:
    _index_path().write_text(
        json.dumps(index, indent=2, default=str), encoding="utf-8"
    )


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _safe_filename(ts: str) -> str:
    """Generate a filesystem-safe backup filename."""
    return f"faflow_backup_{ts}.json"


def _meta_entry(
    backup_id: str,
    filename: str,
    created_at: str,
    created_by: str,
    file_size_bytes: int,
    checksum: str,
    backup_type: str = "full",
    status: str = "completed",
    validation_status: str = "not_validated",
    is_pre_restore: bool = False,
) -> dict:
    return {
        "backup_id": backup_id,
        "filename": filename,
        "created_at": created_at,
        "created_by": created_by,
        "file_size_bytes": file_size_bytes,
        "checksum_sha256": checksum,
        "backup_type": backup_type,
        "status": status,
        "validation_status": validation_status,
        "is_pre_restore": is_pre_restore,
        "last_validated_at": None,
        "restored_at": None,
        "table_count": len(BACKUP_TABLES),
    }


# ── Core public functions ──────────────────────────────────────────────────────


def import_backup(
    file_bytes: bytes,
    original_filename: str,
    actor_user_id: int | None,
    actor_name: str,
    db: Session,
) -> dict:
    """
    Import an uploaded FAFLOW backup JSON file from the client's local machine.

    Validates the file content, saves it to the backup directory under a
    server-generated safe filename, registers it in the index, and
    audit-logs the import.

    Raises:
      ValueError: file too large, invalid JSON, or wrong backup format.
    """
    from app.config import settings

    # 1. Size guard
    max_bytes = settings.BACKUP_MAX_SIZE_MB * 1024 * 1024
    if len(file_bytes) > max_bytes:
        raise ValueError(
            f"File exceeds maximum allowed size of {settings.BACKUP_MAX_SIZE_MB} MB"
        )

    if len(file_bytes) == 0:
        raise ValueError("Uploaded file is empty")

    # 2. Parse JSON
    try:
        content = json.loads(file_bytes.decode("utf-8"))
    except Exception as e:
        raise ValueError(f"File is not valid JSON: {e}") from e

    # 3. Validate format
    if "_meta" not in content or "data" not in content:
        raise ValueError(
            "File does not appear to be a FAFLOW backup (missing '_meta' or 'data' sections)"
        )
    meta_section = content.get("_meta", {})
    if meta_section.get("backup_format") != "faflow_json_v1":
        raise ValueError(
            f"Unsupported backup format: '{meta_section.get('backup_format', 'unknown')}'. "
            "Only 'faflow_json_v1' is supported."
        )

    # 4. Save to disk under a safe server-generated filename
    backup_id = str(uuid.uuid4())
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d_%H-%M-%S")
    # Sanitise the original filename for use in the stored name only (not path)
    safe_orig = "".join(c if c.isalnum() or c in "-_." else "_" for c in original_filename)[:80]
    filename = f"imported_{ts}_{backup_id[:8]}_{safe_orig}"
    if not filename.endswith(".json"):
        filename += ".json"

    backup_dir = _backup_dir()
    file_path = backup_dir / filename

    try:
        file_path.write_bytes(file_bytes)
    except OSError as e:
        raise RuntimeError(f"Failed to save imported backup: {e}") from e

    file_size = file_path.stat().st_size
    checksum = _sha256(file_path)
    created_at_str = meta_section.get("created_at") or _now_str()
    created_by_str = meta_section.get("created_by") or "unknown"

    meta = _meta_entry(
        backup_id=backup_id,
        filename=filename,
        created_at=created_at_str,
        created_by=f"{created_by_str} [imported by {actor_name}]",
        file_size_bytes=file_size,
        checksum=checksum,
        backup_type="imported",
        validation_status="valid",  # we already validated the format above
    )

    index = _load_index()
    index.insert(0, meta)
    _save_index(index)

    log_audit_event(
        db,
        actor_user_id=actor_user_id,
        action="backup.imported",
        target_type="backup",
        details={
            "backup_id": backup_id,
            "filename": filename,
            "original_filename": original_filename,
            "file_size_bytes": file_size,
        },
    )
    db.commit()

    logger.info(
        "backup_service: imported backup '%s' → '%s' (%d bytes)",
        original_filename,
        filename,
        file_size,
    )
    return meta


def create_backup(
    db: Session,
    actor_user_id: int,
    actor_name: str,
    is_pre_restore: bool = False,
    pre_restore_ref: str | None = None,
) -> dict:
    """
    Dump all application tables to a timestamped JSON file.
    Returns the metadata entry dict (same shape as BackupMetaOut).
    Raises RuntimeError if the backup cannot be written.
    """
    backup_id = str(uuid.uuid4())
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d_%H-%M-%S")
    if is_pre_restore:
        filename = f"pre_restore_backup_{ts}.json"
    else:
        filename = _safe_filename(ts)

    backup_dir = _backup_dir()
    file_path = backup_dir / filename

    snapshot: dict[str, list[dict[str, Any]]] = {}
    tables_dumped = []
    for table in BACKUP_TABLES:
        try:
            rows = db.execute(text(f"SELECT * FROM {table}")).mappings().all()
            snapshot[table] = [dict(r) for r in rows]
            tables_dumped.append(table)
        except Exception as e:
            # Table may not exist in this installation — skip it gracefully
            logger.warning("backup_service: skipping table %s: %s", table, e)
            snapshot[table] = []

    # Include metadata in the backup file itself for self-contained validation
    created_at_str = datetime.now(timezone.utc).isoformat()
    payload = {
        "_meta": {
            "backup_id": backup_id,
            "created_at": created_at_str,
            "created_by": actor_name,
            "faflow_version": "3.0.0",
            "backup_format": "faflow_json_v1",
            "tables": tables_dumped,
            "is_pre_restore": is_pre_restore,
            "pre_restore_ref": pre_restore_ref,
        },
        "data": snapshot,
    }

    try:
        file_path.write_text(
            json.dumps(payload, indent=2, default=str), encoding="utf-8"
        )
    except OSError as e:
        raise RuntimeError(f"Failed to write backup file: {e}") from e

    file_size = file_path.stat().st_size
    checksum = _sha256(file_path)

    meta = _meta_entry(
        backup_id=backup_id,
        filename=filename,
        created_at=created_at_str,
        created_by=actor_name,
        file_size_bytes=file_size,
        checksum=checksum,
        is_pre_restore=is_pre_restore,
    )

    index = _load_index()
    index.insert(0, meta)  # newest first
    _save_index(index)

    # Audit
    log_audit_event(
        db,
        actor_user_id=actor_user_id,
        action="backup.created",
        target_type="backup",
        details={
            "backup_id": backup_id,
            "filename": filename,
            "is_pre_restore": is_pre_restore,
            "file_size_bytes": file_size,
        },
    )
    db.commit()

    logger.info("backup_service: backup created → %s (%d bytes)", filename, file_size)
    return meta


def list_backups() -> list[dict]:
    """Return all backup metadata entries, newest first."""
    return _load_index()


def get_backup(backup_id: str) -> dict | None:
    """Return a single backup's metadata, or None if not found."""
    index = _load_index()
    for entry in index:
        if entry["backup_id"] == backup_id:
            return entry
    return None


def get_backup_summary() -> dict:
    """Return aggregate stats for the dashboard summary bar."""
    index = _load_index()
    completed = [e for e in index if not e.get("is_pre_restore")]
    total_bytes = sum(
        e.get("file_size_bytes", 0) for e in completed
    )
    last_backup = completed[0]["created_at"] if completed else None
    last_restore = None
    for e in completed:
        if e.get("restored_at"):
            last_restore = e["restored_at"]
            break
    return {
        "backup_count": len(completed),
        "total_storage_bytes": total_bytes,
        "last_backup_at": last_backup,
        "last_restore_at": last_restore,
    }


def validate_backup(backup_id: str) -> dict:
    """
    Validate a backup without restoring it.
    Checks: metadata exists, file on disk, readable, non-zero,
    valid JSON, expected format key, checksum match, table list present.

    Returns updated metadata entry.
    """
    index = _load_index()
    entry = next((e for e in index if e["backup_id"] == backup_id), None)
    if entry is None:
        return {"backup_id": backup_id, "validation_status": "not_found", "validation_errors": ["Backup not found in index"]}

    backup_dir = _backup_dir()
    file_path = backup_dir / entry["filename"]
    errors: list[str] = []

    # 1. File exists
    if not file_path.exists():
        errors.append("Backup file not found on disk")
        _update_index_entry(index, backup_id, {"validation_status": "invalid", "last_validated_at": _now_str()})
        _save_index(index)
        entry["validation_status"] = "invalid"
        entry["validation_errors"] = errors
        return entry

    # 2. Non-zero size
    size = file_path.stat().st_size
    if size == 0:
        errors.append("Backup file is empty (zero bytes)")

    # 3. Checksum
    actual_checksum = _sha256(file_path)
    if actual_checksum != entry.get("checksum_sha256"):
        errors.append(
            f"Checksum mismatch: stored={entry.get('checksum_sha256', 'none')[:16]}... "
            f"actual={actual_checksum[:16]}..."
        )

    # 4. Valid JSON
    try:
        content = json.loads(file_path.read_text(encoding="utf-8"))
    except Exception as e:
        errors.append(f"File is not valid JSON: {e}")
        content = None

    # 5. Expected format keys
    if content is not None:
        if "_meta" not in content:
            errors.append("Missing '_meta' section (not a FAFLOW backup)")
        if "data" not in content:
            errors.append("Missing 'data' section")
        else:
            meta_section = content.get("_meta", {})
            if meta_section.get("backup_format") != "faflow_json_v1":
                errors.append(
                    f"Unknown backup format: {meta_section.get('backup_format', 'unknown')}"
                )
            missing_tables = [
                t for t in ["users", "departments"]  # critical tables
                if t not in content.get("data", {})
            ]
            if missing_tables:
                errors.append(f"Missing critical tables: {missing_tables}")

    status = "valid" if not errors else "invalid"
    _update_index_entry(
        index,
        backup_id,
        {"validation_status": status, "last_validated_at": _now_str()},
    )
    _save_index(index)

    updated_entry = next((e for e in index if e["backup_id"] == backup_id), entry)
    updated_entry["validation_errors"] = errors
    return updated_entry


def restore_backup(
    db: Session,
    backup_id: str,
    actor_user_id: int,
    actor_name: str,
) -> dict:
    """
    Safely restore a backup.

    Steps:
      1. Look up backup metadata.
      2. Load and validate the backup file.
      3. Auto-create a pre-restore safety backup.
         → If this fails, ABORT and raise RuntimeError.
      4. Delete all data in FK-safe order.
      5. Re-insert all rows from the backup.
      6. Commit.
      7. Audit both the pre-restore backup and the restore action.

    Raises:
      ValueError: backup not found / file missing / invalid
      RuntimeError: pre-restore safety backup failed / restore failed
    """
    index = _load_index()
    entry = next((e for e in index if e["backup_id"] == backup_id), None)
    if entry is None:
        raise ValueError(f"Backup '{backup_id}' not found")

    backup_dir = _backup_dir()
    file_path = backup_dir / entry["filename"]
    if not file_path.exists():
        raise ValueError("Backup file not found on disk")

    # Load content
    try:
        content = json.loads(file_path.read_text(encoding="utf-8"))
    except Exception as e:
        raise ValueError(f"Backup file is not valid JSON: {e}") from e

    if "data" not in content or "_meta" not in content:
        raise ValueError("Backup file format is invalid (missing 'data' or '_meta')")

    data: dict[str, list[dict]] = content["data"]

    # ── Step 3: Pre-restore safety backup ────────────────────────────────────
    logger.warning(
        "restore_backup: creating pre-restore safety backup before restoring %s",
        backup_id,
    )
    try:
        pre_restore_meta = create_backup(
            db=db,
            actor_user_id=actor_user_id,
            actor_name=actor_name,
            is_pre_restore=True,
            pre_restore_ref=backup_id,
        )
        pre_restore_id = pre_restore_meta["backup_id"]
        logger.info(
            "restore_backup: pre-restore safety backup created → %s",
            pre_restore_meta["filename"],
        )
    except Exception as e:
        raise RuntimeError(
            f"Cannot proceed with restore: failed to create pre-restore safety backup. {e}"
        ) from e

    # ── Step 4 & 5: Delete then re-insert ────────────────────────────────────
    try:
        # Disable FK checks temporarily for the delete/insert cycle (PostgreSQL approach)
        # Note: We do FK-ordered deletion which is safer and works on both PG and SQLite.
        for table in _RESTORE_DELETE_ORDER:
            try:
                db.execute(text(f"DELETE FROM {table}"))
            except Exception as e:
                logger.warning("restore: could not delete %s: %s", table, e)

        # Insert in parents-first order (reverse of delete order)
        insert_order = list(reversed(_RESTORE_DELETE_ORDER))
        for table in insert_order:
            rows = data.get(table, [])
            if not rows:
                continue
            for row in rows:
                if not row:
                    continue
                # Adapt complex types (dict, list) to JSON strings for PostgreSQL / psycopg2
                cleaned_row = {}
                for k, v in row.items():
                    if isinstance(v, (dict, list)):
                        cleaned_row[k] = json.dumps(v)
                    else:
                        cleaned_row[k] = v

                cols = ", ".join(f'"{k}"' for k in cleaned_row.keys())
                placeholders = ", ".join(f":{k}" for k in cleaned_row.keys())
                stmt = text(f'INSERT INTO "{table}" ({cols}) VALUES ({placeholders})')
                try:
                    db.execute(stmt, cleaned_row)
                except Exception as e:
                    logger.error(
                        "restore: failed inserting row into %s: %s | row keys: %s",
                        table, e, list(cleaned_row.keys())
                    )
                    raise RuntimeError(
                        f"Restore failed while inserting into table '{table}': {e}. "
                        f"Pre-restore safety backup '{pre_restore_meta['filename']}' is preserved."
                    ) from e

        db.commit()

        # Synchronize sequence counters on PostgreSQL so new inserts don't collide
        _sync_postgres_sequences(db)

    except RuntimeError:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise RuntimeError(
            f"Restore failed: {e}. "
            f"Pre-restore safety backup '{pre_restore_meta['filename']}' is preserved."
        ) from e

    # ── Step 7: Update index + audit ─────────────────────────────────────────
    index = _load_index()  # reload after create_backup modified it
    _update_index_entry(index, backup_id, {"restored_at": _now_str()})
    _save_index(index)

    log_audit_event(
        db,
        actor_user_id=actor_user_id,
        action="backup.restored",
        target_type="backup",
        details={
            "backup_id": backup_id,
            "filename": entry["filename"],
            "pre_restore_backup_id": pre_restore_id,
            "pre_restore_filename": pre_restore_meta["filename"],
        },
    )
    db.commit()

    logger.warning(
        "restore_backup: restore completed for %s. Pre-restore backup: %s",
        entry["filename"],
        pre_restore_meta["filename"],
    )

    return {
        "restored_backup_id": backup_id,
        "restored_filename": entry["filename"],
        "pre_restore_backup_id": pre_restore_id,
        "pre_restore_filename": pre_restore_meta["filename"],
        "restored_at": _now_str(),
        "message": "Restore completed successfully. The application has been restored to the selected backup state.",
    }


def delete_backup(
    backup_id: str,
    db: Session,
    actor_user_id: int,
) -> None:
    """
    Delete a backup file and remove it from the index.
    Raises ValueError if not found.
    """
    index = _load_index()
    entry = next((e for e in index if e["backup_id"] == backup_id), None)
    if entry is None:
        raise ValueError(f"Backup '{backup_id}' not found")

    backup_dir = _backup_dir()
    file_path = backup_dir / entry["filename"]

    if file_path.exists():
        try:
            file_path.unlink()
        except OSError as e:
            raise RuntimeError(f"Failed to delete backup file: {e}") from e

    new_index = [e for e in index if e["backup_id"] != backup_id]
    _save_index(new_index)

    log_audit_event(
        db,
        actor_user_id=actor_user_id,
        action="backup.deleted",
        target_type="backup",
        details={"backup_id": backup_id, "filename": entry["filename"]},
    )
    db.commit()

    logger.info("backup_service: deleted backup %s", entry["filename"])


def get_backup_file_path(backup_id: str) -> Path:
    """
    Return the filesystem path for a backup file.
    Raises ValueError if the backup doesn't exist in the index or on disk.
    Never accepts a user-supplied path — only the server-generated filename from the index.
    """
    index = _load_index()
    entry = next((e for e in index if e["backup_id"] == backup_id), None)
    if entry is None:
        raise ValueError(f"Backup '{backup_id}' not found")

    path = _backup_dir() / entry["filename"]
    if not path.exists():
        raise ValueError("Backup file not found on disk")
    return path


# ── Internal helpers ───────────────────────────────────────────────────────────


def _now_str() -> str:
    return datetime.now(timezone.utc).isoformat()


def _update_index_entry(index: list[dict], backup_id: str, updates: dict) -> None:
    for entry in index:
        if entry["backup_id"] == backup_id:
            entry.update(updates)
            return


def _sync_postgres_sequences(db: Session) -> None:
    """
    On PostgreSQL, synchronizes sequence counters for all table ID columns
    so subsequent inserts don't collide with restored explicit IDs.
    """
    try:
        bind = db.get_bind()
        if bind.dialect.name == "postgresql":
            for table in BACKUP_TABLES:
                try:
                    seq_query = text(f"SELECT pg_get_serial_sequence('{table}', 'id');")
                    seq_name = db.execute(seq_query).scalar()
                    if seq_name:
                        db.execute(text(f"""
                            SELECT setval('{seq_name}', COALESCE((SELECT MAX(id) FROM "{table}"), 1), true);
                        """))
                except Exception as ex:
                    logger.debug("Sequence sync skipped for %s: %s", table, ex)
            db.commit()
    except Exception as e:
        logger.warning("Failed to sync postgres sequences: %s", e)
