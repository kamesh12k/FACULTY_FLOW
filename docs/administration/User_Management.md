# FAFLOW — User Management & RBAC Governance

This document describes user provisioning, role assignments, authentication lifecycles, and credential governance in FAFLOW.

---

## 1. User Role Hierarchy & Permissions

FAFLOW implements strict Role-Based Access Control (RBAC) enforced in FastAPI route dependencies and PostgreSQL table constraints:

```text
System Administrator (admin_level=1)
  ├── Secondary Administrator / HOD (admin_level=2)
  │     └── Academic Teachers (Role.teacher)
  ├── Principal (Role.principal) [Executive Read-Only]
  └── Operational Manager (Role.manager)
        ├── Laboratory Staff (Role.lab_staff)
        └── Non-Teaching Staff (Role.non_teaching_staff)
```

---

## 2. User Lifecycle & Credential Security

### Account Creation Flow
1. **Creation**: An administrator creates a user account with a temporary password (`must_change_credentials=TRUE`).
2. **First Login Gate**: When the user logs in, the `RequireCredentialsSet` guard interceptor detects the temporary status and redirects the session to `/first-login-setup`.
3. **Password Requirements**:
   - Minimum 8 characters.
   - At least 1 letter and 1 numeric digit.
   - Prohibited from reusing default initial credentials (`admin`, `password123`).
4. **Session Activation**: Upon completing credential setup, `must_change_credentials` is set to `FALSE` and normal dashboard access is unlocked.

---

## 3. Account Activation & Deactivation

- Deactivating a user (`is_active=FALSE`) immediately invalidates all active sessions and blocks authentication at the JWT level.
- Deactivated teachers are automatically excluded from timetable conflict checks and substitution candidate pools.
