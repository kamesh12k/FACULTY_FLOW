from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.room import Room
from app.models.timetable import TimetableSlot
from app.schemas.room import RoomCreate, RoomUpdate, RoomAvailabilityOut


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
    in_use = db.query(TimetableSlot).filter(TimetableSlot.room_id == room_id).first()
    if in_use:
        raise HTTPException(status_code=400, detail="Cannot delete a room that has timetable slots assigned")
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
