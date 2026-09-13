import os
import sys
from datetime import datetime

# Add backend directory to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend'))
sys.path.insert(0, backend_dir)

from app.database import SessionLocal
from app.models import User, TimetableSlot, Subject, Class, Room, TeacherCredit, CalendarDay, Department, Role, LeaveRequest, AlterAssignment
from app.core.security import hash_password

def reset_demo_state():
    db = SessionLocal()
    try:
        print("[RESET] Resetting FAFLOW Demo Data for PC & Android Recording Flow...")
        
        # 1. Department
        cse = db.query(Department).filter(Department.code == 'CSE').first()
        if not cse:
            cse = Department(name="Computer Science & Engineering", code="CSE")
            db.add(cse)
            db.commit()
            db.refresh(cse)

        # 2. Primary Teacher: Dr. Arun Kumar
        pwd = hash_password('Password123')
        primary = db.query(User).filter(User.email == 'teacher_cse_1@example.com').first()
        if not primary:
            primary = User(
                name='Dr. Arun Kumar',
                email='teacher_cse_1@example.com',
                password_hash=pwd,
                role=Role.teacher,
                department_id=cse.id,
                is_active=True,
                must_change_credentials=False
            )
            db.add(primary)
            db.commit()
            db.refresh(primary)
        else:
            primary.name = 'Dr. Arun Kumar'
            primary.password_hash = pwd
            primary.department_id = cse.id
            primary.must_change_credentials = False
            primary.is_active = True
            db.commit()

        # Primary Credits: 5
        cred = db.query(TeacherCredit).filter(TeacherCredit.teacher_id == primary.id).first()
        if not cred:
            cred = TeacherCredit(teacher_id=primary.id, balance=5)
            db.add(cred)
        else:
            cred.balance = 5
        db.commit()

        # 3. Substitute Teachers
        subs_data = [
            ('Dr. Priya Sharma', 'priya.sharma@college.edu'),
            ('Mr. Karthik Raj', 'karthik.raj@college.edu'),
            ('Ms. Divya Raman', 'divya.raman@college.edu')
        ]
        for name, email in subs_data:
            u = db.query(User).filter(User.email == email).first()
            if not u:
                u = User(
                    name=name,
                    email=email,
                    password_hash=pwd,
                    role=Role.teacher,
                    department_id=cse.id,
                    is_active=True,
                    must_change_credentials=False
                )
                db.add(u)
                db.commit()
                db.refresh(u)
                db.add(TeacherCredit(teacher_id=u.id, balance=3))
                db.commit()
            else:
                u.name = name
                u.password_hash = pwd
                u.department_id = cse.id
                u.is_active = True
                u.must_change_credentials = False
                db.commit()

        # 4. Subjects, Classes & Rooms
        ds_subj = db.query(Subject).filter(Subject.name == 'Data Structures').first()
        os_subj = db.query(Subject).filter(Subject.name == 'Operating Systems').first()
        db_subj = db.query(Subject).filter(Subject.name == 'Database Management Systems').first()

        c_2csea = db.query(Class).filter(Class.name == 'II CSE-A').first()
        if not c_2csea:
            c_2csea = Class(name='II CSE-A', section='A', department_id=cse.id, semester=3)
            db.add(c_2csea); db.commit(); db.refresh(c_2csea)

        c_3cseb = db.query(Class).filter(Class.name == 'III CSE-B').first()
        if not c_3cseb:
            c_3cseb = Class(name='III CSE-B', section='B', department_id=cse.id, semester=5)
            db.add(c_3cseb); db.commit(); db.refresh(c_3cseb)

        c_2cseb = db.query(Class).filter(Class.name == 'II CSE-B').first()
        if not c_2cseb:
            c_2cseb = Class(name='II CSE-B', section='B', department_id=cse.id, semester=3)
            db.add(c_2cseb); db.commit(); db.refresh(c_2cseb)

        r101 = db.query(Room).filter(Room.room_number == 'Room 101').first()
        r102 = db.query(Room).filter(Room.room_number == 'Room 102').first()
        r103 = db.query(Room).filter(Room.room_number == 'Room 103').first()

        # Re-assign Day Order 2 slots for Dr. Arun Kumar: P1, P3, P5
        db.query(TimetableSlot).filter(TimetableSlot.teacher_id == primary.id, TimetableSlot.day_order == 2).delete()
        db.commit()

        s1 = TimetableSlot(teacher_id=primary.id, subject_id=ds_subj.id, class_id=c_2csea.id, room_id=r101.id, day_order=2, period_number=1)
        s3 = TimetableSlot(teacher_id=primary.id, subject_id=os_subj.id, class_id=c_3cseb.id, room_id=r102.id, day_order=2, period_number=3)
        s5 = TimetableSlot(teacher_id=primary.id, subject_id=db_subj.id, class_id=c_2cseb.id, room_id=r103.id, day_order=2, period_number=5)
        db.add_all([s1, s3, s5])
        db.commit()

        # 5. Calendar Day 2026-09-10 & Today
        for d_str in ['2026-09-01', '2026-09-10']:
            dt = datetime.strptime(d_str, '%Y-%m-%d').date()
            cal = db.query(CalendarDay).filter(CalendarDay.date == dt).first()
            if not cal:
                cal = CalendarDay(date=dt, day_order=2, day_type='working', notes='Day Order 2 Working Day')
                db.add(cal)
            else:
                cal.day_order = 2
                cal.day_type = 'working'
            db.commit()

        # 6. Clean up any existing leaves for 2026-09-10 to keep state fresh
        target_date = datetime.strptime('2026-09-10', '%Y-%m-%d').date()
        old_leaves = db.query(LeaveRequest).filter(LeaveRequest.teacher_id == primary.id, LeaveRequest.date == target_date).all()
        for ol in old_leaves:
            db.delete(ol)
        db.commit()

        print("[SUCCESS] Demo environment data reset complete!")
        print("   - Primary Teacher: Dr. Arun Kumar (teacher_cse_1@example.com / Password123) with +5 Credits")
        print("   - Day Order 2 Slots: P1 (II CSE-A), P3 (III CSE-B), P5 (II CSE-B)")
        print("   - Target Date 2026-09-10: Working Day · Day Order 2")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error resetting demo state: {e}")
    finally:
        db.close()

if __name__ == '__main__':
    reset_demo_state()
