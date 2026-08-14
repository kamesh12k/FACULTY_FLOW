# FAFLOW — Authentication & RBAC Matrix

This document provides the exhaustive Role-Based Access Control matrix and session security specification for FAFLOW.

---

## 1. Role-Based Access Control (RBAC) Matrix

| Capability / Action | System Admin (Level 1) | HOD / Admin (Level 2) | Principal | Manager | Teacher | Staff (Lab / Non-Teaching) |
|---|---|---|---|---|---|---|
| **Department Management** | Full Control | Read-Only (Own) | Read-Only (All) | ❌ | ❌ | ❌ |
| **Manager Management** | Full Control | ❌ | Read-Only | ❌ | ❌ | ❌ |
| **Academic Calendar** | Full Control | Read-Only | Read-Only | Read-Only | Read-Only | Read-Only |
| **Teacher Accounts** | Full Control | Manage (Own Dept) | Read-Only | ❌ | ❌ | ❌ |
| **Timetable Scheduling** | Full Control | Manage (Own Dept) | Read-Only | ❌ | View / Submit | ❌ |
| **Class Timetables** | View All | View (Own Dept) | View All | ❌ | View All | ❌ |
| **Faculty Leave Approval** | Full Control | Approve (Own Dept) | Read-Only | ❌ | ❌ | ❌ |
| **Autonomous Engine Mode**| Full Control | Configure (Own) | Read-Only | ❌ | ❌ | ❌ |
| **Operational Staff Mgt** | Full Control | ❌ | Read-Only | Full Control | ❌ | ❌ |
| **Lab Custody & Allocation**| Full Control | ❌ | Read-Only | Full Control | ❌ | View Assigned |
| **Staff Leave Approvals** | Full Control | ❌ | Read-Only | Full Control | ❌ | ❌ |
| **Staff Quota & Ledgers** | Full Control | ❌ | Read-Only | Full Control | ❌ | View Own |
| **Faculty Credit Ledgers** | Adjust All | Adjust (Own Dept) | Read-Only | ❌ | View Own | ❌ |
| **Audit Logs** | Full Access | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 2. Session Token Specifications

- **Token Format**: Standard JSON Web Token (JWT) signed with HMAC-SHA256 (`HS256`).
- **Token Claims**:
  - `sub`: User identity / username.
  - `user_id`: Integer primary key.
  - `role`: Role identifier (`admin`, `principal`, `manager`, `teacher`, `lab_staff`, `non_teaching_staff`).
  - `admin_level`: Integer (`1` or `2` if admin, `null` otherwise).
  - `department_id`: Integer tenant scope (or `null` if global).
  - `must_change_credentials`: Boolean security gate flag.
  - `exp`: Unix timestamp expiration (default 480 minutes).
