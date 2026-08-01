from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.room import Room
from app.models.timetable import TimetableSlot
from app.schemas.room import RoomCreate, RoomUpdate, RoomAvailabilityOut, BulkRoomCreate, BulkRoomCreateOut


def list_rooms(db: Session, room_type: str | None = None) -> list[Room]:
    q = db.query(Room)
    if room_type:
        q = q.filter(Room.room_type == room_type)
    return q.order_by(Room.room_number).all()


def create_room(data: RoomCreate, db: Session) -> Room:
    if db.query(Room).filter(Room.room_number == data.room_number).first():
        raise HTTPException(status_code=400, detail="A room with that number already exists")
    room = Room(**data.model_dump())
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


def bulk_create_rooms(data: BulkRoomCreate, db: Session) -> BulkRoomCreateOut:
    if data.end_num < data.start_num:
        raise HTTPException(status_code=400, detail="End number must be greater than or equal to start number")
    if (data.end_num - data.start_num + 1) > 200:
        raise HTTPException(status_code=400, detail="Cannot create more than 200 rooms in a single request")

    existing_room_numbers = {
        r.room_number for r in db.query(Room.room_number).all()
    }

    created_count = 0
    skipped_count = 0

    for num in range(data.start_num, data.end_num + 1):
        if data.pad_digits > 0:
            formatted_num = f"{num:0{data.pad_digits}d}"
        else:
            formatted_num = str(num)
        room_num = f"{data.prefix}{formatted_num}"

        if room_num in existing_room_numbers:
            skipped_count += 1
            continue

        room = Room(
            room_number=room_num,
            room_type=data.room_type,
            capacity=data.capacity,
            department_id=data.department_id,
        )
        db.add(room)
        existing_room_numbers.add(room_num)
        created_count += 1

    db.commit()
    return BulkRoomCreateOut(
        created_count=created_count,
        skipped_count=skipped_count,
        message=f"Created {created_count} room(s) successfully. Skipped {skipped_count} existing room(s)."
    )



def update_room(room_id: int, data: RoomUpdate, db: Session) -> Room:
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(room, key, value)
    db.commit()
    db.refresh(room)
    return room


def delete_room(room_id: int, db: Session) -> None:
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    from app.models.timetable_submission import TimetableSubmission
    db.query(TimetableSlot).filter(TimetableSlot.room_id == room_id).update({"room_id": None}, synchronize_session=False)
    db.query(TimetableSubmission).filter(TimetableSubmission.room_id == room_id).update({"room_id": None}, synchronize_session=False)
    db.delete(room)
    db.commit()


def check_room_availability(room_id: int, day_order: int, period_number: int, db: Session) -> bool:
    booking = (
        db.query(TimetableSlot)
        .filter(
            TimetableSlot.room_id == room_id,
            TimetableSlot.day_order == day_order,
            TimetableSlot.period_number == period_number,
        )
        .first()
    )
    return booking is None


def availability_dashboard(day_order: int, period_number: int, db: Session) -> list[RoomAvailabilityOut]:
    rooms = db.query(Room).order_by(Room.room_number).all()
    booked_room_ids = {
        r_id for (r_id,) in db.query(TimetableSlot.room_id).filter(
            TimetableSlot.day_order == day_order,
            TimetableSlot.period_number == period_number,
            TimetableSlot.room_id.isnot(None),
        ).all()
    }
    return [
        RoomAvailabilityOut(
            room_id=room.id,
            room_number=room.room_number,
            room_type=room.room_type,
            is_available=room.id not in booked_room_ids,
        )
        for room in rooms
    ]
