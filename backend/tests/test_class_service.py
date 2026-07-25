"""Tests for app.services.class_service."""
import pytest
from fastapi import HTTPException

from app.services.class_service import list_classes, create_class, update_class, delete_class
from app.schemas.class_ import ClassCreate, ClassUpdate
from tests.conftest import create_department, create_class as factory_class, create_timetable_slot, create_subject, _make_user


class TestClassService:
    def test_list_empty(self, db_session):
        assert list_classes(db_session) == []

    def test_create_and_list(self, db_session):
        dept = create_department(db_session)
        data = ClassCreate(name="CSE", section="A", department_id=dept.id, semester=1)
        cls = create_class(data, db_session)
        assert cls.name == "CSE"
        assert len(list_classes(db_session)) == 1

    def test_duplicate(self, db_session):
        dept = create_department(db_session)
        data = ClassCreate(name="CSE", section="A", department_id=dept.id, semester=1)
        create_class(data, db_session)
        with pytest.raises(HTTPException) as exc:
            create_class(data, db_session)
        assert exc.value.status_code == 400

    def test_update(self, db_session):
        dept = create_department(db_session)
        cls = factory_class(db_session, department_id=dept.id)
        data = ClassUpdate(name="Updated")
        result = update_class(cls.id, data, db_session)
        assert result.name == "Updated"

    def test_update_not_found(self, db_session):
        with pytest.raises(HTTPException) as exc:
            update_class(999, ClassUpdate(name="X"), db_session)
        assert exc.value.status_code == 404

    def test_delete(self, db_session):
        dept = create_department(db_session)
        cls = factory_class(db_session, department_id=dept.id)
        delete_class(cls.id, db_session)
        assert list_classes(db_session) == []

    def test_delete_not_found(self, db_session):
        with pytest.raises(HTTPException) as exc:
            delete_class(999, db_session)
        assert exc.value.status_code == 404

    def test_delete_in_use(self, db_session):
        dept = create_department(db_session)
        subj = create_subject(db_session, department_id=dept.id)
        cls = factory_class(db_session, department_id=dept.id)
        teacher = _make_user(db_session, email="tt@test.com")
        create_timetable_slot(db_session, teacher.id, subj.id, cls.id)
        with pytest.raises(HTTPException) as exc:
            delete_class(cls.id, db_session)
        assert exc.value.status_code == 400
