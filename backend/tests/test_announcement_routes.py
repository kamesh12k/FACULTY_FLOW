import pytest
from app.models.user import Role
from tests.conftest import _make_user, make_auth_headers


def test_announcement_api_lifecycle(client, db_session):
    principal = _make_user(db_session, name="Principal User", role=Role.principal, username="princ_api")
    teacher = _make_user(db_session, name="Teacher User", role=Role.teacher, email="teacher_api@college.edu", department="CS")

    p_headers = make_auth_headers(principal)
    t_headers = make_auth_headers(teacher)

    # 1. Get candidate directory
    resp = client.get("/announcements/candidates", headers=p_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "departments" in data
    assert "faculty" in data

    # 2. Create announcement as Principal
    create_payload = {
        "title": "Semester Examination Circular",
        "body": "The semester examinations will commence on October 15. Attendance is mandatory.",
        "type": "CIRCULAR",
        "priority": "HIGH",
        "target_type": "COLLEGE",
        "publish_now": True,
        "requires_acknowledgement": True,
        "allow_replies": True,
        "allow_reactions": True,
    }
    resp = client.post("/announcements", json=create_payload, headers=p_headers)
    assert resp.status_code == 201
    announcement = resp.json()
    aid = announcement["id"]
    assert announcement["title"] == "Semester Examination Circular"
    assert announcement["status"] == "PUBLISHED"

    # 3. Teacher fetches feed
    resp = client.get("/announcements", headers=t_headers)
    assert resp.status_code == 200
    feed = resp.json()
    assert len(feed) >= 1
    found = [item for item in feed if item["id"] == aid][0]
    assert found["is_read"] is False
    assert found["is_acknowledged"] is False

    # 4. Teacher views detail (auto-marks read)
    resp = client.get(f"/announcements/{aid}", headers=t_headers)
    assert resp.status_code == 200
    detail = resp.json()
    assert detail["is_read"] is True
    assert detail["is_acknowledged"] is False
    assert detail["can_acknowledge"] is True

    # 5. Teacher acknowledges
    resp = client.post(f"/announcements/{aid}/acknowledge", headers=t_headers)
    assert resp.status_code == 200
    assert resp.json()["ok"] is True

    # 6. Teacher posts message
    msg_payload = {
        "content": "Noted with thanks.",
    }
    resp = client.post(f"/announcements/{aid}/messages", json=msg_payload, headers=t_headers)
    assert resp.status_code == 201
    msg = resp.json()
    mid = msg["id"]
    assert msg["content"] == "Noted with thanks."

    # 7. Teacher reacts with 👍
    rx_payload = {"reaction": "👍"}
    resp = client.post(f"/announcements/messages/{mid}/reactions", json=rx_payload, headers=t_headers)
    assert resp.status_code == 200
    rx_data = resp.json()
    assert rx_data["reaction"] == "👍"
    assert rx_data["count"] == 1
    assert rx_data["has_reacted"] is True

    # 8. Principal checks analytics
    resp = client.get(f"/announcements/{aid}/analytics", headers=p_headers)
    assert resp.status_code == 200
    analytics = resp.json()
    assert analytics["total_recipients"] >= 1
    assert analytics["viewed_count"] >= 1
    assert analytics["acknowledged_count"] >= 1
    assert analytics["acknowledgement_rate_pct"] > 0
