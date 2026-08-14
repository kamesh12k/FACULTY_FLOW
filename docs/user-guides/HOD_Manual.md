# FAFLOW — Head of Department (HOD) Manual

This manual provides operating procedures for **Heads of Department** (Secondary Administrators, `Role.admin` with `admin_level=2`) managing academic department operations.

---

## 1. Department Administration Scope

As an HOD, your administrative authority is scoped to your assigned academic department:
- **Faculty Roster**: Create, edit, and manage Academic Teachers within your department.
- **Timetable Scheduling**: Create classes, allocate subjects, assign classrooms, and approve teacher timetable submissions.
- **Faculty Leave Approvals**: Review and act upon faculty leave requests.
- **Substitution Oversight**: Manage the departmental substitution engine, override automated recommendations when necessary, and lock sensitive assignments.
- **Credit Oversight**: Monitor departmental credit balances and make manual adjustments with mandatory audit reasons.

---

## 2. Faculty Management (`/admin/teachers`)

1. **Add New Teacher**: Click **"+ Add Teacher"**, enter Name, Email, Username, Designation, and initial password.
2. **Account Controls**: Toggle active/inactive status, update contact information, or reset passwords.
3. **Workload Review**: View individual teacher weekly teaching hours, allocated periods, and current credit standing.

---

## 3. Academic Scheduling & Master Timetable (`/admin/timetable`)

### Master Timetable Grid
- Configure master class schedules across **Day Orders (1–6)** and **Periods (1–5)**.
- **Conflict Prevention Engine**: The system automatically prevents double-booking teachers, classrooms, or class sections in the same period.
- **Bulk CSV Upload**: Upload departmental schedule matrixes via CSV for rapid semester setup.

### Timetable Approval Queue (`/admin/timetable/approvals`)
- Review timetable submissions and change requests submitted by departmental faculty.
- One-click **Approve** or **Reject** with feedback.

---

## 4. Faculty Leave Processing & Substitution Engine (`/admin/leaves`)

### Processing Leave Requests
1. Navigate to the **Leave Approvals** tab.
2. Review pending faculty leave applications (date, periods affected, reason).
3. Click **Approve** to authorize the leave. Approval immediately triggers the substitution engine.

### Autonomous Substitution Workflow
- If **Autonomous Mode** is enabled, the system automatically assigns the highest-scoring eligible teacher (free during that period, low current day workload, and subject relevance).
- If **Assisted Mode** is enabled, review the top-ranked candidates scored 0–100 and click **Assign**.
- **Manual Override / Lock**: HODs can manually change an assigned substitute or click **Lock Assignment** to prevent automatic engine rebalancing.
