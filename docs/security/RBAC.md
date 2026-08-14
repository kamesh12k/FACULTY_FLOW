# FAFLOW — Role-Based Access Control (RBAC) Specification

This document details the complete Role-Based Access Control matrix, permission checks, and tenancy isolation rules in FAFLOW.

---

## 1. Role Definitions & Hierarchy

```text
Super Administrator (admin_level=1)
├── Head of Department / Secondary Admin (admin_level=2, scoped to department_id)
├── Principal (Read-only institutional oversight)
└── Operational Manager (Manages lab & non-teaching staff)
```

---

## 2. Granular Permission Matrix

| Functionality | Endpoint Group | Permitted Roles | Dependency Guard |
|---|---|---|---|
| **System Settings & Dept Creation** | `/departments/`, `/settings` | Super Admin | `require_system_admin` |
| **HOD & Teacher Administration** | `/teachers/` | Super Admin, HOD | `require_admin` |
| **Operational Staff & Labs** | `/manager/staff`, `/manager/labs` | Super Admin, Manager | `require_manager_or_admin` |
| **Staff Leave Approvals** | `/manager/leaves/` | Super Admin, Manager | `require_manager_or_admin` |
| **Faculty Leave Approvals** | `/leaves/bulk-approve` | Super Admin, HOD | `require_admin` |
| **Class Timetable Scheduling** | `/timetable/slots` | Super Admin, HOD | `require_admin` |
| **Timetable Viewing** | `/timetable/class/` | All Authenticated | `get_current_user` |
| **Personal Leave Application** | `/leaves/` | Teacher, Admin | `require_teacher` |
| **Staff Leave Application** | `/staff/leaves/` | Staff, Manager | `require_staff` |
