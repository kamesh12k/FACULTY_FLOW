# FAFLOW — Department Management & Multi-Tenancy

This document explains multi-department architecture, tenant isolation, and administrative delegation in FAFLOW.

---

## 1. Department Architecture & Model

Departments represent the primary organizational units of an institution:
- Stored in the `departments` table (`id`, `name`, `code`, `is_active`, `autonomous_mode`).
- Every Academic Teacher belongs to exactly one department (`User.department_id`).
- Academic classes, timetable slots, subjects, and secondary administrators are linked to their respective departments.

---

## 2. Multi-Department Data Scoping

FAFLOW enforces tenant scoping via `get_tenant_department_id` dependency injection in FastAPI:

1. **System Administrator**:
   - When no specific department filter is applied (`tenant_department_id=None`), cross-department data is returned.
   - When a specific department is selected via the workspace switcher, queries are scoped to that department.
2. **Head of Department (Secondary Admin)**:
   - Queries are automatically filtered by `admin.department_id`.
   - Access to other departments' teachers, timetables, or leaves is strictly forbidden (`403 Forbidden`).
3. **Cross-Department Substitutions**:
   - If enabled by the System Administrator, departments can permit inter-department substitution coverage when no free teachers are available within the primary department.
