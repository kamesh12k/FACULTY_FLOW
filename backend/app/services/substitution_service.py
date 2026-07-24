"""
Autonomous Substitution Engine.

Three things live here:
  1. Hard eligibility — who CAN be assigned at all (never violated,
     regardless of mode or score).
  2. The recommendation/compatibility scorer — ranks eligible candidates
     so a human (Assisted mode) or the system itself (Autonomous mode)
     can pick the best one.
  3. Mode-aware execution — what actually happens after a leave is
     approved, driven by the campus_operations_mode setting.

Design note on "fairness": rather than a separate running-counter table
that could drift out of sync with reality, fairness is computed on demand
directly from alter_assignments — the substitution record IS the source
of truth, so there's only ever one place that can disagree with itself.
This trades a small amount of query cost for never needing a
reconciliation job.
"""
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass, field

from sqlalchemy import func
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.user import User, Role
from app.models.leave import LeaveRequest, LeaveStatus, AlterAssignment, AssignmentType
from app.models.timetable import TimetableSlot
from app.models.subject import Subject
from app.models.department import Department
from app.models.class_ import Class
from app.models.substitution_preference import SubstitutionPreference
from app.models.system_setting import SystemSetting, CAMPUS_OPERATIONS_MODES
from app.services.credit_service import apply_credit_change
from app.services import notification_service
from app.services.admin_service import log_audit_event
from app.services.system_setting_service import get_setting, set_setting

FAIRNESS_WINDOW_DAYS = 30  # "monthly substitutions" window for fairness scoring


# ---------- Campus Operations Mode ----------

VALID_MODES = CAMPUS_OPERATIONS_MODES


def get_mode(db: Session, tenant_department_id: int | None = None) -> str:
    # 1. Check global override first
    override = get_setting(db, "campus_operations_mode_override", "none", None)
    if override in {"manual", "assisted", "autonomous"}:
        return override
    # 2. Otherwise fall back to department or global setting
    val = get_setting(db, "campus_operations_mode", "manual", tenant_department_id)
    return val if val in VALID_MODES else "manual"


def get_configured_mode(db: Session, tenant_department_id: int | None = None) -> str:
    val = get_setting(db, "campus_operations_mode", "manual", tenant_department_id)
    return val if val in VALID_MODES else "manual"


def get_global_override(db: Session) -> str:
    val = get_setting(db, "campus_operations_mode_override", "none", None)
    return val if val in {"none", "manual", "assisted", "autonomous"} else "none"


def set_global_override(db: Session, override: str, actor: User) -> str:
    if override not in {"none", "manual", "assisted", "autonomous"}:
        raise HTTPException(status_code=400, detail="override must be one of none, manual, assisted, autonomous")
    set_setting(db, "campus_operations_mode_override", override, None)
    log_audit_event(db, actor.id, "campus_operations.override_change", "system_setting", None, {"override": override})
    db.commit()
    return override


def set_mode(db: Session, mode: str, actor: User, tenant_department_id: int | None = None) -> str:
    if mode not in VALID_MODES:
        raise HTTPException(status_code=400, detail=f"mode must be one of {sorted(VALID_MODES)}")
    set_setting(db, "campus_operations_mode", mode, tenant_department_id)
    log_audit_event(db, actor.id, "campus_operations.mode_change", "system_setting", None, {"mode": mode})
    db.commit()
    return mode


def get_emergency_window_hours(db: Session, tenant_department_id: int | None = None) -> int:
    val = get_setting(db, "emergency_window_hours", "2", tenant_department_id)
    try:
        return int(val)
    except (ValueError, TypeError):
        return 2


# ---------- Preferences ----------

def get_or_create_preferences(db: Session, teacher_id: int) -> SubstitutionPreference:
    pref = db.query(SubstitutionPreference).filter(SubstitutionPreference.teacher_id == teacher_id).first()
    if not pref:
        pref = SubstitutionPreference(teacher_id=teacher_id)
        db.add(pref)
        db.flush()
    return pref


def update_preferences(db: Session, teacher_id: int, **fields) -> SubstitutionPreference:
    pref = get_or_create_preferences(db, teacher_id)
    for key, value in fields.items():
        if value is not None and hasattr(pref, key):
            setattr(pref, key, value)
    db.commit()
    db.refresh(pref)
    return pref


# ---------- Fairness ----------

def count_recent_substitutions(db: Session, teacher_id: int, since: datetime) -> int:
    return (
        db.query(AlterAssignment)
        .filter(AlterAssignment.substitute_teacher_id == teacher_id, AlterAssignment.assigned_at >= since)
        .count()
    )


def fairness_score(db: Session, teacher_id: int) -> float:
    """0-100, higher = fairer to assign this teacher right now (i.e. they
    have done relatively few substitutions lately). Computed purely
    against this institution's own substitution counts in the fairness
    window — there is no fixed "good" number of substitutions in the
    abstract, only relative load across the current pool of teachers, so
    a teacher with zero recent substitutions and a small institution
    still scores sensibly relative to their peers rather than against an
    arbitrary global constant."""
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=FAIRNESS_WINDOW_DAYS)

    counts = (
        db.query(AlterAssignment.substitute_teacher_id, func.count(AlterAssignment.id))
        .filter(AlterAssignment.assigned_at >= since)
        .group_by(AlterAssignment.substitute_teacher_id)
        .all()
    )
    count_map = {tid: c for tid, c in counts}
    this_count = count_map.get(teacher_id, 0)

    if not count_map:
        return 100.0  # nobody has substituted recently; everyone starts equal

    max_count = max(count_map.values())
    if max_count == 0:
        return 100.0
    # Linear inverse: 0 substitutions -> 100, max_count substitutions -> 0
    return round(100.0 * (1 - (this_count / max_count)), 1)


# ---------- Hard eligibility ----------

@dataclass
class Candidate:
    teacher: User
    score: float = 0.0
    reasons: list[str] = field(default_factory=list)
    same_subject: bool = False  # Vestigial: no longer drives scoring
    same_department: bool = False  # Vestigial: no longer drives scoring
    workload_count: int = 0
    fairness: float = 0.0
    today_workload: int = 0
    week_workload: int = 0


def _is_hard_eligible(
    db: Session, candidate: User, leave: LeaveRequest, *, require_auto_opt_in: bool,
) -> tuple[bool, str | None]:
    """The rules that NEVER bend, regardless of score or mode. Returns
    (eligible, reason_if_not). require_auto_opt_in is True for
    Autonomous-mode execution and False for the Assisted-mode ranked
    list, where a teacher who hasn't opted into auto-assignment should
    still be visible as a manually-pickable option — only the system's
    own unattended execution path needs to respect that opt-out."""
    if candidate.id == leave.teacher_id:
        return False, "is the teacher requesting leave"

    if not candidate.is_active:
        return False, "account is disabled"

    busy = (
        db.query(TimetableSlot)
        .filter(TimetableSlot.teacher_id == candidate.id, TimetableSlot.day_order == leave.day_order,
                TimetableSlot.period_number == leave.period_number)
        .first()
    )
    if busy:
        return False, "already teaching this period"

    own_leave = (
        db.query(LeaveRequest)
        .filter(LeaveRequest.teacher_id == candidate.id, LeaveRequest.date == leave.date,
                LeaveRequest.period_number == leave.period_number, LeaveRequest.status == LeaveStatus.approved)
        .first()
    )
    if own_leave:
        return False, "on approved leave for this period"

    already_subbing = (
        db.query(AlterAssignment)
        .join(LeaveRequest, AlterAssignment.leave_request_id == LeaveRequest.id)
        .filter(AlterAssignment.substitute_teacher_id == candidate.id, LeaveRequest.date == leave.date,
                LeaveRequest.period_number == leave.period_number)
        .first()
    )
    if already_subbing:
        return False, "already substituting another class this period"

    if require_auto_opt_in:
        already_subbing_today = (
            db.query(AlterAssignment)
            .join(LeaveRequest, AlterAssignment.leave_request_id == LeaveRequest.id)
            .filter(AlterAssignment.substitute_teacher_id == candidate.id, LeaveRequest.date == leave.date)
            .first()
        )
        if already_subbing_today:
            return False, "already substituting another class today"

    pref = get_or_create_preferences(db, candidate.id)

    if require_auto_opt_in and not pref.accept_auto_assignments:
        return False, "has opted out of automatic assignment"

    if leave.is_emergency and require_auto_opt_in and not pref.allow_emergency_assignments:
        return False, "has opted out of emergency assignments"

    if pref.max_weekly_substitutions is not None:
        since = datetime.now(timezone.utc) - timedelta(days=7)
        recent = count_recent_substitutions(db, candidate.id, since)
        if recent >= pref.max_weekly_substitutions:
            return False, f"at weekly substitution cap ({pref.max_weekly_substitutions})"

    return True, None


def _is_hard_eligible_bulk(
    db: Session, candidate: User, leave: LeaveRequest, *, require_auto_opt_in: bool,
    busy_teacher_ids: set[int], leave_teacher_ids: set[int], subbing_teacher_ids: set[int],
    prefs: dict[int, SubstitutionPreference], recent_sub_counts: dict[int, int],
    subbing_today_teacher_ids: set[int] = None
) -> tuple[bool, str | None]:
    if candidate.id == leave.teacher_id:
        return False, "is the teacher requesting leave"

    if not candidate.is_active:
        return False, "account is disabled"

    if candidate.id in busy_teacher_ids:
        return False, "already teaching this period"

    if candidate.id in leave_teacher_ids:
        return False, "on approved leave for this period"

    if candidate.id in subbing_teacher_ids:
        return False, "already substituting another class this period"

    if require_auto_opt_in and subbing_today_teacher_ids and candidate.id in subbing_today_teacher_ids:
        return False, "already substituting another class today"

    pref = prefs.get(candidate.id)
    if not pref:
        pref = get_or_create_preferences(db, candidate.id)
        prefs[candidate.id] = pref

    if require_auto_opt_in and not pref.accept_auto_assignments:
        return False, "has opted out of automatic assignment"

    if leave.is_emergency and require_auto_opt_in and not pref.allow_emergency_assignments:
        return False, "has opted out of emergency assignments"

    if pref.max_weekly_substitutions is not None:
        recent = recent_sub_counts.get(candidate.id, 0)
        if recent >= pref.max_weekly_substitutions:
            return False, f"at weekly substitution cap ({pref.max_weekly_substitutions})"

    return True, None


def list_eligible_candidates(
    db: Session, leave: LeaveRequest, *, require_auto_opt_in: bool = False, tenant_department_id: int | None = None,
) -> list[User]:
    """Every teacher who structurally CAN cover this leave, full stop —
    before any scoring or ranking. This is the set Autonomous mode is
    allowed to choose from; Assisted mode scores this same set for the
    ranked list a human picks from."""
    query = db.query(User).filter(User.role == Role.teacher, User.is_active == True)  # noqa: E712
    if tenant_department_id is not None:
        query = query.filter(User.department_id == tenant_department_id)
    all_teachers = query.all()

    # Bulk pre-fetch eligibility constraints
    busy_teacher_ids = {
        row[0] for row in db.query(TimetableSlot.teacher_id)
        .filter(TimetableSlot.day_order == leave.day_order, TimetableSlot.period_number == leave.period_number)
        .all()
    }
    leave_teacher_ids = {
        row[0] for row in db.query(LeaveRequest.teacher_id)
        .filter(LeaveRequest.date == leave.date, LeaveRequest.period_number == leave.period_number, LeaveRequest.status == LeaveStatus.approved)
        .all()
    }
    subbing_teacher_ids = {
        row[0] for row in db.query(AlterAssignment.substitute_teacher_id)
        .join(LeaveRequest, AlterAssignment.leave_request_id == LeaveRequest.id)
        .filter(LeaveRequest.date == leave.date, LeaveRequest.period_number == leave.period_number)
        .all()
    }
    subbing_today_teacher_ids = set()
    if require_auto_opt_in:
        subbing_today_teacher_ids = {
            row[0] for row in db.query(AlterAssignment.substitute_teacher_id)
            .join(LeaveRequest, AlterAssignment.leave_request_id == LeaveRequest.id)
            .filter(LeaveRequest.date == leave.date)
            .all()
        }
    prefs = {
        p.teacher_id: p for p in db.query(SubstitutionPreference).all()
    }
    since = datetime.now(timezone.utc) - timedelta(days=7)
    recent_sub_counts = {
        row[0]: row[1] for row in db.query(AlterAssignment.substitute_teacher_id, func.count(AlterAssignment.id))
        .filter(AlterAssignment.assigned_at >= since)
        .group_by(AlterAssignment.substitute_teacher_id)
        .all()
    }

    eligible = []
    for t in all_teachers:
        ok, _ = _is_hard_eligible_bulk(
            db, t, leave, require_auto_opt_in=require_auto_opt_in,
            busy_teacher_ids=busy_teacher_ids,
            leave_teacher_ids=leave_teacher_ids,
            subbing_teacher_ids=subbing_teacher_ids,
            prefs=prefs,
            recent_sub_counts=recent_sub_counts,
            subbing_today_teacher_ids=subbing_today_teacher_ids
        )
        if ok:
            eligible.append(t)
    return eligible


# ---------- Recommendation scoring ----------

def _subject_and_department_for_leave(db: Session, leave: LeaveRequest) -> tuple[Subject | None, str | None]:
    slot = (
        db.query(TimetableSlot)
        .filter(TimetableSlot.teacher_id == leave.teacher_id, TimetableSlot.day_order == leave.day_order,
                TimetableSlot.period_number == leave.period_number)
        .first()
    )
    if not slot:
        return None, None
    subject = db.query(Subject).filter(Subject.id == slot.subject_id).first() if slot.subject_id else None
    dept_name = None
    if subject and subject.department_id:
        dept = db.query(Department).filter(Department.id == subject.department_id).first()
        dept_name = dept.name if dept else None
    
    # Fallback to class department if subject department is missing
    if not dept_name and slot.class_id:
        cls = db.query(Class).filter(Class.id == slot.class_id).first()
        if cls and cls.department_id:
            dept = db.query(Department).filter(Department.id == cls.department_id).first()
            dept_name = dept.name if dept else None
            
    return subject, dept_name


def score_candidate(db: Session, candidate: User, leave: LeaveRequest, subject: Subject | None, dept_name: str | None) -> Candidate:
    """
    Workload-only compatibility score, 0-100. A candidate's suitability is
    based purely on how free they currently are — not subject match,
    department, or fairness-vs-peers — so a genuinely available teacher
    is never passed over for one who merely "looks better on paper."

    Two components, both "fewer periods scheduled = higher score":
      - Today's workload     (periods on this SAME day_order)        — weight 60
      - This week's workload (periods across the full 1-6 rotation)  — weight 40
    """
    result = Candidate(teacher=candidate)

    # Today's workload: how many periods this candidate already teaches
    # on the same day_order as the leave being covered.
    today_period_count = (
        db.query(TimetableSlot)
        .filter(TimetableSlot.teacher_id == candidate.id, TimetableSlot.day_order == leave.day_order)
        .count()
    )
    result.today_workload = today_period_count
    today_component = max(0.0, 60 * (1 - min(today_period_count, 5) / 5))  # 5 periods/day max
    result.score += today_component
    # Today's workload string
    if today_period_count == 0:
        result.reasons.append("Free all day today")
    elif today_period_count == 1:
        result.reasons.append("1 period today")
    else:
        result.reasons.append(f"{today_period_count} periods today")

    # Today's periods list
    if today_period_count > 0:
        slots = (
            db.query(TimetableSlot.period_number)
            .filter(TimetableSlot.teacher_id == candidate.id, TimetableSlot.day_order == leave.day_order)
            .order_by(TimetableSlot.period_number)
            .all()
        )
        periods_today = [row[0] for row in slots]
        result.reasons.append(f"Periods: {', '.join(map(str, periods_today))}")

    # Weekly workload: total periods across the full Day Order rotation (1-6).
    week_period_count = (
        db.query(TimetableSlot)
        .filter(TimetableSlot.teacher_id == candidate.id)
        .count()
    )
    result.week_workload = week_period_count
    result.workload_count = week_period_count
    week_component = max(0.0, 40 * (1 - min(week_period_count, 30) / 30))
    result.score += week_component
    
    # Weekly workload string
    if week_period_count == 1:
        result.reasons.append("1 period this week")
    else:
        result.reasons.append(f"{week_period_count} periods this week")

    result.score = round(min(result.score, 100.0), 1)
    return result


def cross_department_substitutions_enabled(db: Session, department_id: int | None) -> bool:
    return get_setting(db, "cross_department_substitutions_enabled", "false", department_id) == "true"


def get_ranked_recommendations(db: Session, leave_id: int, limit: int = 100, tenant_department_id: int | None = None, include_cross_department: bool = False, only_handles_class: bool = False) -> list[Candidate]:
    leave = _get_leave_or_404(db, leave_id, tenant_department_id)
    if include_cross_department and not cross_department_substitutions_enabled(db, leave.teacher.department_id):
        raise HTTPException(status_code=403, detail="Cross-department substitutions are disabled for this department")
    subject, dept_name = _subject_and_department_for_leave(db, leave)
    eligible = list_eligible_candidates(db, leave, require_auto_opt_in=False, tenant_department_id=None if include_cross_department else tenant_department_id)
    if only_handles_class:
        affected_slot = db.query(TimetableSlot).filter(
            TimetableSlot.teacher_id == leave.teacher_id,
            TimetableSlot.day_order == leave.day_order,
            TimetableSlot.period_number == leave.period_number,
        ).first()
        if not affected_slot:
            return []
        experienced_ids = {
            row[0] for row in db.query(TimetableSlot.teacher_id)
            .filter(TimetableSlot.class_id == affected_slot.class_id).all()
        }
        eligible = [teacher for teacher in eligible if teacher.id in experienced_ids]

    scored = [score_candidate(db, c, leave, subject, dept_name) for c in eligible]
    # Prefer the home department whenever comparable candidates are available.
    for candidate in scored:
        if candidate.teacher.department_id == leave.teacher.department_id:
            candidate.score = min(100.0, candidate.score + 5)
            candidate.reasons.append("Same department")
        else:
            candidate.reasons.append("Cross-department cover")
    scored.sort(key=lambda c: c.score, reverse=True)
    return scored[:limit]



# ---------- Execution ----------

def create_assignment(
    db: Session, leave: LeaveRequest, substitute: User, assignment_type: AssignmentType,
    score: float | None, actor_id: int | None,
) -> AlterAssignment:
    assignment = AlterAssignment(
        leave_request_id=leave.id,
        substitute_teacher_id=substitute.id,
        assignment_type=assignment_type,
        compatibility_score=score,
    )
    db.add(assignment)

    apply_credit_change(
        teacher_id=leave.teacher_id, change=-1,
        reason=f"Leave on {leave.date} (Day Order {leave.day_order}) period {leave.period_number}",
        leave_id=leave.id, db=db, category="penalty",
    )
    apply_credit_change(
        teacher_id=substitute.id, change=+1,
        reason=f"Substitute for teacher {leave.teacher_id} on {leave.date} (Day Order {leave.day_order}) period {leave.period_number}",
        leave_id=leave.id, db=db, category="substitute_class",
    )

    log_audit_event(
        db, actor_id, f"substitution.{assignment_type.value}", "leave_request", leave.id,
        {"substitute_teacher_id": substitute.id, "compatibility_score": score},
    )

    notification_service.create_notification(
        db, substitute.id, title="You've been assigned a substitute class",
        body=f"Cover {leave.date} (Day Order {leave.day_order}, period {leave.period_number}) for a colleague's approved leave.",
        event_type="substitute_assigned", related_leave_id=leave.id,
    )
    notification_service.create_notification(
        db, leave.teacher_id, title="Substitute assigned",
        body=f"{substitute.name} will cover your leave on {leave.date} (Day Order {leave.day_order}, period {leave.period_number}).",
        event_type="substitute_assigned", related_leave_id=leave.id,
    )
    return assignment


def auto_process_approved_leave(db: Session, leave: LeaveRequest) -> AlterAssignment | None:
    """Called right after a leave is approved. Behavior depends on
    campus_operations_mode:
      - manual:     does nothing; admin assigns via the normal flow.
      - assisted:   does nothing here either — the ranked recommendation
                    list is generated on-demand when the admin opens the
                    assign-substitute panel (get_ranked_recommendations),
                    not pushed proactively. Kept simple: one fewer thing
                    that can race against an admin already mid-assignment.
      - autonomous: picks the top-ranked HARD-ELIGIBLE candidate (opted
                    in, under their cap) and assigns immediately, no
                    approval step.
    Returns the created assignment, or None if no eligible candidate
    exists / mode doesn't auto-execute."""
    dept_id = None
    if leave.teacher:
        dept_id = leave.teacher.department_id
    elif leave.teacher_id:
        t = db.query(User).filter(User.id == leave.teacher_id).first()
        if t:
            dept_id = t.department_id

    mode = get_mode(db, dept_id)
    if mode != "autonomous":
        return None

    subject, dept_name = _subject_and_department_for_leave(db, leave)
    eligible = list_eligible_candidates(db, leave, require_auto_opt_in=True)
    if not eligible:
        log_audit_event(db, None, "substitution.autonomous_no_candidate", "leave_request", leave.id, {})
        db.commit()
        return None

    scored = [score_candidate(db, c, leave, subject, dept_name) for c in eligible]
    scored.sort(key=lambda c: c.score, reverse=True)
    best = scored[0]

    assignment_type = AssignmentType.emergency if leave.is_emergency else AssignmentType.auto_assigned
    assignment = create_assignment(db, leave, best.teacher, assignment_type, best.score, actor_id=None)
    db.commit()
    db.refresh(assignment)
    return assignment


def mark_emergency_if_applicable(db: Session, leave: LeaveRequest) -> None:
    """Sets is_emergency=True if the leave's date falls inside the
    emergency window measured from submission time right now. Called once
    at submission (see leave_service.submit_leave) — the flag is a
    point-in-time judgment, not re-evaluated later. Approximates "how far
    away is this period" using the calendar date at midnight, since
    periods don't have wall-clock times in this schema; a same-day leave
    is always emergency regardless of the configured window."""
    hours_until = (datetime.combine(leave.date, datetime.min.time(), tzinfo=timezone.utc) - datetime.now(timezone.utc)).total_seconds() / 3600
    
    dept_id = None
    if leave.teacher:
        dept_id = leave.teacher.department_id
    elif leave.teacher_id:
        t = db.query(User).filter(User.id == leave.teacher_id).first()
        if t:
            dept_id = t.department_id

    window = get_emergency_window_hours(db, dept_id)
    leave.is_emergency = hours_until <= window



def _get_leave_or_404(db: Session, leave_id: int, tenant_department_id: int | None = None) -> LeaveRequest:
    leave = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")
    if tenant_department_id is not None:
        if leave.teacher.department_id != tenant_department_id:
            raise HTTPException(status_code=403, detail="Access denied to this leave request")
    return leave


def run_dry_run_simulation(db: Session, start_date, end_date, department_id: int | None = None) -> dict:
    from datetime import date, timedelta
    from app.models.leave import LeaveStatus, AlterAssignment
    from app.models.user import User, Role
    from app.models.timetable import TimetableSlot
    
    # 1. Fetch approved leaves in range
    query = db.query(LeaveRequest).filter(
        LeaveRequest.date >= start_date,
        LeaveRequest.date <= end_date,
        LeaveRequest.status == LeaveStatus.approved
    )
    if department_id is not None:
        query = query.join(User, LeaveRequest.teacher_id == User.id).filter(User.department_id == department_id)
        
    leaves = query.order_by(LeaveRequest.date, LeaveRequest.period_number).all()
    
    simulated_assignments = []
    simulated_successful = 0
    simulated_failed = 0
    estimated_credits = 0
    
    # Track simulated assignments in-memory: list of (date, period_number, substitute_teacher_id)
    in_memory_assignments = []
    
    for leave in leaves:
        # Check if there is already a real substitution in db for this leave
        real_sub = db.query(AlterAssignment).filter(AlterAssignment.leave_request_id == leave.id).first()
        if real_sub:
            simulated_assignments.append({
                "date": leave.date,
                "period_number": leave.period_number,
                "leave_teacher_name": leave.teacher.name if leave.teacher else f"Teacher #{leave.teacher_id}",
                "substitute_teacher_name": real_sub.substitute_teacher.name,
                "compatibility_score": real_sub.compatibility_score,
                "status": "success",
                "reason": "Existing assignment in database"
            })
            simulated_successful += 1
            continue

        # Find eligible candidates using simulated checks
        eligible_candidates = []
        
        # Fetch all active teachers
        teachers = db.query(User).filter(User.role == Role.teacher, User.is_active == True).all()
        
        for t in teachers:
            # 1. Not the leave teacher
            if t.id == leave.teacher_id:
                continue
                
            # 2. Not busy in timetable
            busy = db.query(TimetableSlot).filter(
                TimetableSlot.teacher_id == t.id,
                TimetableSlot.day_order == leave.day_order,
                TimetableSlot.period_number == leave.period_number
            ).first()
            if busy:
                continue
                
            # 3. Not on approved leave
            on_leave = db.query(LeaveRequest).filter(
                LeaveRequest.teacher_id == t.id,
                LeaveRequest.date == leave.date,
                LeaveRequest.period_number == leave.period_number,
                LeaveRequest.status == LeaveStatus.approved
            ).first()
            if on_leave:
                continue
                
            # 4. Not already subbing today (database check + in-memory check)
            already_subbing_db = db.query(AlterAssignment).join(LeaveRequest).filter(
                AlterAssignment.substitute_teacher_id == t.id,
                LeaveRequest.date == leave.date
            ).first()
            if already_subbing_db:
                continue
                
            already_subbing_mem = any(
                d == leave.date and tid == t.id
                for d, p, tid in in_memory_assignments
            )
            if already_subbing_mem:
                continue
                
            # 5. Check preferences
            pref = get_or_create_preferences(db, t.id)
            if not pref.accept_auto_assignments:
                continue
            if leave.is_emergency and not pref.allow_emergency_assignments:
                continue
                
            # 6. Check weekly cap (database check + in-memory check)
            if pref.max_weekly_substitutions is not None:
                seven_days_ago = leave.date - timedelta(days=7)
                # DB count
                db_count = db.query(AlterAssignment).join(LeaveRequest).filter(
                    AlterAssignment.substitute_teacher_id == t.id,
                    LeaveRequest.date >= seven_days_ago,
                    LeaveRequest.date < leave.date
                ).count()
                # Mem count
                mem_count = sum(
                    1 for d, p, tid in in_memory_assignments
                    if tid == t.id and d >= seven_days_ago and d < leave.date
                )
                if (db_count + mem_count) >= pref.max_weekly_substitutions:
                    continue
            
            eligible_candidates.append(t)
            
        if not eligible_candidates:
            simulated_assignments.append({
                "date": leave.date,
                "period_number": leave.period_number,
                "leave_teacher_name": leave.teacher.name if leave.teacher else f"Teacher #{leave.teacher_id}",
                "substitute_teacher_name": None,
                "compatibility_score": None,
                "status": "failed",
                "reason": "No eligible candidates"
            })
            simulated_failed += 1
            continue
            
        # Score and rank candidates
        subject, dept_name = _subject_and_department_for_leave(db, leave)
        scored_candidates = []
        for c in eligible_candidates:
            score_res = score_candidate(db, c, leave, subject, dept_name)
            scored_candidates.append((c, score_res.score))
            
        # Pick the best
        scored_candidates.sort(key=lambda x: x[1], reverse=True)
        best_candidate, best_score = scored_candidates[0]
        
        # Record simulated assignment
        in_memory_assignments.append((leave.date, leave.period_number, best_candidate.id))
        simulated_assignments.append({
            "date": leave.date,
            "period_number": leave.period_number,
            "leave_teacher_name": leave.teacher.name if leave.teacher else f"Teacher #{leave.teacher_id}",
            "substitute_teacher_name": best_candidate.name,
            "compatibility_score": best_score,
            "status": "success",
            "reason": f"Simulated assignment (score: {best_score})"
        })
        simulated_successful += 1
        estimated_credits += 1
        
    return {
        "leaves_processed": len(leaves),
        "simulated_successful_assignments": simulated_successful,
        "simulated_failed_assignments": simulated_failed,
        "estimated_credit_transactions": estimated_credits,
        "simulated_assignments": simulated_assignments
    }
