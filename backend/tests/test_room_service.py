"""Tests for app.services.room_service."""
import pytest
from fastapi import HTTPException

from app.services.room_service import (
    list_rooms, create_room, update_room, delete_room,
    check_room_availability, availability_dashboard,
)
from app.schemas.room import RoomCreate, RoomUpdate
from tests.conftest import (
    create_department, create_subject, create_class, create_room as factory_room,
    create_timetable_slot, _make_user,
)


class TestRoomService:
    def test_list_empty(self, db_session):
        assert list_rooms(db_session) == []

    def test_create_and_list(self, db_session):
        data = RoomCreate(room_number="R1", capacity=60)
        room = create_room(data, db_session)
        assert room.room_number == "R1"
        assert len(list_rooms(db_session)) == 1

    def test_duplicate_number(self, db_session):
        factory_room(db_session, room_number="R1")
        data = RoomCreate(room_number="R1", capacity=30)
        with pytest.raises(HTTPException) as exc:
            create_room(data, db_session)
        assert exc.value.status_code == 400

    def test_update(self, db_session):
        room = factory_room(db_session)
        result = update_room(room.id, RoomUpdate(capacity=100), db_session)
        assert result.capacity == 100

    def test_update_not_found(self, db_session):
        with pytest.raises(HTTPException) as exc:
            update_room(999, RoomUpdate(capacity=1), db_session)
        assert exc.value.status_code == 404

    def test_delete(self, db_session):
        room = factory_room(db_session)
        delete_room(room.id, db_session)
        assert list_rooms(db_session) == []

    def test_delete_not_found(self, db_session):
        with pytest.raises(HTTPException) as exc:
            delete_room(999, db_session)
        assert exc.value.status_code == 404

    def test_delete_in_use(self, db_session):
        dept = create_department(db_session)
        subj = create_subject(db_session, department_id=dept.id)
        cls = create_class(db_session, department_id=dept.id)
        room = factory_room(db_session)
        teacher = _make_user(db_session, email="rm@test.com")
        create_timetable_slot(db_session, teacher.id, subj.id, cls.id, room_id=room.id)
        with pytest.raises(HTTPException) as exc:
            delete_room(room.id, db_session)
        assert exc.value.status_code == 400


class TestRoomAvailability:
    def test_available(self, db_session):
        room = factory_room(db_session)
        assert check_room_availability(room.id, 1, 1, db_session) is True

    def test_not_available(self, db_session):
        dept = create_department(db_session)
        subj = create_subject(db_session, department_id=dept.id)
        cls = create_class(db_session, department_id=dept.id)
        room = factory_room(db_session)
        teacher = _make_user(db_session, email="avail@test.com")
        create_timetable_slot(db_session, teacher.id, subj.id, cls.id, room_id=room.id)
        assert check_room_availability(room.id, 1, 1, db_session) is False

    def test_dashboard(self, db_session):
        room1 = factory_room(db_session, room_number="R1")
        room2 = factory_room(db_session, room_number="R2")
        result = availability_dashboard(1, 1, db_session)
        assert len(result) == 2
        assert all(r.is_available for r in result)
