from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException

from app.models.timetable import TimetableSlot
from app.models.user import User
from app.models.class_ import Class
from app.schemas.timetable import TimetableSlotCreate


def _slot_summary(slot: TimetableSlot) -> dict:
    """Return safe, human-readable context for a conflicting booking."""
    class_name = "Unknown class"
    if slot.class_:
        class_name = f"{slot.class_.name}-{slot.class_.section}"
    return {
        "slot_id": slot.id,
        "teacher_id": slot.teacher_id,
        "teacher_name": slot.teacher.name if slot.teacher else "Unknown teacher",
        "class_id": slot.class_id,
        "class_name": class_name,
        "subject_id": slot.subject_id,
        "subject_name": slot.subject.name if slot.subject else "Assigned session",
        "room_id": slot.room_id,
        "room_name": slot.room.room_number if slot.room else "No room selected",
        "day_order": slot.day_order,
        "period_number": slot.period_number,
    }


def _raise_conflict(conflict_type: str, existing: TimetableSlot, requested: TimetableSlotCreate) -> None:
    labels = {
        "teacher": ("Teacher already scheduled", "This teacher is already teaching another class at this time.", "Choose a different teacher, day order, or period."),
        "class": ("Class already scheduled", "This class already has a session at this time.", "Choose a different class, day order, or period."),
        "room": ("Room already booked", "This room is already being used for another session at this time.", "Choose a different room, day order, or period."),
    }
    title, reason, resolution = labels[conflict_type]
    raise HTTPException(
        status_code=409,
        detail={
            "code": "TIMETABLE_CONFLICT",
            "conflict_type": conflict_type,
            "title": title,
            "reason": reason,
            "resolution": resolution,
            "requested": requested.model_dump(),
            "existing": _slot_summary(existing),
        },
    )


def _check_conflicts(db: Session, slot: TimetableSlotCreate, exclude_id: int | None = None) -> None:
    """Mirrors the three DB-level UNIQUE constraints with a friendly,
    specific 409 message identifying exactly which resource conflicts —
    the DB constraint alone would just raise a generic IntegrityError."""
    from sqlalchemy.orm import joinedload
    q = db.query(TimetableSlot).options(
        joinedload(TimetableSlot.teacher),
        joinedload(TimetableSlot.class_),
        joinedload(TimetableSlot.subject),
        joinedload(TimetableSlot.room),
    ).filter(
        TimetableSlot.day_order == slot.day_order,
        TimetableSlot.period_number == slot.period_number,
    )
    if exclude_id:
        q = q.filter(TimetableSlot.id != exclude_id)

    teacher_conflict = q.filter(TimetableSlot.teacher_id == slot.teacher_id).first()
    if teacher_conflict:
        _raise_conflict("teacher", teacher_conflict, slot)

    class_conflict = q.filter(TimetableSlot.class_id == slot.class_id).first()
    if class_conflict:
        _raise_conflict("class", class_conflict, slot)

    if slot.room_id is not None:
        room_conflict = q.filter(TimetableSlot.room_id == slot.room_id).first()
        if room_conflict:
            _raise_conflict("room", room_conflict, slot)



def create_slot(data: TimetableSlotCreate, db: Session, tenant_department_id: int | None = None) -> TimetableSlot:
    # Classes are global. An HOD may schedule an active teacher from another
    # department on a global class; the normal teacher/class/room conflict
    # constraints still apply below.
    teacher = db.query(User).filter(User.id == data.teacher_id, User.role == "teacher", User.is_active == True).first()  # noqa: E712
    if not teacher:
        raise HTTPException(status_code=404, detail="Active teacher not found")
    if not db.query(Class).filter(Class.id == data.class_id).first():
        raise HTTPException(status_code=404, detail="Class not found")

    _check_conflicts(db, data)
    slot = TimetableSlot(**data.model_dump())
    db.add(slot)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Conflicting timetable slot (teacher, class, or room already booked)")
    db.refresh(slot)
    return slot


def bulk_upload(slots_data: list[TimetableSlotCreate], db: Session, tenant_department_id: int | None = None) -> list[TimetableSlot]:
    """All-or-nothing: validates every slot for conflicts (against both
    the DB and each other within the same batch) before inserting any of
    them."""
    for slot in slots_data:
        teacher = db.query(User).filter(User.id == slot.teacher_id, User.role == "teacher", User.is_active == True).first()  # noqa: E712
        if not teacher:
            raise HTTPException(status_code=404, detail="Active teacher not found")
        if not db.query(Class).filter(Class.id == slot.class_id).first():
            raise HTTPException(status_code=404, detail="Class not found")

    seen_teacher_keys = set()
    seen_class_keys = set()
    seen_room_keys = set()

    for slot in slots_data:
        _check_conflicts(db, slot)

        t_key = (slot.teacher_id, slot.day_order, slot.period_number)
        c_key = (slot.class_id, slot.day_order, slot.period_number)
        r_key = (slot.room_id, slot.day_order, slot.period_number) if slot.room_id else None

        if t_key in seen_teacher_keys:
            raise HTTPException(status_code=409, detail=f"Duplicate teacher booking within this upload for Day Order {slot.day_order}, Period {slot.period_number}")
        if c_key in seen_class_keys:
            raise HTTPException(status_code=409, detail=f"Duplicate class booking within this upload for Day Order {slot.day_order}, Period {slot.period_number}")
        if r_key and r_key in seen_room_keys:
            raise HTTPException(status_code=409, detail=f"Duplicate room booking within this upload for Day Order {slot.day_order}, Period {slot.period_number}")

        seen_teacher_keys.add(t_key)
        seen_class_keys.add(c_key)
        if r_key:
            seen_room_keys.add(r_key)

    slots = [TimetableSlot(**s.model_dump()) for s in slots_data]
    db.add_all(slots)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Conflicting timetable slot detected during save — no slots were saved")
    for s in slots:
        db.refresh(s)
    return slots


def get_by_teacher(teacher_id: int, db: Session, tenant_department_id: int | None = None) -> list[TimetableSlot]:
    if tenant_department_id is not None:
        teacher = db.query(User).filter(User.id == teacher_id).first()
        if not teacher or teacher.department_id != tenant_department_id:
            raise HTTPException(status_code=403, detail="Access denied")
    return db.query(TimetableSlot).filter(TimetableSlot.teacher_id == teacher_id).order_by(TimetableSlot.day_order, TimetableSlot.period_number).all()


def get_by_class(class_id: int, db: Session, tenant_department_id: int | None = None) -> list[TimetableSlot]:
    if not db.query(Class).filter(Class.id == class_id).first():
        raise HTTPException(status_code=404, detail="Class not found")
    return db.query(TimetableSlot).filter(TimetableSlot.class_id == class_id).order_by(TimetableSlot.day_order, TimetableSlot.period_number).all()


def delete_slot(slot_id: int, db: Session, tenant_department_id: int | None = None) -> None:
    slot = db.query(TimetableSlot).filter(TimetableSlot.id == slot_id).first()
    if slot:
        if tenant_department_id is not None and slot.class_.department_id != tenant_department_id:
            raise HTTPException(status_code=403, detail="Access denied")
        db.delete(slot)
        db.commit()


def delete_by_teacher(teacher_id: int, db: Session, tenant_department_id: int | None = None) -> None:
    if tenant_department_id is not None:
        teacher = db.query(User).filter(User.id == teacher_id).first()
        if not teacher or teacher.department_id != tenant_department_id:
            raise HTTPException(status_code=403, detail="Access denied")
    db.query(TimetableSlot).filter(TimetableSlot.teacher_id == teacher_id).delete()
    db.commit()
