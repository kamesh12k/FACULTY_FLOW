from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.core.dependencies import require_teacher, require_admin, require_super_admin
from app.models.user import User
from app.schemas.leave import LeaveOut, AlterAssignmentOut
from app.schemas.substitution import RecommendationOut
from app.services import teacher_substitution_service as service
from app.services.system_setting_service import get_setting, set_setting
from app.services.admin_service import log_audit_event

router = APIRouter(prefix="/teacher/substitution", tags=["Teacher Substitution"])

class TeacherSubstitutionConfigOut(BaseModel):
    teacher_self_management_enabled: bool

class TeacherSubstitutionConfigUpdate(BaseModel):
    teacher_self_management_enabled: bool

@router.get("/enabled")
def check_enabled(
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    enabled = service.is_teacher_self_management_allowed(db, current_user.id)
    return {"teachers_mode_enabled": enabled}

@router.get("/my-leaves", response_model=list[LeaveOut])
def get_my_leaves(
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    return service.teacher_get_leave_requests(db, current_user.id)

@router.get("/leave/{leave_id}/candidates", response_model=list[RecommendationOut])
def get_candidates(
    leave_id: int,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    return service.teacher_get_candidates(db, leave_id, current_user.id)

@router.post("/leave/{leave_id}/assign/{substitute_id}", response_model=AlterAssignmentOut)
def assign_substitute(
    leave_id: int,
    substitute_id: int,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    return service.teacher_assign_substitute(db, leave_id, substitute_id, current_user.id)

@router.put("/leave/{leave_id}/override/{substitute_id}", response_model=AlterAssignmentOut)
def override_substitute(
    leave_id: int,
    substitute_id: int,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    return service.teacher_override_substitute(db, leave_id, substitute_id, current_user.id)

@router.delete("/clear-all-assignments")
def clear_all_assignments(
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    service.teacher_clear_assignments(db, current_user.id)
    return {"ok": True}

@router.delete("/reset-preferences")
def reset_preferences(
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    service.teacher_reset_preferences(db, current_user.id)
    return {"ok": True}

@router.get("/config", response_model=TeacherSubstitutionConfigOut)
def get_config(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    dept_id = _admin.department_id
    enabled = get_setting(db, "teacher_self_management_enabled", "false", dept_id) == "true"
    return TeacherSubstitutionConfigOut(
        teacher_self_management_enabled=enabled
    )

@router.put("/config", response_model=TeacherSubstitutionConfigOut)
def update_config(
    data: TeacherSubstitutionConfigUpdate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    val = "true" if data.teacher_self_management_enabled else "false"
    dept_id = _admin.department_id
    set_setting(db, "teacher_self_management_enabled", val, dept_id)
    
    log_audit_event(
        db, _admin.id, "teachers_mode.config_change", "system_setting", None,
        {
            "teacher_self_management_enabled": val,
            "department_id": dept_id
        }
    )
    db.commit()
    return TeacherSubstitutionConfigOut(
        teacher_self_management_enabled=data.teacher_self_management_enabled
    )
