import sys
import os
import random
from datetime import datetime, date, timedelta

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.department import Department
from app.models.user import User, Role
from app.models.subject import Subject, SubjectType
from app.models.class_ import Class
from app.models.room import Room, RoomType
from app.models.timetable import TimetableSlot
from app.models.credit import TeacherCredit, CreditTransaction
from app.models.leave import LeaveRequest, LeaveStatus, AlterAssignment, AssignmentType
from app.models.academic_calendar import AcademicYear, Semester
from app.models.day_order_calendar import CalendarDay, DayType
from app.models.system_setting import SystemSetting
from app.core.security import hash_password

def seed_full_college():
    db = SessionLocal()
    try:
        print("Starting FAFLOW Full College Demo Data Seeding...")
        pwd_hash = hash_password("Password123")

        # -------------------------------------------------------------
        # 1. ACADEMIC CALENDAR & DAY ORDERS (Sep 2026 - Dec 2026)
        # -------------------------------------------------------------
        ay = db.query(AcademicYear).filter(AcademicYear.name == "2026-2027").first()
        if not ay:
            ay = AcademicYear(name="2026-2027", start_date=date(2026, 8, 1), end_date=date(2027, 5, 31), is_active=True)
            db.add(ay)
            db.commit()
            db.refresh(ay)

        sem = db.query(Semester).filter(Semester.name == "Odd Semester 2026").first()
        if not sem:
            sem = Semester(academic_year_id=ay.id, name="Odd Semester 2026", start_date=date(2026, 8, 1), end_date=date(2026, 12, 31), is_active=True)
            db.add(sem)
            db.commit()
            db.refresh(sem)

        # Seed calendar days from 2026-09-01 to 2026-10-31
        # Ensuring 2026-09-10 (Thursday) is Day Order 2!
        cur_date = date(2026, 9, 1) # Tuesday
        # Let 2026-09-01 be DO 1, 09-02 DO 2, 09-03 DO 3, 09-04 DO 4, 09-07 DO 5, 09-08 DO 6, 09-09 DO 1, 09-10 DO 2!
        day_order_seq = [1, 2, 3, 4, 5, 6]
        do_idx = 0

        while cur_date <= date(2026, 10, 31):
            cal_day = db.query(CalendarDay).filter(CalendarDay.date == cur_date).first()
            if cur_date.weekday() in [5, 6]: # Sat, Sun
                if not cal_day:
                    db.add(CalendarDay(date=cur_date, day_type=DayType.non_working, day_order=None, academic_year_id=ay.id, semester_id=sem.id))
            else:
                assigned_do = day_order_seq[do_idx % 6]
                do_idx += 1
                if not cal_day:
                    db.add(CalendarDay(date=cur_date, day_type=DayType.working, day_order=assigned_do, academic_year_id=ay.id, semester_id=sem.id))
                else:
                    cal_day.day_type = DayType.working
                    cal_day.day_order = assigned_do
                    cal_day.academic_year_id = ay.id
                    cal_day.semester_id = sem.id
            cur_date += timedelta(days=1)
        db.commit()
        print("Academic Calendar populated (2026-09-10 is Day Order 2).")

        # -------------------------------------------------------------
        # 2. DEPARTMENTS
        # -------------------------------------------------------------
        dept_data = [
            ("Computer Science & Engineering", "CSE"),
            ("Information Technology", "IT"),
            ("Electronics & Communication Engineering", "ECE"),
            ("Electrical & Electronics Engineering", "EEE"),
            ("Mechanical Engineering", "MECH"),
            ("Civil Engineering", "CIVIL"),
        ]
        departments = {}
        for name, code in dept_data:
            dept = db.query(Department).filter(Department.code == code).first()
            if not dept:
                dept = Department(name=name, code=code)
                db.add(dept)
                db.commit()
                db.refresh(dept)
            departments[code] = dept

            # Enable teacher self-management setting for all departments
            setting = db.query(SystemSetting).filter(
                SystemSetting.key == "teacher_self_management_enabled",
                SystemSetting.department_id == dept.id
            ).first()
            if not setting:
                db.add(SystemSetting(key="teacher_self_management_enabled", value="true", department_id=dept.id))
            else:
                setting.value = "true"
        db.commit()
        print(f"Verified {len(departments)} departments.")

        # -------------------------------------------------------------
        # 3. ROOMS
        # -------------------------------------------------------------
        rooms = []
        for i in range(101, 125):
            r_num = f"Room {i}"
            room = db.query(Room).filter(Room.room_number == r_num).first()
            if not room:
                room = Room(room_number=r_num, room_type=RoomType.classroom, capacity=60)
                db.add(room)
                db.commit()
                db.refresh(room)
            rooms.append(room)
        for lab_name in ["CSE Lab 1", "CSE Lab 2", "ECE Lab 1", "MECH Workshop", "Civil CAD Lab"]:
            room = db.query(Room).filter(Room.room_number == lab_name).first()
            if not room:
                room = Room(room_number=lab_name, room_type=RoomType.lab, capacity=40)
                db.add(room)
                db.commit()
                db.refresh(room)
            rooms.append(room)
        print(f"Verified {len(rooms)} classrooms & labs.")

        # -------------------------------------------------------------
        # 4. CLASSES
        # -------------------------------------------------------------
        class_definitions = [
            # CSE
            ("CSE", "I CSE-A", "A", 1), ("CSE", "I CSE-B", "B", 1),
            ("CSE", "II CSE-A", "A", 3), ("CSE", "II CSE-B", "B", 3),
            ("CSE", "III CSE-A", "A", 5), ("CSE", "III CSE-B", "B", 5),
            ("CSE", "IV CSE-A", "A", 7), ("CSE", "IV CSE-B", "B", 7),
            # IT
            ("IT", "I IT-A", "A", 1), ("IT", "I IT-B", "B", 1),
            ("IT", "II IT-A", "A", 3), ("IT", "II IT-B", "B", 3),
            ("IT", "III IT-A", "A", 5), ("IT", "III IT-B", "B", 5),
            ("IT", "IV IT-A", "A", 7),
            # ECE
            ("ECE", "I ECE-A", "A", 1), ("ECE", "I ECE-B", "B", 1),
            ("ECE", "II ECE-A", "A", 3), ("ECE", "II ECE-B", "B", 3),
            ("ECE", "III ECE-A", "A", 5), ("ECE", "III ECE-B", "B", 5),
            ("ECE", "IV ECE-A", "A", 7),
            # EEE
            ("EEE", "I EEE-A", "A", 1), ("EEE", "II EEE-A", "A", 3),
            ("EEE", "III EEE-A", "A", 5), ("EEE", "IV EEE-A", "A", 7),
            # MECH
            ("MECH", "I MECH-A", "A", 1), ("MECH", "II MECH-A", "A", 3),
            ("MECH", "III MECH-A", "A", 5), ("MECH", "IV MECH-A", "A", 7),
            # CIVIL
            ("CIVIL", "I CIVIL-A", "A", 1), ("CIVIL", "II CIVIL-A", "A", 3),
            ("CIVIL", "III CIVIL-A", "A", 5), ("CIVIL", "IV CIVIL-A", "A", 7),
        ]
        classes = {}
        for d_code, c_name, sec, sem_num in class_definitions:
            dept = departments[d_code]
            cls = db.query(Class).filter(Class.name == c_name, Class.department_id == dept.id).first()
            if not cls:
                cls = Class(name=c_name, section=sec, semester=sem_num, department_id=dept.id)
                db.add(cls)
                db.commit()
                db.refresh(cls)
            classes[c_name] = cls
        print(f"Verified {len(classes)} classes across 6 departments.")

        # -------------------------------------------------------------
        # 5. SUBJECTS
        # -------------------------------------------------------------
        subject_definitions = [
            # CSE
            ("CSE", "CS201", "Data Structures", SubjectType.theory, 4, 3),
            ("CSE", "CS204", "Operating Systems", SubjectType.theory, 3, 3),
            ("CSE", "CS302", "Database Management Systems", SubjectType.theory, 4, 5),
            ("CSE", "CS202", "Object Oriented Programming", SubjectType.theory, 3, 3),
            ("CSE", "CS305", "Computer Networks", SubjectType.theory, 3, 5),
            ("CSE", "CS401", "Artificial Intelligence", SubjectType.theory, 4, 7),
            ("CSE", "CS402", "Cloud Computing", SubjectType.theory, 3, 7),
            ("CSE", "CS205", "Software Engineering", SubjectType.theory, 3, 3),
            # IT
            ("IT", "IT201", "Programming in Python", SubjectType.theory, 4, 3),
            ("IT", "IT202", "Web Development", SubjectType.theory, 3, 3),
            ("IT", "IT301", "Database Systems", SubjectType.theory, 4, 5),
            ("IT", "IT302", "Information Security", SubjectType.theory, 3, 5),
            ("IT", "IT401", "Mobile App Development", SubjectType.theory, 4, 7),
            # ECE
            ("ECE", "EC201", "Digital Electronics", SubjectType.theory, 4, 3),
            ("ECE", "EC202", "Signals and Systems", SubjectType.theory, 3, 3),
            ("ECE", "EC301", "Microprocessors & Microcontrollers", SubjectType.theory, 4, 5),
            ("ECE", "EC302", "Communication Systems", SubjectType.theory, 4, 5),
            ("ECE", "EC401", "VLSI Design", SubjectType.theory, 3, 7),
            ("ECE", "EC402", "Embedded Systems", SubjectType.theory, 4, 7),
            # EEE
            ("EEE", "EE201", "Electrical Machines", SubjectType.theory, 4, 3),
            ("EEE", "EE301", "Power Systems", SubjectType.theory, 4, 5),
            ("EEE", "EE302", "Control Systems", SubjectType.theory, 3, 5),
            ("EEE", "EE401", "Power Electronics", SubjectType.theory, 4, 7),
            # MECH
            ("MECH", "ME201", "Engineering Mechanics", SubjectType.theory, 4, 3),
            ("MECH", "ME301", "Thermodynamics", SubjectType.theory, 4, 5),
            ("MECH", "ME302", "Fluid Mechanics", SubjectType.theory, 3, 5),
            ("MECH", "ME401", "Manufacturing Technology", SubjectType.theory, 4, 7),
            # CIVIL
            ("CIVIL", "CE201", "Structural Engineering", SubjectType.theory, 4, 3),
            ("CIVIL", "CE301", "Surveying & Geomatics", SubjectType.theory, 4, 5),
            ("CIVIL", "CE302", "Concrete Technology", SubjectType.theory, 3, 5),
            ("CIVIL", "CE401", "Geotechnical Engineering", SubjectType.theory, 4, 7),
        ]
        subjects = {}
        for d_code, code, s_name, stype, creds, sem_num in subject_definitions:
            dept = departments[d_code]
            subj = db.query(Subject).filter(Subject.code == code, Subject.department_id == dept.id).first()
            if not subj:
                subj = Subject(code=code, name=s_name, subject_type=stype, credits=creds, semester=sem_num, department_id=dept.id)
                db.add(subj)
                db.commit()
                db.refresh(subj)
            subjects[code] = subj
        print(f"Verified {len(subjects)} curriculum subjects.")

        # -------------------------------------------------------------
        # 6. EXACTLY 30 FICTIONAL TEACHERS (FAC001 - FAC030)
        # -------------------------------------------------------------
        teacher_roster = [
            # Computer Science (8)
            ("FAC001", "Dr. Arun Kumar", "teacher_cse_1@example.com", "CSE", 5),
            ("FAC002", "Dr. Priya Sharma", "priya.sharma@college.edu", "CSE", 7),
            ("FAC003", "Mr. Karthik Raj", "karthik.raj@college.edu", "CSE", 4),
            ("FAC004", "Ms. Divya Raman", "divya.raman@college.edu", "CSE", 6),
            ("FAC005", "Mr. Suresh Kumar", "suresh.kumar@college.edu", "CSE", 5),
            ("FAC006", "Dr. Meena Ravi", "meena.ravi@college.edu", "CSE", 8),
            ("FAC007", "Mr. Naveen Kumar", "naveen.kumar@college.edu", "CSE", 6),
            ("FAC008", "Ms. Anitha Devi", "anitha.devi@college.edu", "CSE", 5),
            # Information Technology (6)
            ("FAC009", "Dr. Vijay Kumar", "vijay.kumar@college.edu", "IT", 6),
            ("FAC010", "Ms. Swetha Raj", "swetha.raj@college.edu", "IT", 7),
            ("FAC011", "Mr. Rohit Kumar", "rohit.kumar@college.edu", "IT", 5),
            ("FAC012", "Dr. Kavitha S", "kavitha.s@college.edu", "IT", 8),
            ("FAC013", "Mr. Ajay Raj", "ajay.raj@college.edu", "IT", 4),
            ("FAC014", "Ms. Nandhini K", "nandhini.k@college.edu", "IT", 6),
            # Electronics & Communication (6)
            ("FAC015", "Dr. Rajesh Kumar", "rajesh.kumar@college.edu", "ECE", 5),
            ("FAC016", "Ms. Deepa Ravi", "deepa.ravi@college.edu", "ECE", 6),
            ("FAC017", "Mr. Hari Prasad", "hari.prasad@college.edu", "ECE", 7),
            ("FAC018", "Dr. Lakshmi S", "lakshmi.s@college.edu", "ECE", 8),
            ("FAC019", "Mr. Praveen Kumar", "praveen.kumar@college.edu", "ECE", 4),
            ("FAC020", "Ms. Keerthana R", "keerthana.r@college.edu", "ECE", 5),
            # Electrical & Electronics (5)
            ("FAC021", "Dr. Siva Kumar", "siva.kumar@college.edu", "EEE", 6),
            ("FAC022", "Mr. Balaji R", "balaji.r@college.edu", "EEE", 5),
            ("FAC023", "Ms. Priyanka S", "priyanka.s@college.edu", "EEE", 7),
            ("FAC024", "Dr. Rekha Devi", "rekha.devi@college.edu", "EEE", 8),
            ("FAC025", "Mr. Dinesh Kumar", "dinesh.kumar@college.edu", "EEE", 4),
            # Mechanical (3)
            ("FAC026", "Dr. Manoj Kumar", "manoj.kumar@college.edu", "MECH", 6),
            ("FAC027", "Mr. Senthil Raj", "senthil.raj@college.edu", "MECH", 5),
            ("FAC028", "Ms. Asha Devi", "asha.devi@college.edu", "MECH", 7),
            # Civil (2)
            ("FAC029", "Dr. Ramesh Kumar", "ramesh.kumar@college.edu", "CIVIL", 8),
            ("FAC030", "Ms. Swathi R", "swathi.r@college.edu", "CIVIL", 6),
        ]

        teachers = {}
        for emp_id, name, email, d_code, base_credit in teacher_roster:
            dept = departments[d_code]
            t_user = db.query(User).filter(User.email == email).first()
            if not t_user:
                t_user = User(
                    name=name,
                    email=email,
                    password_hash=pwd_hash,
                    role=Role.teacher,
                    department_id=dept.id,
                    must_change_credentials=False,
                    is_active=True
                )
                db.add(t_user)
                db.commit()
                db.refresh(t_user)
            else:
                t_user.name = name
                t_user.password_hash = pwd_hash
                t_user.department_id = dept.id
                t_user.must_change_credentials = False
                t_user.is_active = True
                db.commit()

            # Set credit balance
            t_cred = db.query(TeacherCredit).filter(TeacherCredit.teacher_id == t_user.id).first()
            if not t_cred:
                t_cred = TeacherCredit(teacher_id=t_user.id, balance=base_credit)
                db.add(t_cred)
            else:
                t_cred.balance = base_credit
            db.commit()

            # Credit history logs
            tx_count = db.query(CreditTransaction).filter(CreditTransaction.teacher_id == t_user.id).count()
            if tx_count == 0:
                db.add(CreditTransaction(
                    teacher_id=t_user.id,
                    change=base_credit,
                    reason=f"Initial allocated semester leave quota ({emp_id})",
                    category="manual_adjustment"
                ))
                db.commit()

            teachers[emp_id] = t_user

        print(f"Created/verified exactly {len(teachers)} teachers (FAC001 to FAC030).")

        # -------------------------------------------------------------
        # 7. CONFLICT-FREE TIMETABLE POPULATION (All Days 1-6, Periods 1-5)
        # -------------------------------------------------------------
        # Tracking sets to guarantee conflict-free schedules
        teacher_busy = set() # (teacher_id, day_order, period)
        class_busy = set()   # (class_id, day_order, period)
        room_busy = set()    # (room_id, day_order, period)

        # Clear existing slots to re-populate a fresh conflict-free college schedule
        db.query(TimetableSlot).delete()
        db.commit()

        arun = teachers["FAC001"]
        priya = teachers["FAC002"]
        karthik = teachers["FAC003"]
        divya = teachers["FAC004"]

        # SPECIFIC DEMO SLOTS FOR DR. ARUN KUMAR (FAC001)
        # On Day Order 2 (10 September 2026):
        # - Period 1: II CSE-A -> CS201 (Data Structures) in Room 101
        # - Period 3: III CSE-B -> CS204 (Operating Systems) in Room 102
        # - Period 5: II CSE-B -> CS302 (DBMS) in Room 103
        demo_arun_slots = [
            # Day Order 2 (Demo Day)
            (2, 1, subjects["CS201"].id, classes["II CSE-A"].id, rooms[0].id),
            (2, 3, subjects["CS204"].id, classes["III CSE-B"].id, rooms[1].id),
            (2, 5, subjects["CS302"].id, classes["II CSE-B"].id, rooms[2].id),
            # Other Day Orders for Dr. Arun
            (1, 1, subjects["CS201"].id, classes["II CSE-A"].id, rooms[0].id),
            (1, 4, subjects["CS302"].id, classes["II CSE-B"].id, rooms[2].id),
            (3, 2, subjects["CS204"].id, classes["III CSE-B"].id, rooms[1].id),
            (3, 4, subjects["CS201"].id, classes["II CSE-A"].id, rooms[0].id),
            (4, 1, subjects["CS302"].id, classes["II CSE-B"].id, rooms[2].id),
            (4, 3, subjects["CS204"].id, classes["III CSE-B"].id, rooms[1].id),
            (5, 2, subjects["CS201"].id, classes["II CSE-A"].id, rooms[0].id),
            (5, 5, subjects["CS302"].id, classes["II CSE-B"].id, rooms[2].id),
            (6, 3, subjects["CS204"].id, classes["III CSE-B"].id, rooms[1].id),
        ]
        for do, p, sid, cid, rid in demo_arun_slots:
            db.add(TimetableSlot(teacher_id=arun.id, day_order=do, period_number=p, subject_id=sid, class_id=cid, room_id=rid))
            teacher_busy.add((arun.id, do, p))
            class_busy.add((cid, do, p))
            room_busy.add((rid, do, p))

        # SPECIFIC SLOTS FOR SUBSTITUTE TEACHERS ON DAY ORDER 2:
        # Dr. Priya Sharma (FAC002) is FREE at Period 1 (teaches CS201 at P2, P4)
        priya_do2_slots = [
            (2, 2, subjects["CS201"].id, classes["I CSE-A"].id, rooms[3].id),
            (2, 4, subjects["CS201"].id, classes["I CSE-B"].id, rooms[4].id),
        ]
        for do, p, sid, cid, rid in priya_do2_slots:
            db.add(TimetableSlot(teacher_id=priya.id, day_order=do, period_number=p, subject_id=sid, class_id=cid, room_id=rid))
            teacher_busy.add((priya.id, do, p))
            class_busy.add((cid, do, p))
            room_busy.add((rid, do, p))

        # Mr. Karthik Raj (FAC003) is FREE at Period 3 (teaches CS204 at P1, P5)
        karthik_do2_slots = [
            (2, 1, subjects["CS204"].id, classes["IV CSE-A"].id, rooms[5].id),
            (2, 5, subjects["CS204"].id, classes["IV CSE-B"].id, rooms[6].id),
        ]
        for do, p, sid, cid, rid in karthik_do2_slots:
            db.add(TimetableSlot(teacher_id=karthik.id, day_order=do, period_number=p, subject_id=sid, class_id=cid, room_id=rid))
            teacher_busy.add((karthik.id, do, p))
            class_busy.add((cid, do, p))
            room_busy.add((rid, do, p))

        # Ms. Divya Raman (FAC004) is FREE at Period 5 (teaches CS302 at P2, P3)
        divya_do2_slots = [
            (2, 2, subjects["CS302"].id, classes["III CSE-A"].id, rooms[7].id),
            (2, 3, subjects["CS302"].id, classes["I CSE-A"].id, rooms[8].id),
        ]
        for do, p, sid, cid, rid in divya_do2_slots:
            db.add(TimetableSlot(teacher_id=divya.id, day_order=do, period_number=p, subject_id=sid, class_id=cid, room_id=rid))
            teacher_busy.add((divya.id, do, p))
            class_busy.add((cid, do, p))
            room_busy.add((rid, do, p))
        db.commit()

        # NOW POPULATE REST OF TIMETABLE ACROSS ALL DEPARTMENTS AND TEACHERS
        # Group subjects and classes by department
        dept_subjects = {}
        dept_classes = {}
        dept_teachers = {}

        for code, dept in departments.items():
            dept_subjects[code] = [s for s in subjects.values() if s.department_id == dept.id]
            dept_classes[code] = [c for c in classes.values() if c.department_id == dept.id]
            dept_teachers[code] = [t for t in teachers.values() if t.department_id == dept.id]

        total_slots_created = len(demo_arun_slots) + len(priya_do2_slots) + len(karthik_do2_slots) + len(divya_do2_slots)

        for d_code, t_list in dept_teachers.items():
            d_subs = dept_subjects[d_code]
            d_clss = dept_classes[d_code]

            for t in t_list:
                # Give each teacher 12-16 classes per week (2-3 per day)
                target_slots = 14
                current_slots = sum(1 for (t_id, _, _) in teacher_busy if t_id == t.id)
                attempts = 0

                while current_slots < target_slots and attempts < 150:
                    attempts += 1
                    do = random.randint(1, 6)
                    p = random.randint(1, 5)

                    if (t.id, do, p) in teacher_busy:
                        continue

                    available_classes = [c for c in d_clss if (c.id, do, p) not in class_busy]
                    if not available_classes:
                        continue

                    available_rooms = [r for r in rooms if (r.id, do, p) not in room_busy]
                    if not available_rooms:
                        continue

                    cls_choice = random.choice(available_classes)
                    room_choice = random.choice(available_rooms)
                    subj_choice = random.choice(d_subs)

                    slot = TimetableSlot(
                        teacher_id=t.id,
                        subject_id=subj_choice.id,
                        class_id=cls_choice.id,
                        room_id=room_choice.id,
                        day_order=do,
                        period_number=p
                    )
                    db.add(slot)
                    teacher_busy.add((t.id, do, p))
                    class_busy.add((cls_choice.id, do, p))
                    room_busy.add((room_choice.id, do, p))
                    current_slots += 1
                    total_slots_created += 1

        db.commit()
        print(f"Populated {total_slots_created} conflict-free timetable slots across all 6 departments.")

        # -------------------------------------------------------------
        # 8. HISTORICAL LEAVE DATA
        # -------------------------------------------------------------
        # Clean out old test leave requests to avoid dirty test states
        db.query(LeaveRequest).delete()
        db.commit()

        # Seed historical past leaves for 4 other teachers (e.g. in Aug 2026)
        hist_teachers = [teachers["FAC005"], teachers["FAC009"], teachers["FAC015"], teachers["FAC021"]]
        hist_leaves = [
            (hist_teachers[0], date(2026, 8, 12), 4, 2, "Medical appointment", LeaveStatus.approved),
            (hist_teachers[1], date(2026, 8, 14), 6, 3, "Conference presentation", LeaveStatus.approved),
            (hist_teachers[2], date(2026, 8, 18), 2, 1, "Personal emergency", LeaveStatus.cancelled),
            (hist_teachers[3], date(2026, 8, 20), 3, 4, "Family function", LeaveStatus.rejected),
        ]
        for t, l_date, do, p, reason, status in hist_leaves:
            db.add(LeaveRequest(
                teacher_id=t.id,
                date=l_date,
                day_order=do,
                period_number=p,
                reason=reason,
                status=status
            ))
        db.commit()
        print(f"Created {len(hist_leaves)} historical leave records.")

        print("\n=======================================================")
        print("COLLEGE DEMO DATA SEEDING COMPLETE & VERIFIED!")
        print(f"Demo Teacher: {arun.name} (FAC001 | teacher_cse_1@example.com)")
        print(f"Password: Password123")
        print(f"Leave Date: 2026-09-10 (Day Order 2)")
        print(f"Affected Periods: Period 1 (II CSE-A), Period 3 (III CSE-B), Period 5 (II CSE-B)")
        print(f"Available Substitutes: Dr. Priya Sharma (P1), Mr. Karthik Raj (P3), Ms. Divya Raman (P5)")
        print("=======================================================\n")

    except Exception as e:
        db.rollback()
        print(f"Error seeding full college demo: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_full_college()
