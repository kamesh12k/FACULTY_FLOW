from sqlalchemy.orm import Session

from app.models.credit import TeacherCredit, CreditTransaction
from app.models.user import User, Role
from app.models.timetable import TimetableSlot
from app.models.day_order_calendar import CalendarDay, DayType
from app.schemas.credit import CreditReportEntry
from app.schemas.academic_calendar import FacultyWorkloadReportEntry


def apply_credit_change(
    teacher_id: int,
    change: int,
    reason: str,
    leave_id: int | None,
    db: Session,
    category: str = "other",
) -> None:
    """Atomically update balance and record the transaction. Callers
    (leave_service.assign_substitute) are responsible for having already
    verified the leave's date is a working day — credit changes never
    happen for leaves on holidays, because such leaves are rejected at
    submission time (see leave_service.submit_leave)."""
    credit = db.query(TeacherCredit).filter(TeacherCredit.teacher_id == teacher_id).first()
    if not credit:
        credit = TeacherCredit(teacher_id=teacher_id, balance=0)
        db.add(credit)

    credit.balance += change

    transaction = CreditTransaction(
        teacher_id=teacher_id,
        change=change,
        reason=reason,
        category=category,
        related_leave_id=leave_id,
    )
    db.add(transaction)
    # Caller is responsible for db.commit()



def get_balance(teacher_id: int, db: Session) -> int:
    credit = db.query(TeacherCredit).filter(TeacherCredit.teacher_id == teacher_id).first()
    return credit.balance if credit else 0


def get_transactions(teacher_id: int, db: Session) -> list[CreditTransaction]:
    return (
        db.query(CreditTransaction)
        .filter(CreditTransaction.teacher_id == teacher_id)
        .order_by(CreditTransaction.created_at.desc())
        .all()
    )


def get_all_transactions(db: Session, tenant_department_id: int | None = None) -> list[CreditTransaction]:
    query = db.query(CreditTransaction)
    if tenant_department_id is not None:
        query = query.join(User, CreditTransaction.teacher_id == User.id).filter(User.department_id == tenant_department_id)
    return query.order_by(CreditTransaction.created_at.desc()).all()


def get_credit_report(db: Session, tenant_department_id: int | None = None) -> list[CreditReportEntry]:
    query = db.query(User, TeacherCredit).join(TeacherCredit, TeacherCredit.teacher_id == User.id)
    if tenant_department_id is not None:
        query = query.filter(User.department_id == tenant_department_id)
    rows = query.all()
    return [
        CreditReportEntry(
            teacher_id=u.id,
            name=u.name,
            department=u.department,
            balance=c.balance,
        )
        for u, c in rows
    ]


def get_faculty_workload_report(db: Session, tenant_department_id: int | None = None) -> list[FacultyWorkloadReportEntry]:
    """Per-spec: 'Faculty Workload Reports excluding Holidays'. Workload is
    computed as: for each teacher, count timetable_slots (their normal
    periods) but only for (day_order) values that currently correspond to
    at least one *working* CalendarDay — i.e. a day_order that has been
    fully retired to holiday/exam/etc. everywhere it occurs contributes
    zero. Since timetable_slots are keyed by day_order (not raw date), this
    is the correct exclusion: a day_order's periods count once per actual
    working occurrence in the calendar, not once per the abstract slot.
    """
    working_day_orders_count: dict[int, int] = {}
    working_days = db.query(CalendarDay).filter(CalendarDay.day_type == DayType.working).all()
    for day in working_days:
        if day.day_order is not None:
            working_day_orders_count[day.day_order] = working_day_orders_count.get(day.day_order, 0) + 1

    query = db.query(User).filter(User.role == Role.teacher)
    if tenant_department_id is not None:
        query = query.filter(User.department_id == tenant_department_id)
    teachers = query.all()
    report = []
    for teacher in teachers:
        slots = db.query(TimetableSlot).filter(TimetableSlot.teacher_id == teacher.id).all()
        total_periods = 0
        working_days_counted = 0
        for slot in slots:
            occurrences = working_day_orders_count.get(slot.day_order, 0)
            total_periods += occurrences
            working_days_counted += occurrences

        balance = get_balance(teacher.id, db)
        report.append(
            FacultyWorkloadReportEntry(
                teacher_id=teacher.id,
                name=teacher.name,
                department=teacher.department,
                total_periods=total_periods,
                working_days_counted=working_days_counted,
                credit_balance=balance,
            )
        )
    return report

