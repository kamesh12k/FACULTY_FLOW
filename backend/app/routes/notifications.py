from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.services import notification_service

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/")
def list_notifications(
    unread_only: bool = Query(default=False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notes = notification_service.list_notifications(db, current_user.id, unread_only)
    return [
        {
            "id": n.id, "title": n.title, "body": n.body, "event_type": n.event_type,
            "related_leave_id": n.related_leave_id, "is_read": n.is_read, "created_at": n.created_at,
        }
        for n in notes
    ]


@router.get("/unread-count")
def get_unread_count(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {"count": notification_service.unread_count(db, current_user.id)}


@router.patch("/{notification_id}/read")
def mark_read(notification_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notification_service.mark_read(db, current_user.id, notification_id)
    return {"ok": True}


@router.patch("/read-all")
def mark_all_read(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notification_service.mark_all_read(db, current_user.id)
    return {"ok": True}


@router.get("/vapid-public-key")
def vapid_public_key():
    import os
    return {"key": os.environ.get("VAPID_PUBLIC_KEY", "")}


@router.post("/subscribe")
def subscribe(subscription: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from app.models.notification import PushSubscription
    existing = db.query(PushSubscription).filter(PushSubscription.endpoint == subscription.get("endpoint")).first()
    if existing:
        return {"ok": True}
    sub = PushSubscription(
        user_id=current_user.id,
        endpoint=subscription.get("endpoint", ""),
        p256dh_key=subscription.get("keys", {}).get("p256dh", ""),
        auth_key=subscription.get("keys", {}).get("auth", ""),
    )
    db.add(sub)
    db.commit()
    return {"ok": True}
