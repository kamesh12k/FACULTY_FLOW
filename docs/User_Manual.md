# FAFLOW — User Manual

**Faculty Credit Management System**
Copyright © 2026 Kamesh G. All Rights Reserved.

> **Version:** 3.4.0
> **Document Revision:** 1.3


---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Login](#2-login)
3. [Dashboard](#3-dashboard)
4. [Notifications](#4-notifications)
5. [Timetable](#5-timetable)
6. [Day Orders](#6-day-orders)
7. [Leave Management](#7-leave-management)
8. [Substitute Assignments](#8-substitute-assignments)
9. [Credits](#9-credits)
10. [Academic Calendar](#10-academic-calendar)
11. [Profile](#11-profile)
12. [Password](#12-password)
13. [Logout](#13-logout)
14. [Frequently Asked Questions](#14-frequently-asked-questions)

---

## 1. Introduction

FAFLOW is a web-based Faculty Credit Management System designed for educational institutions. It enables teachers to submit leave requests, track their academic credit balance, and view their timetable — all in a single, easy-to-use interface.

This manual is intended for **teachers**, **secondary administrators**, and **principals** who use FAFLOW on a day-to-day basis.

### Who This Guide Is For

| Role | Description |
|------|-------------|
| Teacher | Submits leave requests, views timetable, tracks credit balance (scoped to their department) |
| Secondary Admin | Scoped teacher functions plus leave approval, substitute assignment, and credit management within their department |
| Department Super Admin | All department functions, settings, and managing secondary admins |
| Principal | Global read-only visibility into dashboard summaries, substitutions, and reports across all departments |
| System Admin | Global admin with full control over departments, global settings, and factory resets |

> **Note:** Features available to you depend on your assigned role. Options not available to your role will not be visible in the menu.

---

## 2. Login

### 2.1 Accessing the Application

Open your web browser and navigate to the FAFLOW URL provided by your institution (e.g., `http://localhost:5173` for local installations, or the production domain configured by your administrator).

### 2.2 Signing In

1. On the login page, enter your **Email / Username** in the first field.
2. Enter your **Password** in the second field.
3. Click **Sign In**.

> **Tip:** If this is your first time logging in with a freshly created account, or if the system has been reset, you may be automatically redirected to the **First Login Setup** page to set a new username and password.

### 2.3 First Login Setup

If you are redirected to the First Login Setup page:

1. Enter your desired **new username** (typically your institutional email address).
2. Enter a **new password** that meets the security requirements.
3. Confirm the new password.
4. Click **Complete Setup**.

You will be redirected to the main dashboard upon successful completion.

### 2.4 Login Errors

| Error Message | Cause | Resolution |
|---------------|-------|------------|
| Invalid credentials | Incorrect username or password | Double-check your credentials and try again |
| Account disabled | Your account has been deactivated | Contact your administrator |
| Credential change required | First-login setup not completed | Complete the First Login Setup |

---

## 3. Dashboard

The Dashboard is the first page you see after logging in. It provides a snapshot of your current status.

### 3.1 Teacher Dashboard

The Teacher Dashboard displays:

| Widget | Description |
|--------|-------------|
| **Credit Balance** | Your current net credit balance |
| **Pending Leaves** | Number of leave requests awaiting administrator approval |
| **Approved Leaves** | Number of approved leave requests |
| **Recent Requests** | A list of your most recent leave submissions with their current status |

### 3.2 Admin Dashboard

The Administrator Dashboard displays:

| Widget | Description |
|--------|-------------|
| **Total Teachers** | Count of active teacher accounts |
| **Pending Leaves** | Leave requests awaiting review |
| **Today's Substitutions** | Summary of substitute assignments for today |
| **Recent Activity** | Recent system events and audit log entries |

### 3.3 Today's Substitutions

The **Today's Substitutions** view (accessible from the sidebar) shows a real-time grid of all substitute assignments for the current date and Day Order.

**Grid columns:**

| Column | Description |
|--------|-------------|
| Period | The period number (1–5) |
| Class | The class assigned to that period |
| Original Teacher | The teacher who is on leave |
| Substitute Teacher | The teacher covering the class |
| Assignment Source | How the assignment was made (Manual, Autonomous, Assisted) |

**Teacher view:** Enable **"Show only my coverage"** to filter the grid to only classes you are assigned to substitute.

**Exporting:**
- Click **Export CSV** to download the grid as a spreadsheet.
- Press `Ctrl + P` to print a clean, sidebar-free layout.

---

## 4. Notifications

FAFLOW sends in-app notifications for key events. A notification badge appears on the bell icon in the top navigation bar when you have unread notifications.

### 4.1 Viewing Notifications

Click the **bell icon** in the top navigation bar to open the notification panel.

### 4.2 Notification Types

| Notification | Who Receives It | Trigger |
|-------------|-----------------|---------|
| Leave Approved | Teacher | Administrator approves your leave request |
| Leave Rejected | Teacher | Administrator rejects your leave request |
| Substitute Assigned | Teacher | You are assigned as a substitute |
| Leave Cancelled | Teacher | An administrator cancels your approved leave |

### 4.3 Browser Push Notifications

If your administrator has enabled VAPID push notifications, you may be prompted by your browser to allow notifications. Accepting this allows FAFLOW to send notifications even when the browser tab is in the background.

---

## 5. Timetable

### 5.1 Viewing Your Timetable

Navigate to **Timetable** in the sidebar to view your personal teaching schedule.

Your timetable is organized by **Day Order** (DO1 through DO6), not by weekday. This means:
- On a Day Order 1 day, you teach the slots assigned to DO1.
- On a Day Order 4 day, you teach the slots assigned to DO4.

### 5.2 Timetable Information

Each timetable slot displays:

| Field | Description |
|-------|-------------|
| Day Order | The Day Order this slot applies to (DO1–DO6) |
| Period | The period within the day (1–5) |
| Subject | The subject being taught |
| Class | The class/section |
| Room | The room or lab assigned |

### 5.3 Understanding Day Orders

Day Orders rotate sequentially (1 → 2 → 3 → 4 → 5 → 6 → 1 → …) on each working day. Non-working days (holidays, exam days, etc.) are skipped — the Day Order rotation pauses and resumes on the next working day.

**Example:**
```
Monday    →  Day Order 3  (working day)
Tuesday   →  Holiday       (Day Order rotation paused)
Wednesday →  Day Order 4  (rotation resumed)
```

---

## 6. Day Orders

### 6.1 What Is a Day Order?

A Day Order (DO1–DO6) is a rotating schedule label assigned to each working day. Because many institutions do not follow a fixed Monday–Friday pattern, Day Orders let the timetable repeat a 6-day cycle regardless of which weekday it falls on.

### 6.2 Viewing Today's Day Order

The current Day Order is shown on the **Dashboard** and on the **Apply for Leave** page when you select a date.

### 6.3 Day Order on the Leave Form

When applying for leave, selecting a date automatically shows:
- The **Day Order** for that date (e.g., `DO3`), OR
- A **Holiday** badge if the date is a non-working day.

Submission is blocked on non-working dates.

---

## 7. Leave Management

### 7.1 Applying for Leave

1. Click **Apply for Leave** in the sidebar.
2. **Select a date.** The system automatically shows the Day Order or Holiday status for the chosen date.
3. Select the **Leave Type:**
   - **Whole Day** — applies to all 5 periods.
   - **Specific Periods** — select one or more individual periods.
4. Enter a **Reason** for the leave.
5. Click **Submit Request**.

> **Note:** You cannot submit a leave request for a holiday or any other non-working date. The Submit button is disabled and an explanation is shown.

### 7.2 Batch Leave Submission

To apply for multiple periods or multiple dates at once (if enabled by your administrator), use the **Batch Leave** option from the Apply for Leave page. Select all required dates and periods, then submit in a single action.

### 7.3 Viewing Leave History

Navigate to **Leave History** (or **My Leaves**) in the sidebar to view all your past and current leave requests.

**Status indicators:**

| Status | Meaning |
|--------|---------|
| Pending | Awaiting administrator review |
| Approved | Approved; a substitute may be assigned |
| Rejected | Not approved |
| Cancelled | Cancelled by you or an administrator |

### 7.4 Cancelling a Leave Request

You can cancel a leave request subject to the following policy:

| Leave Date | Cancellation Availability |
|------------|--------------------------|
| Future date | **Available** — click Cancel at any time |
| Today (before 10:00 AM) | **Available** — click Cancel and confirm |
| Today (10:00 AM or after) | **Disabled** — contact your administrator |
| Past date | **Disabled** — cannot be cancelled |

To cancel:
1. Go to **Leave History**.
2. Find the leave request you want to cancel.
3. Click the **Cancel** button (red).
4. Confirm in the dialog that appears.

### 7.5 Leaves Recorded by Administrators

If you are unable to access the system (e.g., due to sudden illness or official duty outside campus) and inform your administrator or HOD directly, they can record the leave on your behalf.
- When an administrator records a leave for you, the request is auto-approved instantly.
- The system will immediately notify you of the leave entry via notifications.
- The substitution process (and credits computation) is triggered automatically.

---

## 8. Substitute Assignments

### 8.1 Being Assigned as a Substitute

When a colleague is on leave and you are selected as their substitute, you will receive a **notification**. Your substitution duties for the day are listed in **Today's Substitutions**.

### 8.2 Viewing Your Substitution Schedule

1. Navigate to **Today's Substitutions** from the sidebar.
2. Enable **"Show only my coverage"** to filter the grid to your assignments.

### 8.3 Credit Impact

When you cover a class as a substitute:
- You **earn +1 credit**.
- The teacher you substituted for **loses -1 credit**.

These transactions are recorded in the immutable credit ledger and visible in the **Credits** section.

### 8.4 Assigning Your Own Substitute (Self-Service)

If your administrator has turned on **Teacher Self-Management**, you can find and assign a substitute for your own leave yourself, instead of waiting for an admin to do it:

1. Go to your leave list and find an approved leave that still needs a substitute.
2. Open the **candidates** list for that leave — this shows the same ranked list of available teachers an admin would see for that Day Order and period.
3. Select a teacher and confirm the assignment. They'll receive the usual substitute-assigned notification.
4. If you need to change your pick, use the **override** option on the same leave to swap in a different teacher.
5. If you want to start over, you can **clear** your pending self-made assignments or **reset** your substitution preferences from the same screen.

> **Note:** This only applies to your own leave — you still cannot approve/reject your own leave request, and you cannot assign a substitute for someone else's leave. If you don't see this option, your administrator has not enabled it; ask them if you'd like to use it.

---

## 9. Credits

The Credit System tracks your workload balance over the academic term.

### 9.1 Understanding Credits

| Event | Credit Change |
|-------|--------------|
| You are assigned as a substitute and cover a class | **+1 credit** |
| You go on leave and a substitute covers your class | **−1 credit** |

A positive balance means you have covered more classes than you have missed. A negative balance means the reverse.

### 9.2 Viewing Your Credit Balance

Your current credit balance is shown prominently on the **Dashboard**.

Navigate to **My Credits** in the sidebar for a detailed view.

### 9.3 Credit Transaction History

The **My Credits** page shows a full, immutable history of all credit transactions:

| Column | Description |
|--------|-------------|
| Date | The date of the transaction |
| Type | Credit (+) or Debit (−) |
| Reason | The leave or substitution that triggered the transaction |
| Amount | +1 or −1 |
| Balance | Running balance after this transaction |

---

## 10. Academic Calendar

### 10.1 What Is the Academic Calendar?

The Academic Calendar defines which dates are working days, holidays, exam days, or other special event types. Every FAFLOW operation — leave submission, timetable generation, substitute assignment — is governed by the Academic Calendar.

### 10.2 Viewing the Calendar (Teacher)

Teachers can view the Academic Calendar to check:
- Whether a specific date is a working day or holiday.
- The Day Order assigned to a specific date.

Navigate to **Calendar** (if visible in your sidebar) or observe the Day Order badge when applying for leave.

### 10.3 Day Types

| Day Type | Description |
|----------|-------------|
| Working Day | A normal teaching day with a Day Order |
| Holiday | College/national/government holiday — no classes |
| College Leave Day | Institution-declared non-working day |
| Government Holiday | Officially notified national/state holiday |
| Examination Day | Scheduled exam — no regular classes |
| Special Event Day | College event — check with your department |
| Department Activity Day | Department-specific non-standard day |
| Non-Working Day | Generic non-teaching day |

---

## 11. Profile

### 11.1 Viewing Your Profile

Click your **avatar or name** in the top navigation bar and select **Profile** (if available), or navigate to the Profile section from the sidebar.

Your profile displays:
- Full name
- Email / Username
- Department
- Role

> **Note:** Profile field editing depends on your role. Teachers may have limited editing rights. Contact your administrator to update core profile information.

---

## 12. Password

### 12.1 Changing Your Password

If your administrator provides a password change option in the application:

1. Navigate to **Profile** or **Settings**.
2. Locate the **Change Password** section.
3. Enter your **current password**.
4. Enter your **new password**.
5. Confirm the new password.
6. Click **Save** or **Update Password**.

### 12.2 Forgotten Password

FAFLOW does not provide a self-service password reset email. If you have forgotten your password:

1. Contact your system administrator.
2. The administrator can reset your account credentials from the Admin Panel.
3. After a reset, you will be prompted to set a new password on your next login.

### 12.3 Password Requirements

- Minimum length as configured by your administrator.
- Avoid reusing easily guessable passwords.
- Do not share your password with others.

---

## 13. Logout

### 13.1 Signing Out

To log out of FAFLOW:

1. Click your **avatar or name** in the top navigation bar.
2. Select **Logout** from the dropdown menu.

You will be redirected to the Login page. Your session token is invalidated.

> **Tip:** Always log out when using a shared or public computer to protect your account.

---

## 14. Frequently Asked Questions

**Q: Why can't I submit a leave request for a specific date?**
A: That date may be a holiday or another non-working day in the Academic Calendar. When you select the date on the leave form, you will see a "Holiday" badge if this is the case. Choose a different date, or contact your administrator if the calendar entry appears to be incorrect.

---

**Q: I submitted a leave request but it's still "Pending" — what happens next?**
A: Your request is awaiting review by an administrator. Depending on your institution's settings, approval may be automatic or manual. You will receive a notification once a decision is made.

---

**Q: My credit balance seems wrong — who do I contact?**
A: Navigate to **My Credits** to review your transaction history. If you believe there is an error, contact your administrator with the date and details of the incorrect transaction.

---

**Q: Can I cancel a leave request after it's been approved?**
A: Yes, if the leave date is in the future or it is before 10:00 AM on the leave date. After 10:00 AM on the same day, self-cancellation is disabled and you must contact an administrator.

---

**Q: What does a positive vs. negative credit balance mean?**
A: A positive balance means you have covered more substitute classes than you have missed. A negative balance means the reverse. Credits are used to measure workload fairness across the faculty.

---

**Q: Why does my timetable show Day Orders instead of weekdays?**
A: FAFLOW uses a rotating Day Order (DO1–DO6) system because the schedule does not follow a fixed Monday–Friday pattern. The system administrator assigns a Day Order to each working date in the Academic Calendar, and your timetable applies based on today's Day Order.

---

**Q: I can't log in — what should I do?**
A: Verify your username and password. If you have forgotten your password, contact your administrator to reset your credentials. Ensure your account has not been disabled.

---

**Q: Where can I see which class I need to substitute for today?**
A: Navigate to **Today's Substitutions** from the sidebar and enable **"Show only my coverage"** to filter the list to your assignments.

---

**Q: Can I pick my own substitute instead of waiting for the admin?**
A: Only if your administrator has enabled **Teacher Self-Management** for the institution. If so, you'll see an option to view candidates and assign a substitute directly from your own leave. If you don't see this option, ask your administrator whether it's enabled. See [Section 8.4](#84-assigning-your-own-substitute-self-service).

---

*For support, contact:*
📧 **kameshgovindhan01@gmail.com**

---

*© 2026 Kamesh G. All Rights Reserved.*