"""
Backup & Restore API routes.

All endpoints are restricted to `system_admin` role only via the
existing `require_system_admin` dependency from app/core/dependencies.py.

Routes:
  POST   /admin/backups                      — create a new backup
  GET    /admin/backups                      — list all backups
  GET    /admin/backups/summary              — dashboard summary stats
  GET    /admin/backups/{backup_id}          — get single backup metadata
  GET    /admin/backups/{backup_id}/download — download backup file
  POST   /admin/backups/{backup_id}/validate — validate backup integrity
  POST   /admin/backups/{backup_id}/restore  — safe restore with confirmation
  DELETE /admin/backups/{backup_id}          — delete a backup
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.dependencies import require_system_admin
from app.models.user import User
from app.schemas.backup import (
    BackupMetaOut,
    BackupSummaryOut,
    RestoreConfirmRequest,
    RestoreResultOut,
)
from app.services import backup_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/backups", tags=["Backup & Restore"])


@router.post("/import", response_model=BackupMetaOut, status_code=201)
async def import_backup_file(
    file: UploadFile = File(...),
    admin: User = Depends(require_system_admin),
    db: Session = Depends(get_db),
):
    """Import a backup JSON file from local storage. System Admin only."""
    try:
        file_bytes = await file.read()
        meta = backup_service.import_backup(
            file_bytes=file_bytes,
            original_filename=file.filename or "uploaded_backup.json",
            actor_user_id=admin.id,
            actor_name=admin.username or admin.name,
            db=db,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )
    return meta


@router.post("", response_model=BackupMetaOut, status_code=201)
def create_backup(
    admin: User = Depends(require_system_admin),
    db: Session = Depends(get_db),
):
    """Create a full database backup. System Admin only."""
    try:
        meta = backup_service.create_backup(
            db=db,
            actor_user_id=admin.id,
            actor_name=admin.username or admin.name,
        )
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Backup creation failed: {e}",
        )
    return meta


@router.get("/summary", response_model=BackupSummaryOut)
def get_summary(
    _admin: User = Depends(require_system_admin),
):
    """Return aggregate backup statistics. System Admin only."""
    return backup_service.get_backup_summary()


@router.get("", response_model=list[BackupMetaOut])
def list_backups(
    _admin: User = Depends(require_system_admin),
):
    """List all backups (newest first). System Admin only."""
    return backup_service.list_backups()


@router.get("/{backup_id}", response_model=BackupMetaOut)
def get_backup(
    backup_id: str,
    _admin: User = Depends(require_system_admin),
):
    """Get metadata for a single backup. System Admin only."""
    entry = backup_service.get_backup(backup_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Backup not found")
    return entry


@router.get("/{backup_id}/download")
def download_backup(
    backup_id: str,
    _admin: User = Depends(require_system_admin),
    db: Session = Depends(get_db),
):
    """
    Download a backup file.
    The filename is resolved server-side from the index — the client
    cannot specify arbitrary filesystem paths.
    System Admin only.
    """
    try:
        file_path = backup_service.get_backup_file_path(backup_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    # Audit the download
    from app.services.admin_service import log_audit_event
    entry = backup_service.get_backup(backup_id)
    log_audit_event(
        db,
        actor_user_id=_admin.id,
        action="backup.downloaded",
        target_type="backup",
        details={"backup_id": backup_id, "filename": entry["filename"] if entry else "unknown"},
    )
    db.commit()

    return FileResponse(
        path=str(file_path),
        media_type="application/json",
        filename=file_path.name,
        headers={
            "Content-Disposition": f'attachment; filename="{file_path.name}"',
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.post("/{backup_id}/validate", response_model=BackupMetaOut)
def validate_backup(
    backup_id: str,
    _admin: User = Depends(require_system_admin),
    db: Session = Depends(get_db),
):
    """
    Validate a backup's integrity.
    Checks: file exists, non-zero, valid JSON, expected format, checksum.
    System Admin only.
    """
    result = backup_service.validate_backup(backup_id)
    if result.get("validation_status") == "not_found":
        raise HTTPException(status_code=404, detail="Backup not found")

    # Audit the validation
    from app.services.admin_service import log_audit_event
    log_audit_event(
        db,
        actor_user_id=_admin.id,
        action="backup.validated",
        target_type="backup",
        details={
            "backup_id": backup_id,
            "validation_status": result.get("validation_status"),
            "errors": result.get("validation_errors", []),
        },
    )
    db.commit()

    return result


@router.post("/{backup_id}/restore", response_model=RestoreResultOut)
def restore_backup(
    backup_id: str,
    body: RestoreConfirmRequest,
    admin: User = Depends(require_system_admin),
    db: Session = Depends(get_db),
):
    """
    Safely restore a backup.

    Requires explicit typed confirmation in the request body.
    Automatically creates a pre-restore safety backup before restoring.
    If the safety backup fails, the restore is aborted.
    System Admin only.
    """
    try:
        result = backup_service.restore_backup(
            db=db,
            backup_id=backup_id,
            actor_user_id=admin.id,
            actor_name=admin.username or admin.name,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )
    return result


@router.delete("/{backup_id}", status_code=204)
def delete_backup(
    backup_id: str,
    admin: User = Depends(require_system_admin),
    db: Session = Depends(get_db),
):
    """Delete a backup. Requires confirmation from the UI. System Admin only."""
    try:
        backup_service.delete_backup(
            backup_id=backup_id,
            db=db,
            actor_user_id=admin.id,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )
    return None
