from pydantic import BaseModel, field_validator
from datetime import date, datetime
from uuid import UUID
from app.models.leave import LeaveStatus, AssignmentType
from app.schemas.user import UserOut
from app.schemas.validators import validate_period_number


class LeaveCreate(BaseModel):
    date: date
    period_number: int
    reason: str

    @field_validator("period_number")
    @classmethod
    def validate_period(cls, v: int) -> int:
        return validate_period_number(v)


class LeaveBatchCreate(BaseModel):
    """Apply for leave across multiple periods (same date) or a whole day
    in one submission. period_numbers=None + whole_day=True expands to all
    periods scheduled for the teacher that day."""
    date: date
    whole_day: bool = False
    period_numbers: list[int] | None = None
    reason: str

    @field_validator("period_numbers")
    @classmethod
    def validate_periods(cls, v: list[int] | None) -> list[int] | None:
        if v is not None:
            for p in v:
                validate_period_number(p)
        return v


class AlterAssignmentCreate(BaseModel):
    substitute_teacher_id: int


class AlterAssignmentOut(BaseModel):
    id: int
    leave_request_id: int
    substitute_teacher_id: int
    assigned_at: datetime
    assignment_type: AssignmentType
    compatibility_score: float | None
    is_locked: bool
    substitute: UserOut

    model_config = {"from_attributes": True}


class LeaveOut(BaseModel):
    id: int
    teacher_id: int
    date: date
    day_order: int
    period_number: int
    reason: str
    status: LeaveStatus
    created_at: datetime
    batch_id: UUID | None
    is_emergency: bool
    teacher: UserOut
    # Defined below AlterAssignmentOut specifically so no forward
    # reference is needed. Without this field, the approve-leave
    # response (routes/leaves.py builds it via LeaveOut.model_validate)
    # would silently omit any substitute that autonomous mode assigned
    # during approval — the frontend would see the field simply absent
    # rather than null, making "was a substitute already assigned?"
    # unanswerable from this response alone. This was caught and fixed
    # while verifying handoff Known Issue #2.
    alter_assignment: AlterAssignmentOut | None = None

    model_config = {"from_attributes": True}


class BulkLeaveAction(BaseModel):
    leave_ids: list[int]


class OverrideSubstituteRequest(BaseModel):
    new_substitute_teacher_id: int


class LockAssignmentRequest(BaseModel):
    locked: bool


class FreeTeacherOut(BaseModel):
    id: int
    name: str
    department: str | None
    today_workload: int
    today_periods: list[int]
    week_workload: int

    model_config = {"from_attributes": True}


class AdminCancelRequest(BaseModel):
    reason: str


class CancelImpactOut(BaseModel):
    """Preview of what will be affected if this leave is cancelled."""
    leave_id: int
    leave_date: date
    day_order: int
    period_number: int
    teacher_name: str
    has_substitute: bool
    substitute_name: str | None = None
    substitute_id: int | None = None
    assignment_type: str | None = None


class AdminLeaveCreate(BaseModel):
    teacher_id: int
    date: date
    whole_day: bool = False
    period_numbers: list[int] | None = None
    reason: str
    notes: str | None = None

    @field_validator("period_numbers")
    @classmethod
    def validate_periods(cls, v: list[int] | None) -> list[int] | None:
        if v is not None:
            for p in v:
                validate_period_number(p)
        return v


