# FAFLOW — Master System Administration Manual

This manual provides authoritative operating documentation for **System Administrators** (`Role.admin` with `admin_level=1`) responsible for institution-wide configuration and multi-tenant management.

---

## 1. System Administrator Authority & Scope

The System Administrator holds root authority over the entire FAFLOW instance:
- **Tenant Management**: Provision and manage academic departments.
- **Manager Provisioning**: Create and oversee Operational Managers.
- **Academic Calendar Governance**: Define Academic Years, Semesters, Working Days, and cyclical Day Orders.
- **Cross-Department Configuration**: Manage campus-wide substitution rules and autonomous engine modes.
- **Audit & Security**: Review immutable system audit trails and execute authorized maintenance operations.

---

## 2. System Admin Console (`/admin/dashboard`)

The Admin Console displays global telemetry:
- **Active Departments**: Total academic departments provisioned.
- **Today's Campus Coverage Rate**: Real-time coverage across all active sections.
- **System Activity Log**: Live stream of administrative actions and audit events.
- **Resource Shortcuts**: Quick access to Departments, Classes, Rooms, Managers, and System Settings.

---

## 3. Manager Administration (`/admin/managers`)

1. **Create Operational Manager**: Click **"+ Add Manager"**, provide Full Name, Institutional Email, Username, and initial password.
2. **Assign Scope**: Managers oversee Laboratory Staff and Non-Teaching Staff across designated departments.
3. **Account Governance**: System Admins can activate, deactivate, or delete Manager accounts.

---

## 4. Multi-Tenant Department Workspace Switcher

System Administrators can switch workspaces instantly using the **Department Switcher** in the top navigation or sidebar:
- Selecting **"All Departments"** displays global platform analytics and cross-department controls.
- Selecting a specific department (e.g., *Computer Science*) scopes all views, timetables, and teacher rosters to that department context.
