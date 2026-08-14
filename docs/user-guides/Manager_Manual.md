# FAFLOW — Operational Manager User Manual

This manual provides operating procedures for **Operational Managers** (`Role.manager`) overseeing non-teaching personnel, laboratory technicians, facility staff, and operational credit ledgers.

---

## 1. Role Scope & Operational Boundaries

The Operational Manager is provisioned by the **System Administrator** to govern non-academic operational units:

### Manager Authorities:
- Create, modify, and deactivate **Laboratory Staff** (`Role.lab_staff`) and **Non-Teaching Staff** (`Role.non_teaching_staff`).
- Assign and manage **Laboratory Room Custody & Access**.
- Review, approve, and reject **Operational Staff Leave Requests**.
- Configure individual **Annual Leave Quotas / Limits** per staff member.
- Award **Compensatory Duty Credits** for overtime, weekend maintenance, or exam duties.
- Audit staff credit balances and running ledger statements.

### Explicit Role Boundaries:
- Managers do **not** administer Academic Teachers, Faculty Timetables, or HOD accounts.
- Managers do **not** configure Academic Years, Semesters, or Day Orders (managed by System Admins).

---

## 2. Manager Dashboard (`/manager/dashboard`)

The Manager Dashboard provides real-time operational KPIs:
- **Total Operational Personnel**: Count of active Laboratory and Non-Teaching Staff.
- **Laboratory Coverage**: Number of operational labs under staff management.
- **Pending Leave Approvals**: Live queue of staff leave submissions requiring review.
- **Staff Credit Ledger Status**: Overview of aggregate leave balances and duty credit awards.

---

## 3. Staff Roster & Account Administration

### Laboratory Staff Management (`/manager/lab-staff`)
1. **Create Staff Member**: Click **"+ Add Lab Staff"**, enter Full Name, Staff ID/Username, Email, Phone, Specialization, and initial password.
2. **Assign Laboratory Rooms**: Select one or more physical laboratory rooms (e.g., *CS Lab 1*, *Microprocessor Lab*) for which this staff member is responsible.
3. **Account Status**: Toggle active/inactive status or initiate credential resets.

### Non-Teaching Staff Management (`/manager/non-teaching-staff`)
1. **Create Staff Member**: Click **"+ Add Non-Teaching Staff"**, specify Designation (e.g., *Office Superintendent*, *Exam Coordinator*), Contact Info, and Department.
2. **Facility & Duty Scope**: Define assigned administrative offices and duty scopes.

### Master Staff Directory (`/manager/directory`)
- View a consolidated directory of all operational personnel with contact information, lab assignments, and active ledger balances.

---

## 4. Staff Leave Approvals & Leave Hub (`/manager/leaves`)

The **Staff Leaves Hub** provides three operational consoles:

### A. Pending Approvals Queue
- Review pending staff leave submissions with employee details, leave category, dates, session type (Full Day / FN / AN), and reason.
- One-click **Approve** or **Reject** with optional remarks.
- Approving a leave automatically deducts the exact days count (`−1.0` or `−0.5` Day) from the staff member's live credit balance and logs an audit transaction.

### B. Leave History Ledger
- Filter historical leave records across date ranges, leave categories, and specific staff members.
- Review approved, rejected, and cancelled operational leaves.

### C. Staff Credit Ledger & Quota Configuration
1. **Configure Annual Leave Quota / Limit**:
   - Click **"Set Leave Limit / Quota"** or the **"Set Limit"** button next to any staff member.
   - Adjust the baseline annual leave entitlement (e.g., from default `12.0` to `15.0` or `18.0` days/year).
   - Check **"Automatically Adjust Current Balance"** to apply the quota difference to the staff member's available credit balance.
2. **Award / Adjust Duty Credits**:
   - Click **"Award / Adjust Credits"**.
   - Select the staff member, specify the credit adjustment (+Days or −Days), and record the mandatory reason (e.g., *Sunday Lab Practical Duty*).
   - The adjustment is posted immediately to the staff member's running ledger statement.
3. **Ledger Statement Drawer**:
   - Click **"View Ledger"** to inspect a staff member's complete audit statement displaying Annual Quota, Live Balance, Total Leaves Deducted, and Duty Credits Earned.
