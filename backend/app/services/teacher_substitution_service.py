from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.leave import LeaveRequest, LeaveStatus, AlterAssignment, AssignmentType
from app.models.user import User, Role
from app.models.substitution_preference import SubstitutionPreference
from app.services.system_setting_service import get_setting
from app.services.substitution_service import get_mode as get_campus_mode
from app.services import leave_service, substitution_service
from app.services.admin_service import log_audit_event
from app.services.credit_service import apply_credit_change

# ---------- Permission Helpers ----------

def is_teacher_self_management_allowed(db: Session, teacher_id: int | None = None) -> bool:
    dept_id = None
    if teacher_id is not None:
        t = db.query(User).filter(User.id == teacher_id).first()
        if t:
            dept_id = t.department_id
    campus_mode = get_campus_mode(db, dept_id)
    if campus_mode == "autonomous":
        return False
    return get_setting(db, "teacher_self_management_enabled", "false", dept_id) == "true"

def check_teacher_self_management_allowed(db: Session, teacher_id: int | None = None) -> None:
    if not is_teacher_self_management_allowed(db, teacher_id):
        raise HTTPException(
            status_code=400,
            detail="Teacher self-management is not enabled or is ignored in autonomous mode"
        )

# ---------- Teacher Actions ----------

def teacher_get_leave_requests(db: Session, teacher_id: int) -> list[LeaveRequest]:
    check_teacher_self_management_allowed(db, teacher_id)
    # Returns approved leaves needing substitutes (no alter_assignment) belonging to teacher
    return (
        db.query(LeaveRequest)
        .outerjoin(AlterAssignment)
        .filter(
            LeaveRequest.teacher_id == teacher_id,
            LeaveRequest.status == LeaveStatus.approved,
            AlterAssignment.id == None
        )
        .order_by(LeaveRequest.date.desc(), LeaveRequest.period_number)
        .all()
    )

def teacher_get_candidates(db: Session, leave_id: int, teacher_id: int) -> list:
    check_teacher_self_management_allowed(db, teacher_id)
    # Verify leave request belongs to teacher and is approved
    leave = db.query(LeaveRequest).filter(
        LeaveRequest.id == leave_id,
        LeaveRequest.teacher_id == teacher_id
    ).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found or does not belong to you")
    if leave.status != LeaveStatus.approved:
        raise HTTPException(status_code=400, detail="Leave request is not approved yet")
    
    cross = substitution_service.cross_department_substitutions_enabled(db, leave.teacher.department_id)
    return substitution_service.get_ranked_recommendations(db, leave_id, tenant_department_id=leave.teacher.department_id, include_cross_department=cross)

def teacher_assign_substitute(db: Session, leave_id: int, substitute_id: int, teacher_id: int) -> AlterAssignment:
    check_teacher_self_management_allowed(db, teacher_id)
    
    leave = db.query(LeaveRequest).filter(
        LeaveRequest.id == leave_id,
        LeaveRequest.teacher_id == teacher_id
    ).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found or does not belong to you")
    
    substitute = db.query(User).filter(
        User.id == substitute_id,
        User.role == Role.teacher,
        User.is_active == True
    ).first()
    if not substitute:
        raise HTTPException(status_code=404, detail="Substitute teacher not found")
        
    # Check hard eligibility rules
    ok, reason = substitution_service._is_hard_eligible(db, substitute, leave, require_auto_opt_in=False)
    if not ok:
        raise HTTPException(status_code=400, detail=f"Substitute is not eligible: {reason}")
        
    subject, dept_name = substitution_service._subject_and_department_for_leave(db, leave)
    best = substitution_service.score_candidate(db, substitute, leave, subject, dept_name)
    
    return leave_service.assign_substitute(
        leave_id=leave_id,
        substitute_id=substitute_id,
        db=db,
        assignment_type=AssignmentType.teacher_assigned,
        compatibility_score=best.score,
        actor_id=teacher_id,
        tenant_department_id=leave.teacher.department_id,
        include_cross_department=substitute.department_id != leave.teacher.department_id,
    )

def teacher_override_substitute(db: Session, leave_id: int, substitute_id: int, teacher_id: int) -> AlterAssignment:
    check_teacher_self_management_allowed(db, teacher_id)
    
    leave = db.query(LeaveRequest).filter(
        LeaveRequest.id == leave_id,
        LeaveRequest.teacher_id == teacher_id
    ).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found or does not belong to you")
        
    teacher = db.query(User).filter(User.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
        
    substitute = db.query(User).filter(
        User.id == substitute_id,
        User.role == Role.teacher,
        User.is_active == True
    ).first()
    if not substitute:
        raise HTTPException(status_code=404, detail="Substitute teacher not found")
        
    # Check hard eligibility
    ok, reason = substitution_service._is_hard_eligible(db, substitute, leave, require_auto_opt_in=False)
    if not ok:
        raise HTTPException(status_code=400, detail=f"Substitute is not eligible: {reason}")
        
    return leave_service.override_substitute(
        leave_id=leave_id,
        new_substitute_id=substitute_id,
        actor=teacher,
        db=db,
        tenant_department_id=leave.teacher.department_id,
        include_cross_department=substitute.department_id != leave.teacher.department_id,
    )


def teacher_clear_assignments(db: Session, teacher_id: int) -> None:
    check_teacher_self_management_allowed(db, teacher_id)
    
    leaves = db.query(LeaveRequest).join(AlterAssignment).filter(
        LeaveRequest.teacher_id == teacher_id,
        LeaveRequest.status == LeaveStatus.approved
    ).all()
    
    for leave in leaves:
        existing = leave.alter_assignment
        if existing:
            # Revert credits
            apply_credit_change(
                teacher_id=leave.teacher_id, change=+1,
                reason=f"Teacher clear: leave on {leave.date} period {leave.period_number} reverted",
                leave_id=leave.id, db=db, category="correction",
            )
            apply_credit_change(
                teacher_id=existing.substitute_teacher_id, change=-1,
                reason=f"Teacher clear: substitute assignment for {leave.date} period {leave.period_number} reverted",
                leave_id=leave.id, db=db, category="correction",
            )
            db.delete(existing)
            
    log_audit_event(
        db, teacher_id, "substitution.teacher_cleared_all", "user", teacher_id, {}
    )
    db.commit()

def teacher_reset_preferences(db: Session, teacher_id: int) -> None:
    check_teacher_self_management_allowed(db, teacher_id)
    
    pref = db.query(SubstitutionPreference).filter(SubstitutionPreference.teacher_id == teacher_id).first()
    if not pref:
        pref = SubstitutionPreference(teacher_id=teacher_id)
        db.add(pref)
        
    pref.accept_auto_assignments = False
    pref.allow_emergency_assignments = False
    pref.prefer_morning_classes = False
    pref.prefer_same_department = False
    pref.max_weekly_substitutions = 5
    
    log_audit_event(
        db, teacher_id, "preferences.teacher_reset", "substitution_preference", pref.id if pref.id else None, {}
    )
    db.commit()
