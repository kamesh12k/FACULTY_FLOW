# FAFLOW — Backend Architecture Specification

This document details the backend engineering design, service layer abstractions, dependency injection, and data access patterns of FAFLOW.

---

## 1. Technology Stack & Frameworks

- **Runtime**: Python `3.11` / `3.12`
- **Web Framework**: `FastAPI` (ASGI async web server)
- **Data Validation & Serializers**: `Pydantic v2` (`BaseModel`)
- **ORM & Connection Pooling**: `SQLAlchemy 2.0` (with `QueuePool`)
- **Database Driver**: `psycopg2-binary`
- **Security & Cryptography**: `python-jose` (JWT), `passlib` with `bcrypt`
- **Test Framework**: `pytest`, `pytest-cov`, `anyio`

---

## 2. Directory & Module Layout

```text
backend/
├── app/
│   ├── main.py                      # FastAPI app entrypoint, middleware, router mounts
│   ├── config.py                    # Environment settings via pydantic-settings
│   ├── database.py                  # SQLAlchemy engine, session maker, get_db dependency
│   │
│   ├── core/
│   │   ├── dependencies.py          # Auth guards: require_admin, require_teacher, get_current_user
│   │   └── security.py              # Password hashing, JWT token generation & verification
│   │
│   ├── models/                      # SQLAlchemy ORM Data Models
│   │   ├── user.py                  # User, Role, AdminLevel models
│   │   ├── academic_calendar.py     # AcademicYear, Semester, CalendarDay
│   │   ├── timetable.py             # TimetableSlot, ClassSection, Subject, Room
│   │   ├── leave.py                 # LeaveRequest, LeaveStatus, LeaveCategory
│   │   ├── credit.py                # TeacherCredit, CreditTransaction
│   │   ├── staff.py                 # OperationalStaff, StaffLab
│   │   ├── staff_leave.py           # StaffLeave, StaffCredit, StaffCreditLedger
│   │   └── audit.py                 # AuditLog model
│   │
│   ├── schemas/                     # Pydantic Request / Response DTOs
│   │   ├── user.py, auth.py, timetable.py, leave.py, credit.py, staff.py, ...
│   │
│   ├── services/                    # Core Business Logic & Algorithms
│   │   ├── auth_service.py          # Registration, login, credential resets
│   │   ├── substitution_service.py  # Autonomous scoring & candidate matching
│   │   ├── timetable_service.py     # Slot creation, conflict audits, CSV parsing
│   │   ├── leave_service.py         # Faculty leave validation, approval, reversal
│   │   ├── staff_leave_service.py   # Staff leave ledger, quota management
│   │   ├── credit_service.py        # Workload credit accounting & reports
│   │   └── day_order_service.py     # Cyclical day order calculation & pauses
│   │
│   └── routes/                      # FastAPI APIRouters (REST Endpoints)
│       ├── auth.py, admin.py, manager.py, staff.py, teachers.py, timetable.py, ...
│
└── tests/                           # Pytest Test Suite (328 Automated Tests)
```

---

## 3. Dependency Injection & RBAC Pipeline

Every incoming API request traverses a deterministic authorization pipeline:

```mermaid
flowchart LR
    Req[Incoming HTTP Request] --> Dep1[get_db: Session Provisioning]
    Dep1 --> Dep2[get_current_user: JWT Bearer Verification]
    Dep2 --> Dep3[require_credentials_set: First-Login Gate]
    Dep3 --> Dep4[Role Guard: require_admin / require_manager]
    Dep4 --> Dep5[get_tenant_department_id: Multi-Tenant Scoping]
    Dep5 --> Handler[Route Handler Function]
```
