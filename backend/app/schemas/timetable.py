from pydantic import BaseModel, field_validator
from datetime import datetime
from app.schemas.user import UserOut
from app.schemas.validators import validate_period_number, validate_day_order


class TimetableSlotCreate(BaseModel):
    teacher_id: int
    subject_id: int | None = None
    class_id: int
    room_id: int | None = None
    day_order: int
    period_number: int

    @field_validator("day_order")
    @classmethod
    def validate_day_order_field(cls, v: int) -> int:
        return validate_day_order(v)

    @field_validator("period_number")
    @classmethod
    def validate_period_field(cls, v: int) -> int:
        return validate_period_number(v)


class TimetableSlotOut(BaseModel):
    id: int
    teacher_id: int
    subject_id: int | None
    class_id: int
    room_id: int | None
    day_order: int
    period_number: int

    model_config = {"from_attributes": True}


class BulkTimetableCreate(BaseModel):
    slots: list[TimetableSlotCreate]


class TimetableSubmissionCreate(BaseModel):
    subject_id: int | None = None
    class_id: int
    room_id: int | None = None
    day_order: int
    period_number: int

    @field_validator("day_order")
    @classmethod
    def validate_day_order_field(cls, v: int) -> int:
        return validate_day_order(v)

    @field_validator("period_number")
    @classmethod
    def validate_period_field(cls, v: int) -> int:
        return validate_period_number(v)


class TimetableSubmissionReview(BaseModel):
    approved: bool
    review_note: str | None = None


class BulkTimetableSubmissionReview(BaseModel):
    submission_ids: list[int]
    approved: bool



class TimetableSubmissionOut(BaseModel):
    id: int
    teacher_id: int
    subject_id: int | None
    class_id: int
    room_id: int | None
    day_order: int
    period_number: int
    status: str
    review_note: str | None
    reviewed_by_id: int | None
    created_at: datetime
    reviewed_at: datetime | None

    model_config = {"from_attributes": True}
