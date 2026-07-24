# FAFLOW — Administrator Manual

**Faculty Credit Management System**
Copyright © 2026 Kamesh G. All Rights Reserved.

> **Version:** 3.4.0
> **Document Revision:** 1.3
> **Audience:** System Admin / Department Admin / Principal


---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Dashboard](#2-dashboard)
3. [User Management](#3-user-management)
4. [Department Management](#4-department-management)
5. [Teacher Management](#5-teacher-management)
6. [Subject Management](#6-subject-management)
7. [Class Management](#7-class-management)
8. [Timetable Management](#8-timetable-management)
9. [Day Order Management](#9-day-order-management)
10. [Academic Calendar](#10-academic-calendar)
11. [Holiday Management](#11-holiday-management)
12. [Leave Management](#12-leave-management)
13. [Substitute Allocation](#13-substitute-allocation)
14. [Credit Management](#14-credit-management)
15. [Reports](#15-reports)
16. [Notifications](#16-notifications)
17. [Backup](#17-backup)
18. [Restore](#18-restore)
19. [Security](#19-security)
20. [Troubleshooting](#20-troubleshooting)
21. [Frequently Asked Questions](#21-frequently-asked-questions)

---

## 1. Introduction

This manual covers all administrative functions of FAFLOW. It is intended for users with **System Admin**, **Principal**, **Department Super Admin**, and **Department Secondary Admin** roles.

### Role Comparison

| Feature | System Admin | Principal | Dept Super Admin | Dept Secondary Admin | Teacher |
|---------|:------------:|:---------:|:----------------:|:--------------------:|:-------:|
| Manage Departments | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create Dept Super Admins | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create Principal account | ✅ | ❌ | ❌ | ❌ | ❌ |
| Global Factory Reset | ✅ | ❌ | ❌ | ❌ | ❌ |
| Global Settings | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Global Dashboard | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage Secondary Admins | ❌ | ❌ | ✅ (in dept) | ❌ | ❌ |
| Dept-Scoped Reset | ❌ | ❌ | ✅ (in dept) | ❌ | ❌ |
| Timetable/Teacher/Class CRUD | ❌ | ❌ | ✅ (in dept) | ✅ (in dept) | ❌ |
| Academic Calendar | ❌ | ❌ | ✅ (in dept) | ✅ (in dept) | Read-only |
| Leave Approval & Subs | ❌ | ❌ | ✅ (in dept) | ✅ (in dept) | ❌ |
| Credit Adjustments | ❌ | ❌ | ✅ (in dept) | ✅ (in dept) | View only |

> **Important:** Only the **System Admin** can manage departments, seed initial department Super Admins, and perform global factory resets. **Department Super Admins** manage their own department's users and settings. A maximum of **3 active Secondary Admins** is permitted per department. **Principals** have global read-only visibility across all departments.

### First Login Setup

When logging in for the first time (or after a factory reset):

1. Navigate to `http://<your-domain>/login`.
2. Enter the bootstrap credentials: **Username:** `admin` / **Password:** `admin`.
3. You are automatically redirected to the **First Login Setup** page.
4. Enter a new username (institutional email recommended) and a strong password.
5. Click **Complete Setup**.

> **Warning:** Do not leave the bootstrap credentials unchanged in a production environment. The system blocks all other functionality until the setup is complete.

---

## 2. Dashboard

### 2.1 Admin Dashboard Overview

The Admin Dashboard provides a real-time summary of the system state.

| Widget | Description |
|--------|-------------|
| Total Teachers | Count of active teacher accounts |
| Pending Leaves | Leave requests awaiting review |
| Today's Day Order | The current Day Order and date |
| Today's Substitutions | Count of substitutes assigned for today |
| Recent Activity | Recent leave requests and system events |

### 2.2 Today's Substitutions Panel

The **Today's Substitutions** page (accessible from the sidebar) displays a full grid of all substitute assignments for the current date:

| Column | Description |
|--------|-------------|
| Period | Period number (1–5) |
| Class | Assigned class/section |
| Original Teacher | Teacher on leave |
| Substitute Teacher | Assigned substitute |
| Assignment Source | Manual / Autonomous / Assisted |

**Export options:**
- **Export CSV** — download the current day's substitution grid as a spreadsheet.
- **Print (`Ctrl + P`)** — generates a clean, sidebar-free printable layout.

---

## 3. User Management

User management scopes differ by role. **System Admins** manage departments and global accounts (including department Super Admins and the Principal). **Department Super Admins** manage secondary administrators within their department. Both Super and Secondary Admins manage teacher accounts within their department.

### 3.1 Managing Secondary Admin Accounts (Department Super Admin Only)

1. Navigate to **Admin → Settings → Admin Accounts** (or the admin management section).
2. Click **Create Admin** to add a new Secondary Admin.
3. Enter the username, temporary password, and name.
4. The new admin is scoped to your department and will be prompted to change credentials on first login.

> **Note:** A maximum of **3 active Secondary Admin** accounts is permitted per department.

### 3.2 Department Switcher (System Admin & Principal Only)

Global roles (System Admin and Principal) can switch their active department workspace using the **Department Switcher** dropdown in the dashboard header. Choosing a specific department scopes all display data, lists, and reports to that department. Choosing **All Departments** shows a unified global overview.

### 3.2 Disabling a User Account

1. Navigate to the teacher or admin list.
2. Locate the user you wish to disable.
3. Click the **Disable** button (or toggle) in that user's row.
4. Confirm the action.

Disabled accounts cannot log in but their data (credits, leave history) is preserved.

### 3.3 Audit Logs

Navigate to **Admin → Audit Logs** to view a chronological record of all administrative actions, including:
- Account creation and credential changes
- Calendar mutations (day type assignments, overrides)
- Factory reset events

> **Note:** Audit logs are cleared by a Factory Reset, by design.

---

## 4. Department Management

Departments are the top-level organizational units that group teachers, subjects, and classes.

### 4.1 Viewing Departments

Navigate to **Admin → Departments** to see the list of all departments.

### 4.2 Creating a Department

1. Navigate to **Admin → Departments**.
2. Click **Add Department**.
3. Enter the **Department Name** and **Code**.
4. Click **Save**.

### 4.3 Editing a Department

1. Locate the department in the list.
2. Click the **Edit** (pencil) icon.
3. Modify the name or code.
4. Click **Update**.

### 4.4 Deleting a Department

1. Locate the department in the list.
2. Click the **Delete** (trash) icon.
3. Confirm the deletion.

> **Warning:** Deleting a department may affect associated teachers, subjects, and classes. Ensure all linked records are re-assigned or removed first.

---

## 5. Teacher Management

### 5.1 Viewing Teachers

Navigate to **Admin → Teachers** to see all teacher accounts with their credit balances and status.

### 5.2 Creating a Teacher Account

1. Navigate to **Admin → Teachers**.
2. Click **Add Teacher**.
3. Fill in the required fields:

| Field | Description |
|-------|-------------|
| Full Name | Teacher's display name |
| Email / Username | Used to log in |
| Temporary Password | Teacher changes this on first login |
| Department | The teacher's department |
| Employee ID | Optional institutional identifier |

4. Click **Create**.

The teacher will be prompted to change their credentials on first login.

### 5.3 Editing a Teacher Profile

1. Locate the teacher in the list.
2. Click the **Edit** icon.
3. Update the required fields.
4. Click **Save**.

### 5.4 Disabling a Teacher Account

1. Locate the teacher.
2. Click the **Disable** toggle or button.
3. Confirm the action.

The teacher cannot log in while disabled. Their credit history and leave records are preserved.

### 5.5 Resetting a Teacher's Password

1. Locate the teacher.
2. Click **Reset Password** or the equivalent option.
3. The system will mark the account as requiring a credential change.
4. Provide the teacher with their temporary credentials.

---

## 6. Subject Management

Subjects are the courses taught in the institution. They are linked to departments and semesters.

### 6.1 Viewing Subjects

Navigate to **Admin → Subjects** to see all subjects.

### 6.2 Creating a Subject

1. Navigate to **Admin → Subjects**.
2. Click **Add Subject**.
3. Fill in the fields:

| Field | Description |
|-------|-------------|
| Subject Name | Full subject name |
| Subject Code | Short code (e.g., `CS101`) |
| Type | Theory or Lab |
| Credits | Number of credits |
| Department | Owning department |
| Semester | Associated semester |

4. Click **Save**.

### 6.3 Archiving / Unarchiving a Subject

Archiving removes a subject from active assignment without deleting it:

1. Locate the subject.
2. Click **Archive** to deactivate, or **Unarchive** to reactivate.

### 6.4 Editing and Deleting Subjects

Use the **Edit** and **Delete** icons in the subject list. Deleting a subject that is referenced in timetable slots may be prevented; archive it instead.

---

## 7. Class Management

Classes represent the student groups (class + section combinations).

### 7.1 Viewing Classes

Navigate to **Admin → Classes** to see all class/section combinations.

### 7.2 Creating a Class

1. Navigate to **Admin → Classes**.
2. Click **Add Class**.
3. Fill in the fields:

| Field | Description |
|-------|-------------|
| Class Name | The class year/grade |
| Section | The section label (A, B, C, etc.) |
| Department | Owning department |
| Semester | Current semester |

4. Click **Save**.

### 7.3 Editing and Deleting Classes

Use the **Edit** and **Delete** icons in the class list.

> **Note:** Deleting a class that is referenced in timetable slots may fail. Remove those timetable assignments first.

---

## 8. Timetable Management

The timetable assigns a **subject + class + room** to a **teacher** for a specific **Day Order** and **period**.

### 8.1 Viewing the Timetable

Navigate to **Admin → Timetable** to see all timetable assignments. Use the filters to narrow by teacher, class, or Day Order.

### 8.2 Adding a Timetable Slot

1. Navigate to **Admin → Timetable**.
2. Click **Add Slot**.
3. Fill in the required fields:

| Field | Description |
|-------|-------------|
| Teacher | The teacher being assigned |
| Subject | The subject to be taught |
| Class | The student group |
| Room | The room or lab |
| Day Order | DO1 through DO6 |
| Period | 1 through 5 |

4. Click **Save**.

FAFLOW enforces three independent conflict checks at the database layer:
- A teacher cannot be double-booked for the same Day Order + period.
- A class cannot be assigned to two teachers for the same Day Order + period.
- A room cannot be used by two classes for the same Day Order + period.

If any of these conflicts exist, the system returns a specific error message and the slot is not created.

### 8.3 Automated Timetable Import

FAFLOW features a powerful, transaction-safe bulk import engine with a multi-step resolution wizard. It supports two ingest paths: **Upload Excel** (CS-STAFF workbook format) and **AI-Assisted JSON** (extracting data using large language models).

#### 8.3.1 Excel Import Workflow
1. Navigate to **Admin → Timetable Import** (from the sidebar).
2. On the **Upload Excel** tab, drag and drop or browse to select your timetable Excel sheet (must contain a `CS-STAFF` sheet).
3. Click **Generate Preview & Resolve Mappings**.
4. The system parses the workbook and stages the slots in the interactive mapping interface.

#### 8.3.2 AI-Assisted JSON Import Workflow
1. Navigate to **Admin → Timetable Import**.
2. Toggle to the **AI-Assisted JSON** tab.
3. Click **Copy Prompt** to copy the pre-formatted system prompt instructions.
4. Paste this prompt into any AI chat assistant (e.g. Gemini, ChatGPT) and upload your timetable workbook.
5. Copy the JSON response from the AI and paste it into the textarea, or save it as a `.json` file and upload it.
6. Click **Generate Preview & Resolve Mappings**.

#### 8.3.3 Review & Clean Commit (Shared Wizard)
Both Excel and JSON imports map to the same review dashboard:
- **Status check**: Rows are marked with a green `✓ Resolved` badge if teachers, classes, and subjects match exactly.
- **Fuzzy resolution**: The engine auto-reconciles names, year fallbacks, and hyphen formatting. Confirmed suggestions are saved directly.
- **Needs Review**: For unmatched or ambiguous records, select a valid option from the inline dropdowns. You can also opt to skip specific rows.
- **Subject Auto-Creation**: Unmatched subjects can be created inline with standard theory/lab defaults.
- **Teacher Auto-Creation**: Minimal teacher accounts can be provisioned with a secure first-time-login prompt.
- **Clean Commit**: Once all issues are resolved, click **🚀 Confirm & Commit** to bulk-insert all slots atomically.

### 8.4 Editing and Deleting Timetable Slots

Use the **Edit** and **Delete** icons in the timetable list. Changes take effect immediately.

#### 8.4.1 Clear All Slots
To clear all timetable slots for the currently selected teacher, click the **Clear all** button.
- The system will ask for confirmation.
- Once confirmed, all slots for that teacher are deleted in a single, atomic database transaction to ensure data integrity and avoid database locks (especially under SQLite).

### 8.5 Resource Availability Check

Navigate to **Admin → Resource Availability** to see which teachers, classes, and rooms are free for a given Day Order and period. Use this before creating new timetable slots to avoid conflicts.

---

## 9. Day Order Management

Day Orders are managed as part of the Academic Calendar. This section covers the Day Order-specific actions.

### 9.1 Assigning a Day Order to a Date

1. Navigate to **Admin → Calendar & Day Order**.
2. Click on a working day in the calendar.
3. In the day detail panel, assign a **Day Order** (DO1–DO6).
4. Click **Save**.

### 9.2 Auto-Sequencing

If you mark a date as a working day without assigning a Day Order, the system automatically continues the sequence from the most recent prior working day. For example, if the previous working day was DO3, the new date becomes DO4.

### 9.3 Overriding a Day Order

To manually pin a specific Day Order to a date (overriding the auto-sequence):

1. Click the date in the calendar.
2. Select **Reassign Day Order** and pick the desired DO.
3. Save. The date will show an **override badge**.

Subsequent non-overridden dates re-sequence from this pinned value.

### 9.4 Skipping a Day Order

To deliberately skip a Day Order in the rotation (e.g., skip DO4 so the next working day goes from DO3 to DO5):

1. Click the date you want to skip to.
2. Select **Skip** and choose the next Day Order.
3. Save.

### 9.5 Clearing an Override

To remove a manual override and let a date rejoin the auto-sequence:

1. Click the date.
2. Select **Clear Override**.
3. Save.

### 9.6 Bulk Day Order Assignment

Use the **Bulk Mark** feature to assign a Day Order (or non-working status) to a range of dates in one action:

1. Click **Bulk Mark** in the calendar toolbar.
2. Select a date range.
3. Choose the Day Type and (if Working Day) the starting Day Order.
4. Confirm.

---

## 10. Academic Calendar

The Academic Calendar is the authoritative source for which dates are operational. Every FAFLOW feature consults it before performing any date-sensitive operation.

### 10.1 Managing Academic Years

1. Navigate to **Admin → Calendar & Day Order**.
2. Click **Academic Years** in the calendar management panel.
3. Click **Add Academic Year**.
4. Enter the name (e.g., `2025–2026`) and start/end dates.
5. Click **Save**.

### 10.2 Managing Semesters

Within an Academic Year, create Odd and Even semesters:

1. In the Academic Year panel, click **Add Semester**.
2. Enter the semester name (e.g., `Odd Semester 2025`) and date range.
3. Click **Save**.

### 10.3 Calendar Views

| View | Description |
|------|-------------|
| Monthly Calendar | Click any date to view or edit its day type and Day Order |
| Day Order View | Shows all dates and their assigned Day Orders |
| Holiday View | Lists all marked non-working dates |
| Academic Year/Semester View | Manages the academic year and semester boundaries |

### 10.4 Day Type Reference

| Day Type | System Behaviour |
|----------|-----------------|
| `working` | Teaching day; carries a Day Order; all features active |
| `holiday` | No classes; leave requests blocked; no substitute assignments |
| `college_leave` | Institution-declared closure; treated as non-working |
| `government_holiday` | Official national/state holiday; treated as non-working |
| `exam` | Examination day; regular timetable suspended |
| `special_event` | College event; confirm with departments |
| `department_activity` | Department-specific non-standard day |
| `non_working` | Generic non-teaching day |

---

## 11. Holiday Management

### 11.1 Marking a Date as a Holiday

1. Navigate to **Admin → Calendar & Day Order**.
2. Click on the date in the monthly calendar view.
3. Set the **Day Type** to the appropriate holiday type (Holiday, Government Holiday, etc.).
4. Optionally add a description (e.g., "Independence Day").
5. Click **Save**.

The Day Order rotation automatically pauses on this date and resumes on the next working day.

### 11.2 Bulk-Marking a Holiday Range

To mark an entire week (or any date range) as a holiday:

1. Click **Bulk Mark** in the calendar toolbar.
2. Select the start and end dates.
3. Choose the appropriate holiday Day Type.
4. Confirm.

### 11.3 Editing or Removing a Holiday Entry

1. Click the date in the calendar.
2. Change the Day Type back to `working` (and assign a Day Order), or delete the calendar entry entirely.
3. Save.

> **Note:** Removing a holiday entry from a date that previously had leave requests or substitute assignments does not automatically restore those records. Review the affected records manually.

---

## 12. Leave Management

### 12.1 Viewing All Leave Requests

Navigate to **Admin → Leaves** to see all leave requests across all teachers.

**Filter options:**

| Filter | Description |
|--------|-------------|
| Status | Pending / Approved / Rejected / Cancelled |
| Teacher | Filter by a specific teacher |
| Date Range | Filter by leave date range |
| Department | Filter by department |

### 12.2 Approving a Single Leave Request

1. Locate the pending request in the leave list.
2. Click **Approve**.
3. The leave is approved and the teacher is notified.

### 12.3 Rejecting a Leave Request

1. Locate the pending request.
2. Click **Reject**.
3. Optionally enter a rejection reason.
4. Confirm. The teacher is notified.

### 12.4 Bulk Approve / Reject

1. Select multiple pending requests using the checkboxes.
2. Click **Approve Selected** or **Reject Selected**.
3. Confirm the bulk action.

### 12.5 Admin Cancel Override

Administrators can cancel any active approved or pending leave, regardless of the time or date:

1. Locate the leave request in the list.
2. Click **Cancel**.
3. A **Cancellation Impact Preview** modal appears, showing details of any affected substitute.
4. Enter a mandatory **cancellation reason** in the text area.
5. Click **Confirm Cancel**.

The substitute assignment is removed, credits are reversed, and notifications are sent to all affected parties.

### 12.6 Direct Admin Leave Entry (With Presets)

In addition to approving requests sent by teachers, administrators can directly record leaves for a teacher. This bypasses the approval queue, immediately marks the leave as approved, and triggers the substitution workflow (including automatic allocation if the system is in Autonomous mode).

1. Navigate to **Admin → Admin Leave Entry** in the sidebar.
2. **Left Panel (Teachers List):** Search and select the target teacher.
3. **Center Panel (Schedule Grid):** Pick the date. The system resolves the academic calendar and displays the teacher's schedule. Select which periods the teacher is absent using:
   - **Selection Modes:** Full Day, Morning Half (periods 1-3), Afternoon Half (periods 4-5).
   - **Manual selection:** Click individual periods directly in the grid.
4. **Right Panel (Leave Details & Presets):**
   - Click one of the **Quick Presets** (e.g. `Sick (Phone)`, `Casual (Direct)`, `Official Duty`, `Family Emergency`, `Emergency`) to automatically select the Leave Type and pre-fill the Reason field with a single click.
   - Adjust fields manually if needed, and enter any optional internal administrator notes.
5. Click **Record Leave**. The leave is created, credit changes are computed, and notifications are sent immediately to the teacher.

### 12.7 Operations Mode Settings

The system supports three leave management modes, configured in **Admin → Settings**:

| Mode | Leave Approval | Substitute Assignment |
|------|---------------|----------------------|
| **Manual** | Administrator must approve each request | Administrator manually selects and assigns a substitute |
| **Assisted** | Leaves are auto-approved | System ranks candidates; Admin selects and clicks Assign |
| **Autonomous** | Leaves are auto-approved | System immediately assigns the best-suited substitute and sends notifications |

To change the mode:
1. Navigate to **Admin → Settings**.
2. Under **Campus Operations Mode**, select the desired mode.
3. Click **Save Settings**.

---

## 13. Substitute Allocation

### 13.1 Manual Substitute Assignment

When a leave request is approved (and the system is not in Autonomous mode):

1. Navigate to **Admin → Leaves**.
2. Locate the approved leave.
3. Click **Assign Sub**.
4. The system shows a ranked list of **free teachers** for the relevant Day Order and period.
5. Select a substitute from the list.
6. Click **Confirm Assignment**.

The substitute teacher receives a notification and a credit transaction is created automatically.

### 13.2 Free Teacher Detection

The system automatically identifies free teachers by:
- Checking which teachers have no timetable slot for the leave date's Day Order and period.
- Excluding teachers who already have substitute assignments for that slot.

### 13.3 Overriding a Substitute

If a substitute is already assigned and you need to change them:

1. In the leave list, find the row showing the currently assigned substitute.
2. Click the **Swap icon** next to the substitute's name.
3. Select a new candidate.
4. Confirm.

The original substitute's credit transaction is reversed, and a new one is created for the new substitute.

### 13.4 Autonomous Substitution

In **Autonomous** mode, the system selects and assigns the best substitute automatically when a leave is approved. The selection criteria are:
- Teacher is free for the Day Order and period.
- Teacher is in the same or a compatible department.
- Teacher's credit balance is considered to distribute workload fairly.

### 13.5 Teacher Self-Service Substitution (Optional)

Independently of the Manual/Assisted/Autonomous mode above, a **Super Admin** can allow teachers to find and assign their own substitute for a leave that still needs coverage — without an admin having to do it for them.

**Enabling it:**
1. Navigate to **Admin → Settings**.
2. Locate **Teacher Self-Management**.
3. Toggle it on. This is a Super Admin-only setting; Secondary Admins can view the current state but cannot change it.

**What a teacher can do once enabled** (see [User Manual §8.4](User_Manual.md) for the teacher-facing walkthrough):
- View their own leaves that still need a substitute.
- Pull the same ranked candidate list admins see and assign one directly.
- Override an existing self-assigned or admin-assigned substitute on their own leave.
- Clear all of their pending self-made assignments, or reset their substitution preferences, if they need to start over.

**What it does not change:** teachers still cannot approve or reject their own leave, and cannot assign a substitute for a colleague's leave — this only affects self-service on the teacher's own approved leave requests. Disabling the toggle at any time immediately hides these options from teachers again; it does not undo assignments already made.

> **Note:** This setting is off by default (`teacher_self_management_enabled = false`). Turning it on is a workflow decision, not a permissions bug — review it with your institution before enabling in production.

---

## 14. Credit Management

### 14.1 Viewing Credit Balances

Navigate to **Admin → Credits** to see the credit balance and transaction history for all teachers.

| Column | Description |
|--------|-------------|
| Teacher | Teacher's name |
| Department | Department |
| Balance | Current net credit balance |
| Total Earned | Total credits earned (as substitute) |
| Total Spent | Total credits debited (as leave-taker) |

### 14.2 Credit Leaderboard

The credit leaderboard ranks teachers by balance, useful for identifying teachers with the highest workload coverage and those who may need support.

### 14.3 Adjusting Credits Manually

Administrators can make manual credit adjustments (e.g., to correct an error):

1. Navigate to **Admin → Credits**.
2. Locate the teacher.
3. Click **Adjust Credits**.
4. Enter the adjustment amount (positive or negative) and a mandatory reason.
5. Click **Confirm**.

All manual adjustments are recorded in the immutable transaction ledger.

### 14.4 Credit Transaction Ledger

The credit ledger is immutable — transactions cannot be deleted. Each entry records:

| Field | Description |
|-------|-------------|
| Date | Transaction date |
| Teacher | Affected teacher |
| Type | Credit (+) or Debit (−) |
| Amount | +1 or −1 (or manual adjustment) |
| Reason | The leave/substitute reference or manual reason |
| Authorised By | The admin who authorised (for manual adjustments) |
| Balance After | Running balance |

---

## 15. Reports

FAFLOW provides several built-in reports accessible from **Admin → Calendar Reports**.

### 15.1 Working Day Report

Displays all working days within a specified date range, including:
- Date
- Day Order
- Day Type
- Notes

**Usage:** Useful for verifying the academic calendar is correctly configured before the term begins.

### 15.2 Holiday Report

Lists all non-working dates within a specified date range, including:
- Date
- Day Type (Holiday, Exam, etc.)
- Description

### 15.3 Day Order Report

Shows the number of occurrences of each Day Order (DO1–DO6) within a specified range.

**Usage:** Confirms that the Day Order distribution is balanced across the academic term.

### 15.4 Faculty Workload Report

Displays the number of actual teaching sessions for each teacher, excluding holidays and non-working days.

**Usage:** Used to assess workload fairness and plan resource allocation.

### 15.5 Exporting Reports

Most reports include an **Export CSV** button to download the data as a spreadsheet for further analysis.

---

## 16. Notifications

### 16.1 In-App Notifications

Administrators receive in-app notifications for key events. Click the **bell icon** in the top navigation to view them.

| Notification | Trigger |
|-------------|---------|
| New Leave Request | A teacher submits a leave request (in Manual mode) |
| Leave Cancellation | A teacher cancels their own leave |

### 16.2 Browser Push Notifications

FAFLOW supports browser push notifications using the VAPID protocol. To enable:

1. Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_CONTACT_EMAIL` in `backend/.env`.
2. Generate VAPID keys using a VAPID key generator (e.g., `py-vapid` or an online tool).
3. Restart the backend server.

Teachers and administrators who allow push notifications will receive real-time alerts for substitute assignments, leave approvals, and cancellations.

---

## 17. Backup

### 17.1 Automatic Backup on Factory Reset

FAFLOW automatically creates a timestamped JSON backup in `backend/backups/` immediately before any Factory Reset is executed. This backup contains all faculty data prior to deletion.

### 17.2 Manual Database Backup

**Full database backup (custom format — recommended):**

```bash
pg_dump -U postgres -F c -b -v \
  -f "faflow_backup_$(date +%Y%m%d_%H%M%S).dump" credits_db
```

**Plain SQL backup:**

```bash
pg_dump -U postgres credits_db > "faflow_backup_$(date +%Y%m%d_%H%M%S).sql"
```

### 17.3 Recommended Backup Schedule

| Frequency | Retention |
|-----------|-----------|
| Daily (2:00 AM) | 7 days |
| Weekly | 4 weeks |
| Monthly | 12 months |

### 17.4 Backup Verification

Periodically restore a backup to a test database to verify integrity:

```bash
pg_restore -U postgres -d credits_db_test -v "backup_file.dump"
```

---

## 18. Restore

> **Caution:** Restoring from a backup will overwrite all current data. Take a backup of the current state before proceeding.

### 18.1 Restore from a Custom-Format Dump

```bash
sudo systemctl stop faflow

psql -U postgres -c "DROP DATABASE credits_db;"
psql -U postgres -c "CREATE DATABASE credits_db;"
pg_restore -U postgres -d credits_db -v "backup_file.dump"

sudo systemctl start faflow
```

### 18.2 Restore from a Plain SQL Dump

```bash
psql -U postgres -d credits_db < "backup_file.sql"
```

### 18.3 Factory Reset (Emergency Recovery)

The Factory Reset restores the system to its initial deployment state. Use this only as a last resort.

**What is reset:**
- All teacher/admin accounts (except the calling Super Admin, which returns to bootstrap defaults)
- All subjects, classes, rooms
- The **entire Academic Calendar** (Academic Years, Semesters, Calendar Days)
- All timetable slots
- All leave requests and substitute assignments
- All credit transactions and balances
- All notifications and audit logs

**How to trigger (in-app):**

1. Log in as Super Admin.
2. Navigate to **Admin → Settings → Factory Reset**.
3. Enter your **current password**.
4. Type exactly: `RESET EVERYTHING`
5. Click **Confirm Reset**.

**CLI recovery (if locked out):**

```bash
cd credits-system/backend
python scripts/factory_reset.py
```

---

## 19. Security

### 19.1 Authentication

- All sessions use **JWT tokens** (configurable expiry, default 60 minutes).
- Passwords are hashed with **bcrypt** (12 rounds).
- The first-login gate blocks all routes except the setup endpoint for accounts with `must_change_credentials = True`.

### 19.2 Role-Based Access Control (RBAC)

RBAC is enforced at the API dependency layer:
- `require_admin` — allows Super Admin and Secondary Admin.
- `require_super_admin` — allows Super Admin only.
- `require_credentials_set` — blocks accounts pending first-login setup.

Routes are protected server-side. Front-end visibility controls are supplementary.

### 19.3 Database-Level Constraints

| Constraint | Protection |
|------------|------------|
| Three-way UNIQUE on timetable slots | Prevents teacher / class / room double-booking regardless of application bugs |
| `chk_calendar_day_order` CHECK | Structurally prevents a non-working day from carrying a Day Order |
| UNIQUE on `calendar_days(date)` | Prevents duplicate calendar entries for the same date |

### 19.4 Audit Trail

All administrative actions and calendar mutations are recorded in the audit log. The log cannot be modified through the application interface.

### 19.5 Production Security Checklist

| Item | Action Required |
|------|----------------|
| `SECRET_KEY` | Generate a unique 32+ character key; never use the example value |
| Default credentials | Change `admin`/`admin` immediately after first login |
| `FRONTEND_ORIGIN` | Set to the production domain only |
| HTTPS | Apply a valid TLS certificate to both frontend and backend |
| Seed data | Do not run `seed.sql` in production |
| Database backups | Configure automated daily backups |
| Firewall | Restrict direct access to port 8000; route only through Nginx |
| Academic Calendar | Populate at least one Academic Year and working Day Order before go-live |

### 19.6 CORS Configuration

The `FRONTEND_ORIGIN` environment variable controls which origins the API accepts. In production, set this to the exact frontend domain:

```
FRONTEND_ORIGIN=https://your-production-domain.com
```

Do not use wildcard (`*`) in production.

---

## 20. Troubleshooting

### "X has no academic calendar entry" on Leave / Timetable Submission

**Cause:** The selected date has not been added to the Academic Calendar.

**Resolution:** Navigate to **Admin → Calendar & Day Order** and mark the date as a Working Day with a Day Order (or as a holiday if applicable).

---

### "X is marked as holiday — no classes can be scheduled"

**Cause:** The selected date is a non-working day. This is the intended behaviour.

**Resolution:** Select a different date, or correct the calendar entry if it is incorrect.

---

### Day Order Sequence Appears Wrong After Adding a Holiday

**Cause:** Inserting or removing a holiday re-sequences all non-overridden working days downstream. Dates with a manual override retain their pinned Day Order.

**Resolution:** Check for dates showing the **override badge** in the calendar. Clear overrides if needed, or re-pin them to the correct value.

---

### Preflight Check Fails: "calendar_days is missing columns"

**Resolution:**

```bash
psql -U postgres -d credits_db -f database/migrations/003_academic_calendar.sql
```

---

### Leave Cancellation Button Disabled

**Cause:** The leave date is in the past, or it is the same day and after 10:00 AM.

**Resolution:** As an administrator, use the **Admin Cancel Override** feature to cancel on behalf of the teacher. See [Section 12.5](#125-admin-cancel-override).

---

### Cannot Connect to PostgreSQL

**Checklist:**
1. Is PostgreSQL running? (`sudo systemctl status postgresql`)
2. Is the `DATABASE_URL` in `backend/.env` correct?
3. Does the database exist? (`psql -U postgres -l`)
4. Does the PostgreSQL user have permission to access the database?

---

### Secondary Admin Limit Reached

**Symptom:** Cannot create a new Secondary Admin; the system reports the limit is reached.

**Resolution:** The maximum is **3 active Secondary Admins**. Disable one existing Secondary Admin account before creating a new one.

---

### Backend Fails to Start

**Common causes:**
- `.env` file missing or malformed.
- PostgreSQL not running.
- Migration not applied (run preflight check: `python preflight_check.py`).
- Port 8000 already in use.

**Steps:**
1. Check `backend/logs/` and `backend/debug.log` for specific error messages.
2. Run `python preflight_check.py` to verify schema integrity.
3. Verify all environment variables are set in `backend/.env`.

---

## 21. Frequently Asked Questions

**Q: Can I have more than 3 Secondary Admins?**
A: No. The system enforces a maximum of 3 active Secondary Admin accounts. This is configurable via `MAX_SECONDARY_ADMINS` in `backend/.env`, but changing it in a running production system also requires a review of your security posture.

---

**Q: What happens to a teacher's data when their account is disabled?**
A: The account is deactivated and cannot log in, but all associated data (credits, leave history, timetable slots) is preserved. You can re-enable the account at any time.

---

**Q: Can I undo a Factory Reset?**
A: Not automatically. A timestamped JSON backup is written to `backend/backups/` before the reset executes. Restoring from it requires a manual database restore operation. See [Section 18](#18-restore).

---

**Q: How do I know which mode (Manual / Assisted / Autonomous) is active?**
A: Navigate to **Admin → Settings**. The current Campus Operations Mode is shown and can be changed at any time.

---

**Q: Can teachers assign their own substitute?**
A: Only if a Super Admin has turned on **Teacher Self-Management** in **Admin → Settings**. It's off by default. When on, a teacher can pick a substitute for their own leave from the same ranked list admins use, but still cannot approve their own leave or touch anyone else's. See [Section 13.5](#135-teacher-self-service-substitution-optional).

---

**Q: A substitute was incorrectly assigned — how do I fix it?**
A: Use the **Override Substitute** feature. In the leave list, click the swap icon next to the current substitute's name, select the correct teacher, and confirm. Credits are adjusted automatically.

---

**Q: Can I delete a credit transaction?**
A: No. The credit ledger is immutable. Corrections must be made using the **Adjust Credits** feature, which adds a compensating entry rather than deleting the original.

---

**Q: A teacher submitted a leave for a holiday by mistake — why was it accepted?**
A: FAFLOW blocks leave submissions for dates marked as non-working in the Academic Calendar. If a leave was submitted for a holiday date, check whether the date was correctly marked in the calendar at the time of submission. If the calendar was updated after submission, you can reject the leave and advise the teacher accordingly.

---

**Q: How do I configure VAPID push notifications?**
A: Generate a VAPID key pair, then set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_CONTACT_EMAIL` in `backend/.env`. Restart the backend for changes to take effect.

---

*For commercial licensing and enterprise support:*
📧 **kameshgovindhan01@gmail.com**

---

*© 2026 Kamesh G. All Rights Reserved.*