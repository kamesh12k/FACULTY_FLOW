from pydantic import BaseModel, EmailStr, model_validator
from datetime import datetime
from app.models.user import Role, AdminLevel


class UserRegister(BaseModel):
    """Public self-registration — teachers only."""
    name: str
    email: EmailStr
    password: str
    department: str | None = None
    department_id: int | None = None


class UserLogin(BaseModel):
    """`identifier` accepts either a username (admins) or an email
    (teachers) so the frontend can use a single login field."""
    identifier: str
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str | None
    username: str | None
    role: Role
    admin_level: AdminLevel | None
    department: str | None
    department_id: int | None = None
    must_change_credentials: bool
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserCreate(BaseModel):
    """Admin creates a teacher account with a preset password."""
    name: str
    email: EmailStr
    password: str
    department: str | None = None
    department_id: int | None = None
    role: Role = Role.teacher

    @model_validator(mode="after")
    def teachers_only(self):
        if self.role != Role.teacher:
            raise ValueError("Use the Secondary Admin endpoint to create admin accounts")
        return self


class UserUpdate(BaseModel):
    name: str
    email: EmailStr
    department: str | None = None
    department_id: int | None = None
    is_active: bool
    password: str | None = None

