from pydantic import BaseModel, field_validator
from datetime import datetime


class ClassCreate(BaseModel):
    name: str
    section: str
    department_id: int
    semester: int

    @field_validator("semester")
    @classmethod
    def validate_semester(cls, v: int) -> int:
        if not (1 <= v <= 8):
            raise ValueError("semester must be between 1 and 8")
        return v


class ClassUpdate(BaseModel):
    name: str | None = None
    section: str | None = None
    department_id: int | None = None
    semester: int | None = None


class ClassOut(BaseModel):
    id: int
    name: str
    section: str
    department_id: int
    semester: int
    created_at: datetime

    model_config = {"from_attributes": True}
