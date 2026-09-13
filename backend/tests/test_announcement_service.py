import pytest
from datetime import datetime, timezone, timedelta
from app.models.user import Role
from app.models.announcement import (
    Announcement, AnnouncementStatus, AnnouncementType, AnnouncementPriority,
    TargetType
)
from app.schemas.announcement import (
    AnnouncementCreateIn, AnnouncementUpdateIn, CompleteAttachmentIn
)
from app.services import announcement_service
from tests.conftest import _make_user


def test_create_and_publish_college_announcement(db_session):
    principal = _make_user(db_session, name="Dr. Principal", role=Role.principal, username="principal")
    teacher1 = _make_user(db_session, name="Prof A", role=Role.teacher, email="a@college.edu", department="CS")
    teacher2 = _make_user(db_session, name="Prof B", role=Role.teacher, email="b@college.edu", department="ME")

    data = AnnouncementCreateIn(
        title="College Day Celebration",
        body="All faculty are cordially invited to the annual college day.",
        type=AnnouncementType.EVENT,
        priority=AnnouncementPriority.IMPORTANT,
        target_type="COLLEGE",
        publish_now=True,
        requires_acknowledgement=True,
    )

    announcement = announcement_service.create_announcement(db_session, principal, data)
    assert announcement.id is not None
    assert announcement.status == AnnouncementStatus.PUBLISHED.value
    assert announcement.target_summary == "COLLEGE"
    assert announcement.requires_acknowledgement is True

    # Check visible feed for teachers
    feed_t1, count1 = announcement_service.list_announcements(db_session, teacher1)
    assert count1 == 1
    assert feed_t1[0].id == announcement.id
    assert feed_t1[0].is_read is False
    assert feed_t1[0].is_acknowledged is False

    # Mark as read
    detail = announcement_service.get_announcement_detail(db_session, teacher1, announcement.id)
    assert detail.is_read is True
    assert detail.is_acknowledged is False

    # Acknowledge
    ack_res = announcement_service.acknowledge_announcement(db_session, teacher1, announcement.id, "127.0.0.1", "pytest")
    assert ack_res is True

    # Re-check detail
    detail_after = announcement_service.get_announcement_detail(db_session, teacher1, announcement.id)
    assert detail_after.is_acknowledged is True

    # Check analytics from principal perspective
    analytics = announcement_service.get_announcement_analytics(db_session, principal, announcement.id)
    assert analytics.total_recipients >= 2
    assert analytics.viewed_count >= 1
    assert analytics.acknowledged_count == 1


def test_hod_department_targeting(db_session):
    cs_hod = _make_user(db_session, name="CS HOD", role=Role.admin, department="CS", username="cshod")
    cs_teacher = _make_user(db_session, name="CS Faculty", role=Role.teacher, department="CS", email="cs_fac@test.com")
    ee_teacher = _make_user(db_session, name="EE Faculty", role=Role.teacher, department="EE", email="ee_fac@test.com")

    data = AnnouncementCreateIn(
        title="CS Department Meeting",
        body="Meeting in CS Conference room at 3 PM.",
        type=AnnouncementType.ACADEMIC,
        priority=AnnouncementPriority.NORMAL,
        target_type="DEPARTMENT",
        department_ids=[cs_hod.department_id],
        publish_now=True,
    )

    announcement = announcement_service.create_announcement(db_session, cs_hod, data)
    assert announcement.department_id == cs_hod.department_id

    # CS teacher should see it
    cs_feed, cs_cnt = announcement_service.list_announcements(db_session, cs_teacher)
    assert cs_cnt == 1
    assert cs_feed[0].id == announcement.id

    # EE teacher MUST NOT see it
    ee_feed, ee_cnt = announcement_service.list_announcements(db_session, ee_teacher)
    assert ee_cnt == 0


def test_conversation_thread_replies_and_reactions(db_session):
    principal = _make_user(db_session, name="Principal", role=Role.principal, username="princ")
    teacher = _make_user(db_session, name="Teacher", role=Role.teacher, department="CS", email="t@test.com")

    data = AnnouncementCreateIn(
        title="Exam Duty Instructions",
        body="Please report to the examination cell 30 minutes before time.",
        type=AnnouncementType.CIRCULAR,
        target_type="COLLEGE",
        publish_now=True,
        allow_replies=True,
        allow_reactions=True,
    )
    announcement = announcement_service.create_announcement(db_session, principal, data)

    # Teacher asks a question
    msg1 = announcement_service.add_message(
        db=db_session,
        current_user=teacher,
        announcement_id=announcement.id,
        content="Could you clarify if afternoon duties also follow this reporting time?",
    )
    assert msg1.id is not None
    assert msg1.content.startswith("Could you clarify")

    # Principal replies directly to that comment
    reply = announcement_service.add_message(
        db=db_session,
        current_user=principal,
        announcement_id=announcement.id,
        content="Yes, afternoon session reporting is 1:30 PM.",
        parent_message_id=msg1.id,
    )
    assert reply.parent_message_id == msg1.id

    # Teacher reacts with 👍 to the principal's reply
    rx_res = announcement_service.toggle_reaction(db_session, teacher, reply.id, "👍")
    assert rx_res["has_reacted"] is True
    assert rx_res["count"] == 1

    # Toggling again removes the reaction
    rx_res2 = announcement_service.toggle_reaction(db_session, teacher, reply.id, "👍")
    assert rx_res2["has_reacted"] is False
    assert rx_res2["count"] == 0

    # Principal pins the clarification reply
    is_pinned = announcement_service.toggle_pin_message(db_session, principal, reply.id)
    assert is_pinned is True

    # Retrieve conversation tree
    tree = announcement_service.get_conversation_messages(db_session, teacher, announcement.id)
    assert len(tree) == 1
    assert tree[0].id == msg1.id
    assert len(tree[0].replies) == 1
    assert tree[0].replies[0].id == reply.id
    assert tree[0].replies[0].is_pinned is True


def test_circular_revision_version_tracking(db_session):
    principal = _make_user(db_session, name="Principal", role=Role.principal, username="princ2")
    data = AnnouncementCreateIn(
        title="Circular 101: Timetable Changes",
        body="Version 1 timetable schedule...",
        type=AnnouncementType.CIRCULAR,
        target_type="COLLEGE",
        publish_now=True,
    )
    announcement = announcement_service.create_announcement(db_session, principal, data)
    assert announcement.version == 1

    # Edit circular body
    update_data = AnnouncementUpdateIn(
        body="Version 2 timetable schedule with lab revision.",
        revision_notes="Updated Lab slot for 3rd year CS.",
    )
    updated = announcement_service.update_announcement(db_session, principal, announcement.id, update_data)
    assert updated.version == 2
    assert updated.revision_notes == "Updated Lab slot for 3rd year CS."
    assert "Version 2" in updated.body
