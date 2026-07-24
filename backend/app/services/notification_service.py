import re
from sqlalchemy.orm import Session
from datetime import date, timedelta

from app.models.notification import Notification
from app.models.day_order_calendar import CalendarDay, DayType

HOLIDAY_REMINDER_LOOKAHEAD_DAYS = 3
_REMINDER_DATE_RE = re.compile(r"on (\d{4}-\d{2}-\d{2}) \(")


def create_notification(db: Session, user_id: int, title: str, body: str, event_type: str, related_leave_id: int | None = None) -> Notification:
    note = Notification(user_id=user_id, title=title, body=body, event_type=event_type, related_leave_id=related_leave_id)
    db.add(note)
    db.flush()
    return note


def list_notifications(db: Session, user_id: int, unread_only: bool = False) -> list[Notification]:
    q = db.query(Notification).filter(Notification.user_id == user_id)
    if unread_only:
        q = q.filter(Notification.is_read == False)  # noqa: E712
    return q.order_by(Notification.created_at.desc()).all()


def unread_count(db: Session, user_id: int) -> int:
    return db.query(Notification).filter(Notification.user_id == user_id, Notification.is_read == False).count()  # noqa: E712


def mark_read(db: Session, user_id: int, notification_id: int) -> None:
    note = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == user_id).first()
    if note:
        note.is_read = True
        db.commit()


def mark_all_read(db: Session, user_id: int) -> None:
    db.query(Notification).filter(Notification.user_id == user_id, Notification.is_read == False).update({"is_read": True})  # noqa: E712
    db.commit()


def generate_holiday_reminders(db: Session, user_id: int, today: date) -> None:
    """Disabled: Holiday and non-working day reminders are no longer generated."""
    return
