"""
routes/admin_timetable_import.py
──────────────────────────────────
FastAPI router for the timetable Excel import endpoint.

Endpoint
─────────
  POST /api/admin/timetable/import
    - Auth   : require_admin (any admin role)
    - Body   : multipart/form-data  { file: UploadFile (.xlsx) }
    - Returns: TimetableImportResult JSON

Design notes
────────────
  - The route layer is thin: it only handles HTTP concerns (auth, file
    reading, HTTP errors). All business logic lives in timetable_import_service.
  - A DB-level exception from the service is caught here and returned as
    HTTP 500 with a safe error message (no internal stack trace exposed).
  - The endpoint is prefixed with /api to match the frontend API client
    base URL convention used in this project.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.core.dependencies import require_admin, get_tenant_department_id
from app.database import get_db
from app.models.user import User
from app.schemas.timetable_import import (
    TimetableImportResult,
    TimetableImportPreviewResponse,
    TimetableImportCommitRequest,
)
from app.schemas.timetable_import_json import TimetableJsonImportRequest
from app.services.timetable_import_service import (
    import_timetable,
    preview_timetable_import,
    commit_timetable_import,
    preview_timetable_import_from_json,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/admin/timetable",
    tags=["Admin — Timetable Import"],
)

# Maximum accepted file size: 20 MB
_MAX_FILE_BYTES = 20 * 1024 * 1024


@router.post(
    "/import",
    response_model=TimetableImportResult,
    status_code=status.HTTP_200_OK,
    summary="Import timetable from Excel",
    description=(
        "Upload the CS-STAFF Excel workbook. "
        "The importer will parse every teacher block, resolve teacher/subject/class "
        "names against the database, skip duplicates, detect class-level conflicts, "
        "and bulk-insert new timetable_slots rows in a single transaction.\n\n"
        "Validation errors (unknown names) are returned in the response and do NOT "
        "roll back the import. Only a database-level failure triggers a rollback."
    ),
)
async def import_timetable_endpoint(
    file: UploadFile = File(
        ...,
        description="College timetable Excel file (.xlsx). Must contain a 'CS-STAFF' sheet.",
    ),
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    tenant_department_id: int | None = Depends(get_tenant_department_id),
) -> TimetableImportResult:
    """
    Import the college timetable from an uploaded Excel file.

    Accepts multipart/form-data with a single `file` field.
    Returns a TimetableImportResult summary.
    """
    # ── Validate content type ─────────────────────────────────────────────────
    allowed_content_types = {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",  # .xlsx
        "application/vnd.ms-excel",                                            # .xls
        "application/octet-stream",                                            # generic binary upload
    }
    if file.content_type and file.content_type not in allowed_content_types:
        # Soft check — browsers sometimes send text/plain; we rely on openpyxl's own validation
        logger.warning(
            "Unexpected content type '%s' for timetable import — proceeding anyway.",
            file.content_type,
        )

    # ── Read file bytes ───────────────────────────────────────────────────────
    try:
        file_bytes = await file.read()
    except Exception as exc:
        logger.error("Failed to read uploaded file: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not read uploaded file.",
        ) from exc

    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    if len(file_bytes) > _MAX_FILE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum allowed size is {_MAX_FILE_BYTES // (1024*1024)} MB.",
        )

    logger.info(
        "Timetable import requested by admin id=%s, file='%s', size=%d bytes.",
        _admin.id, file.filename, len(file_bytes),
    )

    # ── Delegate to service layer ─────────────────────────────────────────────
    try:
        result = import_timetable(file_bytes=file_bytes, db=db, tenant_department_id=tenant_department_id)
    except Exception as exc:
        # Service already rolled back the transaction; expose a safe message
        logger.error("Timetable import failed with DB error: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "A database error occurred during import. "
                "The transaction was rolled back — no data was changed. "
                f"Details: {str(exc)[:200]}"
            ),
        ) from exc

    return result


@router.post(
    "/import/preview",
    response_model=TimetableImportPreviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Preview timetable import from Excel",
    description="Upload the CS-STAFF Excel workbook and preview the resolved/unresolved rows.",
)
async def import_timetable_preview_endpoint(
    file: UploadFile = File(
        ...,
        description="College timetable Excel file (.xlsx). Must contain a 'CS-STAFF' sheet.",
    ),
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    tenant_department_id: int | None = Depends(get_tenant_department_id),
) -> TimetableImportPreviewResponse:
    # ── Read file bytes ───────────────────────────────────────────────────────
    try:
        file_bytes = await file.read()
    except Exception as exc:
        logger.error("Failed to read uploaded file: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not read uploaded file.",
        ) from exc

    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    if len(file_bytes) > _MAX_FILE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum allowed size is {_MAX_FILE_BYTES // (1024*1024)} MB.",
        )

    # Delegate to service layer
    try:
        result = preview_timetable_import(file_bytes=file_bytes, db=db, tenant_department_id=tenant_department_id)
    except Exception as exc:
        logger.error("Timetable preview failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to preview timetable import: {str(exc)}",
        ) from exc

    return result


@router.post(
    "/import/commit",
    response_model=TimetableImportResult,
    status_code=status.HTTP_200_OK,
    summary="Commit verified/edited timetable slots",
    description="Bulk-inserts the verified/edited slots from the preview staging area.",
)
async def import_timetable_commit_endpoint(
    body: TimetableImportCommitRequest,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    tenant_department_id: int | None = Depends(get_tenant_department_id),
) -> TimetableImportResult:
    try:
        result = commit_timetable_import(
            slots_data=body.slots,
            actor_id=_admin.id,
            db=db,
            semester_for_new_classes=body.semester_for_new_classes,
            tenant_department_id=tenant_department_id,
        )
    except HTTPException as exc:
        raise exc
    except Exception as exc:
        logger.error("Timetable commit failed with DB error: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "A database error occurred during commit. "
                "The transaction was rolled back — no data was changed. "
                f"Details: {str(exc)[:200]}"
            ),
        ) from exc

    return result


@router.post(
    "/import/json/preview",
    response_model=TimetableImportPreviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Preview timetable import from JSON",
    description="Preview the resolved/unresolved rows from a JSON payload.",
)
async def import_timetable_json_preview_endpoint(
    body: TimetableJsonImportRequest,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    tenant_department_id: int | None = Depends(get_tenant_department_id),
) -> TimetableImportPreviewResponse:
    try:
        payload = body.dict()
        result = preview_timetable_import_from_json(payload=payload, db=db, tenant_department_id=tenant_department_id)
    except ValueError as exc:
        logger.error("JSON Timetable preview validation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid JSON import data: {str(exc)}",
        ) from exc
    except Exception as exc:
        logger.error("JSON Timetable preview failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to preview timetable import: {str(exc)}",
        ) from exc

    return result


@router.get(
    "/import/json/prompt-template",
    response_model=str,
    status_code=status.HTTP_200_OK,
    summary="Get the AI prompt template for JSON import",
)
async def get_import_json_prompt_template(
    _admin: User = Depends(require_admin),
) -> str:
    from app.schemas.timetable_import_json import get_ai_prompt_template
    return get_ai_prompt_template()
