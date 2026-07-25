"""Tests for app.services.substitution_service."""
import pytest
from datetime import datetime, timedelta, timezone, date
from fastapi import HTTPException

from app.services.substitution_service import (
    get_mode, set_mode, get_emergency_window_hours,
    get_or_create_preferences, update_preferences,
    count_recent_substitutions, fairness_score,
    list_eligible_candidates, score_candidate,
    get_ranked_recommendations, create_assignment,
    auto_process_approved_leave, mark_emergency_if_applicable,
)
from app.models.system_setting import SystemSetting
from app.models.leave import LeaveRequest, LeaveStatus, AlterAssignment, AssignmentType
from app.models.timetable import TimetableSlot
from app.models.credit import TeacherCredit
from tests.conftest import (
    _make_user, create_department, create_subject, create_class,
    create_timetable_slot, create_calendar_day, create_leave_request,
    create_teacher_credit,
)
from app.models.day_order_calendar import DayType


class TestMode:
    def test_get_default(self, db_session):
        assert get_mode(db_session) == "manual"


    def test_set_and_get(self, db_session, test_super_admin):
        set_mode(db_session, "autonomous", test_super_admin)
        assert get_mode(db_session) == "autonomous"

    def test_invalid_mode(self, db_session, test_super_admin):
        with pytest.raises(HTTPException):
            set_mode(db_session, "invalid", test_super_admin)


class TestEmergencyWindow:
    def test_default(self, db_session):
        assert get_emergency_window_hours(db_session) == 2

    def test_custom(self, db_session):
        db_session.add(SystemSetting(key="emergency_window_hours", value="5"))
        db_session.commit()
        assert get_emergency_window_hours(db_session) == 5


class TestPreferences:
    def test_get_or_create(self, db_session, test_teacher):
        pref = get_or_create_preferences(db_session, test_teacher.id)
        assert pref.accept_auto_assignments is True

    def test_update(self, db_session, test_teacher):
        pref = update_preferences(db_session, test_teacher.id, accept_auto_assignments=False)
        assert pref.accept_auto_assignments is False


class TestFairness:
    def test_no_assignments(self, db_session, test_teacher):
        assert fairness_score(db_session, test_teacher.id) == 100.0


class TestEligibility:
    def _setup_leave(self, db_session):
        teacher = _make_user(db_session, email="leaver@test.com")
        create_calendar_day(db_session, date(2026, 7, 1), DayType.working, day_order=1)
        leave = create_leave_request(
            db_session, teacher.id, date(2026, 7, 1),
            day_order=1, period_number=1, status=LeaveStatus.approved,
        )
        return teacher, leave

    def test_excludes_self(self, db_session):
        teacher, leave = self._setup_leave(db_session)
        eligible = list_eligible_candidates(db_session, leave)
        assert teacher.id not in [t.id for t in eligible]

    def test_includes_free_teacher(self, db_session):
        _, leave = self._setup_leave(db_session)
        free = _make_user(db_session, email="free@test.com")
        eligible = list_eligible_candidates(db_session, leave)
        assert free.id in [t.id for t in eligible]

    def test_excludes_busy_teacher(self, db_session):
        _, leave = self._setup_leave(db_session)
        busy = _make_user(db_session, email="busy@test.com")
        dept = create_department(db_session)
        subj = create_subject(db_session, department_id=dept.id)
        cls = create_class(db_session, department_id=dept.id)
        create_timetable_slot(db_session, busy.id, subj.id, cls.id, day_order=1, period_number=1)
        eligible = list_eligible_candidates(db_session, leave)
        assert busy.id not in [t.id for t in eligible]

    def test_excludes_already_subbed_today_in_auto_mode(self, db_session):
        leaver, leave = self._setup_leave(db_session)
        substitute = _make_user(db_session, email="substitute@test.com")
        
        other_leave = create_leave_request(
            db_session, leaver.id, date(2026, 7, 1),
            day_order=1, period_number=2, status=LeaveStatus.approved
        )
        create_assignment(db_session, other_leave, substitute, AssignmentType.auto_assigned, 100.0, None)
        
        eligible_manual = list_eligible_candidates(db_session, leave, require_auto_opt_in=False)
        assert substitute.id in [t.id for t in eligible_manual]
        
        eligible_auto = list_eligible_candidates(db_session, leave, require_auto_opt_in=True)
        assert substitute.id not in [t.id for t in eligible_auto]


class TestMarkEmergency:
    def test_same_day_is_emergency(self, db_session):
        leave = LeaveRequest(
            teacher_id=1, date=datetime.now(timezone.utc).date(),
            day_order=1, period_number=1, reason="test",
            status=LeaveStatus.pending,
        )
        mark_emergency_if_applicable(db_session, leave)
        assert leave.is_emergency is True

    def test_far_future_not_emergency(self, db_session):
        leave = LeaveRequest(
            teacher_id=1, date=(datetime.now(timezone.utc) + timedelta(days=30)).date(),
            day_order=1, period_number=1, reason="test",
            status=LeaveStatus.pending,
        )
        mark_emergency_if_applicable(db_session, leave)
        assert leave.is_emergency is False


class TestScoring:
    def _setup_leave_and_candidate(self, db_session):
        from app.models.user import Role
        from app.models.subject import Subject
        from app.models.department import Department
        from app.models.class_ import Class
        
        dept_cs = create_department(db_session, name="CS", code="CS")
        dept_it = create_department(db_session, name="IT", code="IT")
        
        # Leaver
        leaver = _make_user(db_session, email="leaver@test.com", department="CS")
        
        # Candidate
        candidate = _make_user(db_session, email="candidate@test.com", department="CS")
        
        leave = LeaveRequest(
            teacher_id=leaver.id,
            date=date(2026, 7, 1),
            day_order=1,
            period_number=1,
            status=LeaveStatus.approved,
        )
        return candidate, leave, dept_cs, dept_it

    def test_zero_workload_scores_100(self, db_session):
        candidate, leave, _, _ = self._setup_leave_and_candidate(db_session)
        res = score_candidate(db_session, candidate, leave, None, None)
        assert res.score == 100.0
        assert res.today_workload == 0
        assert res.week_workload == 0
        assert "Free all day today" in res.reasons
        assert "0 periods this week" in res.reasons

    def test_five_periods_today_scores_zero_today_component(self, db_session):
        candidate, leave, dept, _ = self._setup_leave_and_candidate(db_session)
        
        # Create 5 periods today
        subj = create_subject(db_session, department_id=dept.id)
        cls = create_class(db_session, department_id=dept.id)
        for p in range(1, 6):
            create_timetable_slot(db_session, candidate.id, subj.id, cls.id, day_order=1, period_number=p)
            
        res = score_candidate(db_session, candidate, leave, None, None)
        assert res.today_workload == 5
        assert res.week_workload == 5
        # today component is 0; week component is 40 * (1 - 5/30) = 40 * 25/30 = 33.333
        # total score is round(33.333) = 33.3
        assert res.score == 33.3

    def test_subject_and_department_match_no_effect(self, db_session):
        candidate1, leave, dept_cs, _ = self._setup_leave_and_candidate(db_session)
        
        # Candidate 2 (different department)
        candidate2 = _make_user(db_session, email="candidate2@test.com", department="IT")
        
        # Create same workload for both
        subj_cs = create_subject(db_session, department_id=dept_cs.id)
        cls_cs1 = create_class(db_session, name="CSE-A", section="A", department_id=dept_cs.id)
        cls_cs2 = create_class(db_session, name="CSE-B", section="B", department_id=dept_cs.id)
        create_timetable_slot(db_session, candidate1.id, subj_cs.id, cls_cs1.id, day_order=2, period_number=1)
        create_timetable_slot(db_session, candidate2.id, subj_cs.id, cls_cs2.id, day_order=2, period_number=1)
        
        # Candidate 1 is same dept CS, teaches subject subj_cs
        # Candidate 2 is IT, different dept
        res1 = score_candidate(db_session, candidate1, leave, subj_cs, "CS")
        res2 = score_candidate(db_session, candidate2, leave, subj_cs, "CS")
        
        # Scores must be identical because only workload is checked
        assert res1.score == res2.score

    def test_preference_toggles_no_effect(self, db_session):
        candidate, leave, _, _ = self._setup_leave_and_candidate(db_session)
        
        # Turn on preferences
        pref = get_or_create_preferences(db_session, candidate.id)
        update_preferences(
            db_session, candidate.id,
            prefer_morning_classes=True,
            prefer_same_department=True
        )
        
        # Compute score
        res = score_candidate(db_session, candidate, leave, None, None)
        # Should still be 100 because preferences don't add bonuses anymore
        assert res.score == 100.0


class TestCampusModeOverride:
    def test_department_distinct_modes(self, db_session, test_super_admin):
        from app.services.substitution_service import set_mode, get_mode
        dept1 = create_department(db_session, name="Dept 1", code="D1")
        dept2 = create_department(db_session, name="Dept 2", code="D2")
        
        set_mode(db_session, "autonomous", test_super_admin, tenant_department_id=dept1.id)
        set_mode(db_session, "manual", test_super_admin, tenant_department_id=dept2.id)
        
        assert get_mode(db_session, tenant_department_id=dept1.id) == "autonomous"
        assert get_mode(db_session, tenant_department_id=dept2.id) == "manual"
        assert get_mode(db_session, tenant_department_id=9999) == "manual"

    def test_global_override_precedence(self, db_session, test_super_admin):
        from app.services.substitution_service import set_mode, get_mode, set_global_override
        dept1 = create_department(db_session, name="Dept 1", code="D1")
        dept2 = create_department(db_session, name="Dept 2", code="D2")
        
        set_mode(db_session, "autonomous", test_super_admin, tenant_department_id=dept1.id)
        assert get_mode(db_session, tenant_department_id=dept1.id) == "autonomous"
        
        set_global_override(db_session, "manual", test_super_admin)
        assert get_mode(db_session, tenant_department_id=dept1.id) == "manual"
        assert get_mode(db_session, tenant_department_id=dept2.id) == "manual"
        
        set_global_override(db_session, "none", test_super_admin)
        assert get_mode(db_session, tenant_department_id=dept1.id) == "autonomous"
        assert get_mode(db_session, tenant_department_id=dept2.id) == "manual"


class TestDryRunSimulation:
    def test_simulation_assigns_mock_candidate(self, db_session, test_super_admin):
        from app.services.substitution_service import run_dry_run_simulation
        from tests.conftest import create_leave_request, _make_user, create_department
        from app.models.leave import LeaveStatus
        
        dept = create_department(db_session, name="Dept 1", code="D1")
        teacher1 = _make_user(db_session, name="teacher1", email="teacher1@test.com", username="teacher1", role="teacher")
        teacher1.department_id = dept.id
        substitute = _make_user(db_session, name="sub1", email="sub1@test.com", username="sub1", role="teacher")
        substitute.department_id = dept.id
        db_session.commit()
        
        leave = create_leave_request(db_session, teacher1.id, the_date=date(2026, 7, 20), day_order=1, period_number=1, status=LeaveStatus.approved, reason="Sick")
        db_session.commit()
        
        res = run_dry_run_simulation(db_session, date(2026, 7, 20), date(2026, 7, 20), dept.id)
        assert res["leaves_processed"] == 1
        assert res["simulated_successful_assignments"] == 1
        assert res["simulated_failed_assignments"] == 0
        assert res["estimated_credit_transactions"] == 1
        assert res["simulated_assignments"][0]["substitute_teacher_name"] == "sub1"
        assert res["simulated_assignments"][0]["status"] == "success"

    def test_simulation_respects_weekly_cap(self, db_session, test_super_admin):
        from app.services.substitution_service import run_dry_run_simulation, update_preferences
        from tests.conftest import create_leave_request, _make_user, create_department
        from app.models.leave import LeaveStatus
        
        dept = create_department(db_session, name="Dept 1", code="D1")
        teacher = _make_user(db_session, name="teacher1", email="teacher2@test.com", username="teacher1", role="teacher")
        teacher.department_id = dept.id
        substitute = _make_user(db_session, name="sub1", email="sub2@test.com", username="sub1", role="teacher")
        substitute.department_id = dept.id
        db_session.commit()
        
        update_preferences(db_session, substitute.id, max_weekly_substitutions=1)
        db_session.commit()
        
        leave1 = create_leave_request(db_session, teacher.id, the_date=date(2026, 7, 20), day_order=1, period_number=1, status=LeaveStatus.approved, reason="Sick")
        leave2 = create_leave_request(db_session, teacher.id, the_date=date(2026, 7, 21), day_order=1, period_number=1, status=LeaveStatus.approved, reason="Sick")
        db_session.commit()
        
        res = run_dry_run_simulation(db_session, date(2026, 7, 20), date(2026, 7, 21), dept.id)
        assert res["leaves_processed"] == 2
        assert res["simulated_successful_assignments"] == 1
        assert res["simulated_failed_assignments"] == 1
        assert res["simulated_assignments"][0]["status"] == "success"
        assert res["simulated_assignments"][1]["status"] == "failed"
        assert res["simulated_assignments"][1]["reason"] == "No eligible candidates"
