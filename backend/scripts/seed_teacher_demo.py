import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.department import Department
from app.models.user import User, Role
from app.models.subject import Subject, SubjectType
from app.models.class_ import Class
from app.models.room import Room, RoomType
from app.models.timetable import TimetableSlot
from app.models.credit import TeacherCredit, CreditTransaction
from app.models.system_setting import SystemSetting
from app.core.security import hash_password

def seed_teacher_demo():
    db = SessionLocal()
    try:
        # 1. Ensure CSE Department exists
        dept = db.query(Department).filter(Department.name.ilike("%Computer Science%")).first()
        if not dept:
            dept = Department(name="Computer Science & Engineering", code="CSE")
            db.add(dept)
            db.commit()
            db.refresh(dept)
        print(f"Using Department: {dept.name} (ID: {dept.id})")

        # 2. Enable teacher self management setting for this department
        setting = db.query(SystemSetting).filter(
            SystemSetting.key == "teacher_self_management_enabled",
            SystemSetting.department_id == dept.id
        ).first()
        if not setting:
            setting = SystemSetting(
                key="teacher_self_management_enabled",
                value="true",
                department_id=dept.id
            )
            db.add(setting)
        else:
            setting.value = "true"
        db.commit()
        print("Enabled teacher self-management mode for CSE.")

        # 3. Ensure Classes
        classes = {}
        for c_name, sec, sem in [("II CSE-A", "A", 3), ("II CSE-B", "B", 3), ("III CSE-A", "A", 5)]:
            cls = db.query(Class).filter(Class.name == c_name, Class.department_id == dept.id).first()
            if not cls:
                cls = Class(name=c_name, section=sec, semester=sem, department_id=dept.id)
                db.add(cls)
                db.commit()
                db.refresh(cls)
            classes[c_name] = cls

        # 4. Ensure Subjects
        subjects = {}
        sub_defs = [
            ("CS201", "Data Structures", SubjectType.theory, 4, 3),
            ("CS204", "Operating Systems", SubjectType.theory, 3, 3),
            ("CS302", "Database Management Systems", SubjectType.theory, 4, 5),
            ("CS202", "Object Oriented Programming", SubjectType.theory, 3, 3),
            ("CS305", "Computer Networks", SubjectType.theory, 3, 5),
        ]
        for code, name, stype, creds, sem in sub_defs:
            subj = db.query(Subject).filter(Subject.code == code, Subject.department_id == dept.id).first()
            if not subj:
                subj = Subject(code=code, name=name, subject_type=stype, credits=creds, semester=sem, department_id=dept.id)
                db.add(subj)
                db.commit()
                db.refresh(subj)
            subjects[code] = subj

        # 5. Ensure Rooms
        rooms = {}
        for r_num in ["Room 101", "Room 102", "Room 201", "Lab 1"]:
            room = db.query(Room).filter(Room.room_number == r_num).first()
            if not room:
                room = Room(room_number=r_num, room_type=RoomType.classroom if "Room" in r_num else RoomType.lab, capacity=60)
                db.add(room)
                db.commit()
                db.refresh(room)
            rooms[r_num] = room

        pwd_hash = hash_password("Password123")

        # 6. Create / Update Dr. Arun Kumar
        arun = db.query(User).filter(User.email == "teacher_cse_1@example.com").first()
        if not arun:
            arun = db.query(User).filter(User.email == "arun.kumar@college.edu").first()
        if not arun:
            arun = User(
                name="Dr. Arun Kumar",
                email="teacher_cse_1@example.com",
                password_hash=pwd_hash,
                role=Role.teacher,
                department_id=dept.id,
                must_change_credentials=False,
                is_active=True
            )
            db.add(arun)
            db.commit()
            db.refresh(arun)
        else:
            arun.name = "Dr. Arun Kumar"
            arun.email = "teacher_cse_1@example.com"
            arun.password_hash = pwd_hash
            arun.department_id = dept.id
            arun.must_change_credentials = False
            arun.is_active = True
            db.commit()

        # Set Arun's Credit Balance to +5
        cred = db.query(TeacherCredit).filter(TeacherCredit.teacher_id == arun.id).first()
        if not cred:
            cred = TeacherCredit(teacher_id=arun.id, balance=5)
            db.add(cred)
        else:
            cred.balance = 5
        db.commit()

        # Seed initial transaction history if empty
        tx_count = db.query(CreditTransaction).filter(CreditTransaction.teacher_id == arun.id).count()
        if tx_count == 0:
            db.add(CreditTransaction(
                teacher_id=arun.id,
                change=3,
                reason="Substitution coverage bonus: 3 periods handled for colleague",
                category="substitute_class"
            ))
            db.add(CreditTransaction(
                teacher_id=arun.id,
                change=2,
                reason="Substitution coverage bonus: 2 periods handled for II CSE-B",
                category="substitute_class"
            ))
            db.commit()

        # 7. Create Colleague Teachers for substitution
        priya = db.query(User).filter(User.email == "priya.s@college.edu").first()
        if not priya:
            priya = User(
                name="Dr. Priya S.",
                email="priya.s@college.edu",
                password_hash=pwd_hash,
                role=Role.teacher,
                department_id=dept.id,
                must_change_credentials=False,
                is_active=True
            )
            db.add(priya)
            db.commit()
            db.refresh(priya)
            db.add(TeacherCredit(teacher_id=priya.id, balance=3))
            db.commit()

        kumar = db.query(User).filter(User.email == "kumar.r@college.edu").first()
        if not kumar:
            kumar = User(
                name="Mr. R. Kumar",
                email="kumar.r@college.edu",
                password_hash=pwd_hash,
                role=Role.teacher,
                department_id=dept.id,
                must_change_credentials=False,
                is_active=True
            )
            db.add(kumar)
            db.commit()
            db.refresh(kumar)
            db.add(TeacherCredit(teacher_id=kumar.id, balance=2))
            db.commit()

        divya = db.query(User).filter(User.email == "divya.m@college.edu").first()
        if not divya:
            divya = User(
                name="Ms. Divya M.",
                email="divya.m@college.edu",
                password_hash=pwd_hash,
                role=Role.teacher,
                department_id=dept.id,
                must_change_credentials=False,
                is_active=True
            )
            db.add(divya)
            db.commit()
            db.refresh(divya)
            db.add(TeacherCredit(teacher_id=divya.id, balance=4))
            db.commit()

        # 8. Clear and setup clean timetable slots for Dr. Arun Kumar
        db.query(TimetableSlot).filter(TimetableSlot.teacher_id == arun.id).delete()
        db.commit()

        # Slot layout for Dr. Arun Kumar across Day Orders
        # DO 2: P2 (Data Structures - II CSE-A), P4 (Operating Systems - II CSE-B)
        arun_slots = [
            (1, 1, subjects["CS201"].id, classes["II CSE-A"].id, rooms["Room 101"].id),
            (1, 3, subjects["CS302"].id, classes["III CSE-A"].id, rooms["Room 201"].id),
            (2, 2, subjects["CS201"].id, classes["II CSE-A"].id, rooms["Room 101"].id),
            (2, 4, subjects["CS204"].id, classes["II CSE-B"].id, rooms["Room 102"].id),
            (3, 1, subjects["CS204"].id, classes["II CSE-B"].id, rooms["Room 102"].id),
            (3, 4, subjects["CS302"].id, classes["III CSE-A"].id, rooms["Room 201"].id),
            (4, 2, subjects["CS201"].id, classes["II CSE-A"].id, rooms["Room 101"].id),
            (4, 5, subjects["CS302"].id, classes["III CSE-A"].id, rooms["Room 201"].id),
            (5, 3, subjects["CS204"].id, classes["II CSE-B"].id, rooms["Room 102"].id),
        ]
        for day, per, sid, cid, rid in arun_slots:
            db.add(TimetableSlot(
                teacher_id=arun.id,
                day_order=day,
                period_number=per,
                subject_id=sid,
                class_id=cid,
                room_id=rid
            ))
        db.commit()

        # Ensure Dr. Priya teaches same subject CS201/CS204 on different periods so recommendation scoring is high (>90%)
        db.query(TimetableSlot).filter(TimetableSlot.teacher_id == priya.id).delete()
        priya_slots = [
            (2, 1, subjects["CS201"].id, classes["II CSE-B"].id, rooms["Room 102"].id),
            (2, 3, subjects["CS202"].id, classes["II CSE-A"].id, rooms["Room 101"].id),
            (2, 5, subjects["CS201"].id, classes["II CSE-A"].id, rooms["Room 101"].id),
        ]
        for day, per, sid, cid, rid in priya_slots:
            db.add(TimetableSlot(
                teacher_id=priya.id,
                day_order=day,
                period_number=per,
                subject_id=sid,
                class_id=cid,
                room_id=rid
            ))
        db.commit()

        print("Successfully configured demo database!")
        print(f"Teacher: {arun.name} | Email: {arun.email} | Password: Password123")
        print(f"Credit Balance: +{cred.balance}")
        print(f"Timetable Slots created: {len(arun_slots)}")

    except Exception as e:
        db.rollback()
        print(f"Error seeding demo data: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_teacher_demo()
