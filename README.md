# FAFLOW

Autonomous Leave & Substitution System

Copyright © 2026 Kamesh G.
All Rights Reserved.

FAFLOW is proprietary software developed by Kamesh G.
This repository is not licensed under any open-source license.
No part of this software may be copied, modified, distributed,
or used without prior written permission except under a commercial license agreement.

For commercial licensing:
📧 kameshgovindhan01@gmail.com

---

A production-ready web application for managing teacher leave requests, substitute assignments, and credit-based workload balancing — with full classroom, subject, room, Day Order, and Academic Calendar / Holiday management.

**Version:** 3.4.0 (Enterprise Hardening & Rate Limiting, React Error Boundary, DB Pool Resiliency, and Performance Indexing)


---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Features](#features)
3. [Technology Stack](#technology-stack)
4. [Architecture](#architecture)
5. [Quick Start (Development)](#quick-start-development)
6. [Production Deployment](#production-deployment)
7. [Admin Guide](#admin-guide)
8. [Academic Calendar & Day Order](#academic-calendar--day-order)
9. [Factory Reset](#factory-reset)
10. [Security](#security)
11. [Troubleshooting](#troubleshooting)
12. [Credits](#credits)

---

## Project Overview

The Credits is a comprehensive web-based solution for educational institutions to manage teacher workload distribution through a credit-based leave and substitute assignment system, built around a rotating **Day Order (1–6)** schedule of **five periods per day** rather than the literal weekday. The system enforces role-based access control (Super Admin / Secondary Admin / Teacher), maintains an immutable audit trail, provides a full **Academic Calendar** (Academic Years, Semesters, Holidays, Exam Days, Special Events, Department Activity Days) that automatically excludes non-working days from every downstream calculation, and includes a factory reset capability for emergency recovery.

**Key use cases:**
- Super Admin defines Academic Years, Semesters, and marks holidays/exam days/special events on the calendar
- Day Order rotation pauses on non-working days and resumes automatically on the next working day
- Teachers apply for leave (single period, multiple periods, or whole day) with automatic conflict and holiday-exclusion checks
- Admins assign substitute teachers and track credit transactions, all Day-Order-aware
- Faculty workload and credit reports automatically exclude holidays and non-working days
- Multi-level admin system with forced first-login credential change

---

## Features

### Academic Calendar & Holiday Management (new in v3)

- **Academic Years & Semesters** — Super Admin creates date-bound Academic Years and Semesters within them, scoping the calendar.
- **Calendar Day Types** — every date can be marked: Working Day, Holiday, College Leave Day, Government Holiday, Examination Day, Special Event Day, Department Activity Day, or generic Non-Working Day.
- **Day Order Sequencing (1–6)**
  - Assign a Day Order to a working date, or let it auto-continue from the previous working day
  - Reassign / override a specific date's Day Order
  - Skip ahead in the rotation deliberately (e.g. 3 → skip 4 → 5)
  - Rotation **pauses** on any non-working day and **resumes** automatically on the next working day — e.g. 24 Aug → Day Order 3, 25 Aug → Holiday, 26 Aug → Day Order 4
- **Bulk-mark a date range** — mark a whole week as Government Holiday (etc.) in one action
- **Holiday exclusion is enforced everywhere automatically:**
  - No timetable slot can be generated for a non-working date
  - No leave request can be submitted for a non-working date (rejected at the API with a clear reason)
  - No substitute assignment or credit transaction is ever created for a non-working date
  - Faculty workload reports count only actual working-day occurrences of each Day Order
- **Calendar Dashboard views** — Monthly Calendar View (click any date to mark/edit it), Day Order View, Holiday View, Academic Year/Semester management — all in one screen (`Admin → Calendar & Day Order`)
- **Reports** (`Admin → Calendar Reports`): Working Day Report, Holiday Report, Day Order Report (occurrences per Day Order in a range), Faculty Workload Report (excluding holidays)
- **Validations enforced at both the API and database layer:**
  - A date can only have one calendar entry (UNIQUE constraint)
  - A non-working day can never carry a Day Order (CHECK constraint + application logic)
  - Leave/timetable/substitute/credit operations on a non-working date are rejected with a specific error, not silently dropped

### Multi-Department Architecture & Scoped Administration (new in v3.2)

- **Global Administration** — The new `system_admin` role provides global, multi-tenant administrative capabilities. They can create, edit, and delete departments, seed/bootstrap initial department-scoped administrators, configure system-wide configurations, and run full factory resets.
- **Global Read-Only (Principal View)** — The new `principal` role grants a high-level, read-only window into the entire college. Principals can view a unified global dashboard summarizing pending leaves, working days, and today's substitution coverages across all departments, as well as generate consolidated reports.
- **Department-Scoped Isolation** — Department Super Admins and Secondary Admins are fully isolated. They can only see and manage timetables, teachers, subjects, classes, rooms, and leave requests that belong to their own department.
- **Flexible Timetabling & Scoping** — Unique constraints on subjects (`code`) and classes (`name` + `section`) are now enforced at the department level, allowing different departments to define similar subject codes or class names without conflict.
- **Department Switcher Context** — System Administrators can seamlessly switch between active department contexts using the dashboard header, scoping their current view to a specific department or displaying global statistics.

### Enterprise Hardening & Security (new in v3.4)

- **API Rate Limiting & Brute-Force Defense** — Integrated `slowapi` rate limiting across sensitive endpoints (e.g. `/auth/login` capped at 10 requests/min per IP, `/auth/register` capped at 5/min). Exceeding limits returns an HTTP `429 Too Many Requests` status with custom JSON payload.
- **Frontend Error Boundary** — Implemented a top-level React `ErrorBoundary` wrapper that intercepts unhandled render-time JavaScript exceptions and renders a polished fallback recovery screen rather than displaying a blank white screen.
- **Database Connection Pool Hardening** — Upgraded SQLAlchemy engine configuration with `pool_pre_ping=True`, `pool_recycle=300`, and `pool_timeout=30` to prevent stale connection errors and handle database server timeouts under high concurrency.
- **Performance Database Indexes** — Applied 24 composite B-tree indexes across `timetable_slots`, `leave_requests`, `credit_transactions`, and `notifications` tables, optimizing queries by up to 5x.
- **Timetable Conflict Resolution UI** — Enhanced the Timetable grid interface to automatically clear error banners upon successfully resolving and saving conflicting slot assignments.


### Admin Panel

- **Role-Based Access Control** — Super Admin (full control, factory reset, manages Secondary Admins) / Secondary Admin (up to 3 active) / Teacher, with forced credential change on bootstrap/reset
- **Teacher Management** — create accounts, view credit balances, disable without deleting
- **Subject Management** — code, name, type (theory/lab), credits, department, semester; archive/unarchive
- **Class Management** — class + section combinations, department + semester assignment
- **Room & Lab Management** — classroom/lab types, capacity, department affiliation, live availability checks
- **Timetable Management** — assign subject + class + room to a teacher for a Day Order + period (1–5); three independent UNIQUE constraints prevent double-booking (teacher / class / room); bulk upload with atomic, all-or-nothing validation; Excel import with preview/commit workflow and AI-assisted JSON import
- **Leave Request Management** — bulk review (select multiple, approve/reject in one action), auto-detect free teachers (Day-Order-based), batch submission (multiple periods or whole day in one form)
- **Admin Leave Entry** (new in v3.1) — Emergency/direct leave recording by administrators with immediate approval and auto-substitution. Three-panel layout with teacher search, timetable grid, and leave form with quick presets (Sick/Phone, Casual/Direct, Official Duty, Family Emergency, Emergency)
- **Credits Dashboard** (redesigned in v3.1) — Faculty credit ranking table with search and department filters, KPI summary cards, attention panel for outliers, detailed credit history drawer, and PDF/CSV export
- **Autonomous Substitution Engine** — Campus operations mode (autonomous/manual) for automatic substitute assignment with workload-based scoring, credit tracking, and override capabilities
- **Credit System & Reports** — real-time balance tracker, immutable transaction ledger with categories (substitute_class, manual_adjustment, exam_duty, department_duty), automatic ±1 credit on substitute assignment
- **Audit Logs** — admin-management actions and calendar mutations; cleared by factory reset by design
- **Data Management** — Clear credits history and leave request history independently without full factory reset
- **Settings / Factory Reset** (Super Admin only) — timestamped backup, wipes all faculty data + the entire Academic Calendar, resets Super Admin to bootstrap defaults

### Teacher Portal

- **Dashboard** — credit balance, pending/approved leave counts, recent requests
- **My Timetable** — grouped by Day Order, shows subject/class/room per period
- **Apply for Leave** — live calendar check as you pick a date (shows Day Order or holiday badge immediately, blocks submission on non-working dates); single period, multiple periods, or whole day
- **Leave History** — all past requests with Day Order, period, and status; self-cancel before 10 AM on the same day
- **My Credits** — balance + full transaction history
- **Substitution Management** — view assigned substitutions, choose from candidates, override selections (when Teacher Mode is enabled)
- **Preferences** — set substitution preferences for the autonomous engine

### System Features

- Conflict validation at both API (409 with specific message) and DB (UNIQUE constraints + trigger) layers
- Resource Availability Dashboard (Day-Order + period filtered)
- Campus Operations mode toggle (Autonomous / Manual substitution)
- In-app notifications (leave approved/rejected, substitute assigned)
- Optional browser push notifications (VAPID)
- Today's Substitution view (shared between Admin and Teacher portals)

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite 5, Vanilla CSS, React Router v6, Axios |
| **Backend** | FastAPI, Python 3.11+, SQLAlchemy 2.0 |
| **Database** | SQLite (dev), PostgreSQL 14+ (prod) |
| **Authentication** | JWT (python-jose), bcrypt (direct, no passlib) |
| **Validation** | Pydantic v2, email-validator |
| **Web Server** | Uvicorn (dev), Gunicorn + Uvicorn workers (prod) |
| **Testing** | pytest, httpx (424 tests) |

---

## Architecture

### Database Layer

```
users (system_admin / principal / department-scoped admin / department-scoped teacher)
├── departments (each department owns subjects, classes, rooms, and scoped users)
│   ├── subjects (unique per department/code)
│   ├── classes (unique per department/name/section)
│   └── rooms
├── academic_years
│   └── semesters
├── calendar_days (date → day_type + Day Order 1-6; the single source of
│   truth for "is this date usable" — every other table below checks here)
├── timetable_slots (subject + class + room + teacher + Day Order + period 1-5)
│   └── [conflict checks: teacher, class, room all unique per Day Order/period]
├── leave_requests (teacher + date + day_order + period + reason + status)
│   ├── alter_assignments (leave → substitute + auto-credit transfer)
│   └── credit_transactions (immutable ledger: ±1 per assignment)
│       └── teacher_credits (cached running balance)
├── notifications + push_subscriptions
└── audit_logs (admin + calendar actions, filtered by department, cleared by factory reset)
```

### API Structure

```
/auth        POST /login, /register
/departments GET /, POST /, PATCH /{dept_id}, DELETE /{dept_id}, POST /{dept_id}/admin
/admin       first-login setup, secondary admins, audit logs, factory-reset
/academic-calendar
             /academic-years, /semesters
             /days, /days/mark, /days/bulk-mark
             /days/day-order/assign, /days/day-order/skip
             /days/{date}/override (DELETE), /days/{date} (DELETE)
             /resolve
             /reports/working-days, /reports/holidays,
             /reports/day-orders, /reports/faculty-workload
/day-order-calendar   legacy-path-compatible wrapper over the same engine
/teachers, /subjects, /classes, /rooms
/timetable   /slot, bulk upload, by-teacher, by-class
/admin/timetable/import   preview, commit (Excel + JSON)
/leaves      single + /batch, bulk-approve/reject, assign, free-teachers,
             /recommendations, /admin-create, /cancel, /admin-cancel
/credits     /report, /transactions, /adjust (with categories)
/campus-operations   /mode, /preferences
/teacher/substitution   /enabled, /my-leaves, /candidates, /assign
/substitutions   /today
/notifications, /health
```

### Frontend Routes

```
/login, /register, /first-login-setup

/admin/dashboard
/admin/departments
/admin/academic-calendar, /admin/academic-calendar/reports
/admin/teachers, /admin/subjects, /admin/classes, /admin/rooms
/admin/timetable, /admin/timetable/import
/admin/leaves, /admin/leave-entry
/admin/credits
/admin/resource-availability, /admin/today-substitutions
/admin/settings

/principal/dashboard

/teacher/dashboard, /teacher/timetable
/teacher/leave/apply, /teacher/leaves
/teacher/credits, /teacher/preferences
/teacher/substitution, /teacher/today-coverage
```

---

## Quick Start (Development & Operations Setup)

### Prerequisites
* **Python**: Version 3.11 or later
* **Node.js**: Version 18 or later
* **PostgreSQL**: Version 14 or later
* **Git**: Installed and configured

---

### Step-by-Step Installation & Launch

#### Step 1: Database Setup
1. Open your terminal and create the PostgreSQL database:
   ```bash
   createdb credits_db
   ```
2. Initialize the database schema:
   ```bash
   psql -d credits_db -f database/schema.sql
   ```
3. Run the database migrations (if applying upgrades):
   ```bash
   psql -d credits_db -f database/migrations/002_add_rbac_and_audit.sql
   psql -d credits_db -f database/migrations/003_academic_calendar.sql
   psql -d credits_db -f database/migrations/004_autonomous_substitution.sql
   ```
4. Seed the database with initial sample departments, teachers, classes, and subjects:
   ```bash
   psql -d credits_db -f database/seed.sql
   ```
5. Run the cancellation enum fix to support active leave cancellations:
   ```sql
   psql -d credits_db -c "ALTER TYPE leave_status ADD VALUE 'cancelled';"
   ```

#### Step 2: Backend Configuration & Startup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows (PowerShell):
   .\venv\Scripts\Activate.ps1
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create your local environment configuration file:
   ```bash
   cp .env.example .env
   ```
5. Edit `.env` to configure:
   * `DATABASE_URL=postgresql://postgres@localhost:5432/credits_db`
   * `SECRET_KEY` (generate one using `python -c "import secrets; print(secrets.token_hex(32))"`)
6. Execute the preflight check script to verify schema integrity:
   ```bash
   python preflight_check.py
   ```
7. Start the FastAPI uvicorn server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   * *Swagger interactive API documentation will be available at:* `http://localhost:8000/docs`

#### Step 3: Frontend Installation & Launch
1. Open a new terminal window and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the frontend dependencies:
   ```bash
   npm install
   ```
3. Launch the Vite development server:
   ```bash
   npm run dev
   ```
   * *The application dashboard will be live at:* `http://localhost:5173`

---

### Step-by-Step Operations Workflows

#### 1. First-Time Login & Init Setup (Admin)
1. Open the browser and go to `http://localhost:5173/login`.
2. Enter the bootstrap credentials:
   * **Username**: `admin`
   * **Password**: `admin`
3. The system will automatically redirect you to the **First Login Setup** page.
4. Input your new username (e.g. `kamesh1272006k@gmail.com`) and secure password, then click **Complete Setup**.
5. Once inside the dashboard, navigate to **Calendar & Day Order** under the Admin menu.
6. Create an **Academic Year** and an **Odd/Even Semester**.
7. Click on dates in the calendar to mark them as **Working Days** and assign a **Day Order** (DO1–DO6). *Note: Downstream operations like timetabling and leaves require active working days.*

#### 2. Configuring Campus Operations Mode
1. As an Administrator, click **Settings** in the sidebar.
2. Under **Campus Operations Mode**, select one of the master modes:
   * **Manual**: Leave approvals and substitute assignments are fully handled by the Administrator.
   * **Assisted**: Leaves are automatically approved. The substitute list is ranked by compatibility, but the Admin must manually select and click assign.
   * **Autonomous**: Leaves are automatically approved, and the substitution engine immediately selects and assigns the best-suited substitute, sending push notifications.
3. Toggle **Teacher Workflow Settings** to configure whether teachers can self-assign substitutes.
4. Click **Save Settings**.

#### 3. Submitting & Cancelling Leaves (Teacher Flow)
1. **Submit Leave**:
   * Log in as a Teacher (e.g. `12CSSMK@muthayammal.in` / `Password123`).
   * Click **Apply for Leave** in the sidebar.
   * Select a date. The system automatically fetches and displays the active Day Order or Holiday status.
   * Select **Whole Day** or specific periods, input the reason, and click **Submit Request**.
2. **Cancel Leave (Same-Day Policy)**:
   * Click **Leave History** in the sidebar.
   * If the leave date is in the **future**, a red **Cancel** button is fully available.
   * If the leave date is **today (same-day)**:
     * **Before 10:00 AM**: The **Cancel** button is clickable. Click it to open the confirmation modal and cancel.
     * **At or After 10:00 AM**: The **Cancel** button is disabled. Hovering over it displays: *"Same-day leave cancellation is only available before 10:00 AM. Please contact an administrator."*
   * If the leave date is in the **past**, cancellation is disabled.

#### 4. Managing & Overriding Leaves (Admin Flow)
1. Log in as an Administrator.
2. Navigate to **Leaves** in the sidebar to review all requests.
3. **Approval / Rejection**: Click **Approve** or **Reject** on pending items. If in Assisted/Manual mode, you can click **Assign Sub** to manually select a teacher.
4. **Override Substitute**: If a substitute is already assigned, click the **Swap icon** next to their name in the table, select a new candidate, and confirm.
5. **Admin Cancel Override**:
   * Click **Cancel** on any active approved/pending leave row.
   * The system fetches a **Cancellation Impact Preview** modal showing details of the affected substitute.
   * Enter the mandatory **cancellation reason** in the input text area.
   * Click **Confirm Cancel**. The substitute is removed, credits are reversed, and notifications are sent.

#### 5. Monitoring Daily Coverages (Today's Substitutions Dashboard)
1. Navigate to **Today's Substitutions** (for Admins) or **Today's Coverage** (for Teachers).
2. The page displays the current Date and Day Order (e.g., `Date: 28-Jun-2026 | Day Order: DO4`).
3. You will see a detailed grid with columns: *Period, Class, Original Teacher, Substitute Teacher, and Assignment Source* (Manual, Autonomous, Assisted, etc.).
4. **Teachers**: Tick **"Show only my coverage"** to isolate classes you need to substitute for today.
5. **Exporting**:
   * Click **Export CSV** to download a spreadsheet.
   * Press `Ctrl + P` to trigger a clean, sidebar-free PDF print layout.

---

## Production Deployment

See `DEPLOYMENT.md` for full instructions (Gunicorn + Nginx + systemd, SSL, database backups, environment checklist).

---

## Academic Calendar & Day Order

### How the rotation works

Day Order is derived from the nearest **prior working day's** Day Order + 1 (wrapping 6 → 1). Marking a date as Holiday/Exam/etc. simply removes its Day Order; the next date you mark as `working` auto-continues the sequence from wherever it left off. Example:

```
24 Aug 2026  →  Day Order 3   (working)
25 Aug 2026  →  Holiday        (no Day Order)
26 Aug 2026  →  Day Order 4   (working — auto-continued)
```

### Manual control

- **Reassign** — pin an explicit Day Order for a date (overrides auto-sequencing); everything after it re-sequences from that value.
- **Skip** — deliberately jump the rotation (e.g. 3 → skip 4 → 5), useful when a Day Order should be omitted entirely for a cycle.
- **Clear override** — release a manual override so the date rejoins the auto-sequence based on its predecessor.
- **Bulk-mark** — mark a whole contiguous range (e.g. a week) as the same non-working type in one action.

### What gets blocked on a non-working day

Per spec, marking a date as anything other than `working` means: no timetable slot can target it, no leave request can be submitted for it (the API returns a 400 with the specific reason), no substitute assignment or credit transaction is ever created for it, and faculty workload reports skip it entirely. This is enforced in `day_order_service.assert_working_day_or_400`, called by every leave/timetable code path before it does anything date-related — there is exactly one place this rule lives.

---

## Factory Reset

Restores the system to its original deployment state — **irreversible beyond the automatic backup.**

**What it wipes:** all faculty/admin accounts (except the calling Super Admin, who is reset to bootstrap defaults), subjects/classes/rooms, the **entire Academic Calendar** (Academic Years, Semesters, Calendar Days — every holiday and Day Order assignment), all timetables, leave requests, substitute assignments, credit history, notifications, and audit logs.

**Access:** Admin Panel → Settings → Factory Reset (requires current password + typing `RESET EVERYTHING`), or the CLI recovery script `python3 scripts/factory_reset.py` if locked out entirely.

A timestamped JSON backup is written to `backend/backups/` automatically before anything is deleted; restoring from it is a manual DBA operation, not an in-app undo.

---

## Security

- JWT tokens (configurable expiry), bcrypt password hashing (12 rounds, direct bcrypt API)
- RBAC enforced at the dependency layer (`require_admin`, `require_super_admin`, `require_credentials_set`)
- First-login gate: accounts with `must_change_credentials=True` are blocked from every route except the setup endpoint
- Three-way UNIQUE constraints prevent timetable double-booking at the database layer regardless of application bugs
- `chk_calendar_day_order` CHECK constraint makes it structurally impossible for a non-working day to carry a Day Order
- Audit trail for admin actions and calendar mutations (cleared by factory reset, by design)

### Production checklist
- [ ] Unique `SECRET_KEY` (32+ chars)
- [ ] CORS `allow_origins` set to the real frontend domain
- [ ] Don't run `seed.sql` against production
- [ ] HTTPS on both frontend and backend
- [ ] Automated database backups
- [ ] At least one Academic Year + working Day Order populated before go-live

---

## Troubleshooting

**`pip install` fails on Python 3.13/3.14 (build errors mentioning a C/Rust compiler, or "newer than PyO3's maximum supported version")** — `requirements.txt` uses minimum-version pins (`>=`) rather than exact pins specifically so this doesn't happen, but if you're working from an older clone: `pip install --upgrade -r requirements.txt` to re-resolve against current releases, or `pip install -U pip` first if pip itself is old enough to be choosing stale wheels. The usual cause is an exact pin (`==`) on `psycopg2-binary`, `bcrypt`, or `pydantic` from before that package shipped wheels for your Python version, forcing pip to compile from source and fail without build tools.

**"X has no academic calendar entry" on leave/timetable submission** — the date hasn't been marked in the Academic Calendar yet. Go to Admin → Calendar & Day Order and mark it as a working day with a Day Order (or as a holiday/exam day, if that's accurate) before scheduling anything on it.

**"X is marked as holiday — no classes... can be scheduled"** — working as intended; pick a different date or, if the calendar entry is wrong, fix it from the same screen.

**Day Order sequence looks wrong after inserting a holiday** — the engine re-sequences every *non-overridden* working day after the date you just changed. If a later date was manually overridden, it keeps its pinned value and the rotation continues from there — check for an "override" badge on the calendar.

**Pre-flight check fails on "calendar_days is missing columns"** — run `database/migrations/003_academic_calendar.sql`.

**Other issues** — see `database/README.md` and `DEPLOYMENT.md` for schema/deployment-specific troubleshooting.

---

## Credits

**Developer:** Kamesh G

**Institution:** Muthayammal College of Arts and Science (Autonomous) — B.Sc. Computer Science, II Year, Section B
**Academic Guidance:** Mr. Krishnamoorthi, Assistant Professor

---

## License

Provided as-is for educational and institutional use.
