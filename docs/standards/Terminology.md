# FAFLOW — Enterprise Terminology & Glossary

This document establishes the canonical terminology and definitions for the **FAFLOW** platform. All user interfaces, error responses, database comments, source code symbols, and documentation must adhere to these standardized terms.

---

## 1. User Roles & Personas

| Canonical Term | Role Enum / Level | Description | Scope |
|---|---|---|---|
| **System Administrator** | `Role.admin` (`admin_level=1`) | Root platform administrator with cross-department authority, system configuration privileges, department provisioning, and manager creation. | Institution-wide (Global) |
| **Head of Department (HOD)** | `Role.admin` (`admin_level=2`) | Secondary department administrator with authority over teachers, timetables, subjects, classes, leaves, and substitutions within their assigned department. | Department-scoped |
| **Principal** | `Role.principal` | Academic executive with read-only institutional oversight, campus-wide coverage analytics, and reporting access. | Institution-wide (Read-Only) |
| **Operational Manager** | `Role.manager` | Operational personnel administrator who oversees Laboratory Staff and Non-Teaching Staff, duty allocations, and operational leave credit ledgers. | Operational Staff Scoped |
| **Academic Teacher** | `Role.teacher` | Teaching faculty member with personal timetable scheduling, leave submission, substitute coverage assignments, and credit ledger accounting. | Department-scoped |
| **Laboratory Staff** | `Role.lab_staff` | Technical personnel responsible for laboratory maintenance, practical session logistics, equipment upkeep, and operational leave accounting. | Operational Manager Scoped |
| **Non-Teaching Staff** | `Role.non_teaching_staff` | Administrative and operational support personnel responsible for department logistics, facility coordination, and operational leave accounting. | Operational Manager Scoped |
| **Class In-Charge Teacher** | Assignment (Attribute) | An Academic Teacher assigned responsibility for a specific class section. Grants scoped access to that class's timetable and directory. | Class-scoped |

> [!IMPORTANT]
> **Class In-Charge** is a temporal academic assignment, **not a separate database role**. It is held by an active Academic Teacher.

---

## 2. Academic & Scheduling Terminology

| Canonical Term | Definition | Database Representation |
|---|---|---|
| **Academic Year** | The operational calendar year (e.g., `2026–2027`) encompassing active academic semesters. | `academic_years` (`id`, `name`, `is_active`) |
| **Semester** | A defined term within an academic year (e.g., `Odd Semester 2026`). Scopes academic calendar dates. | `semesters` (`id`, `name`, `start_date`, `end_date`, `is_active`) |
| **Day Order** | A cyclical scheduling order (integers `1` through `6`) mapped to working calendar days. Replaces fixed weekdays to permit holiday pauses without timetable alteration. | `calendar_days.day_order` (`CHECK (day_order BETWEEN 1 AND 6)`) |
| **Calendar Day** | A specific calendar date categorized as `working`, `holiday`, `exam`, or `vacation`. Represents the single source of truth for scheduling. | `calendar_days` (`date`, `day_type`, `day_order`, `description`) |
| **Timetable Slot** | An allocation of a specific Class, Subject, Teacher, and Room on a designated Day Order (1–6) and Period Number (1–5). | `timetable_slots` (`class_id`, `subject_id`, `teacher_id`, `room_id`, `day_order`, `period_number`) |
| **Period** | A scheduled block of instruction. FAFLOW standardizes on exactly **5 periods per working day**. | `timetable_slots.period_number` (`CHECK (period_number BETWEEN 1 AND 5)`) |

---

## 3. Substitution & Workload Credit Terminology

| Canonical Term | Definition | Invariant / Business Rule |
|---|---|---|
| **Substitution** | The temporary assignment of an available Academic Teacher to cover a class slot vacated due to an approved faculty leave. | Automatic or manual allocation; prevents self-assignment and double-booking. |
| **Workload Credit** | A quantitative unit (+1 / −1) tracking faculty substitution contributions and leave consumption. | Covering 1 class awards `+1.0 Credit`; taking 1 leave session deducts `−1.0 Credit`. |
| **Credit Ledger** | An append-only audit log recording every credit addition, deduction, or manual adjustment with running balances. | `credit_transactions` (`change`, `reason`, `category`, `related_leave_id`, `created_at`) |
| **Autonomous Engine** | Algorithmic substitution scheduler evaluating teacher availability, current day workload, weekly caps, subject relevance, and fairness scores. | `autonomous_engine` with configurable operational modes (`manual`, `assisted`, `autonomous`). |
| **Emergency Coverage** | A same-day substitution request triggered within 2 hours of period start time, prioritized for immediate resolution. | Automatically flagged as `is_emergency=TRUE`. |

---

## 4. Operational Staff Terminology

| Canonical Term | Definition | Management Scope |
|---|---|---|
| **Operational Staff** | General classification encompassing Laboratory Staff (`Role.lab_staff`) and Non-Teaching Staff (`Role.non_teaching_staff`). | Managed by `Role.manager`. |
| **Staff Credit Ledger** | An independent accounting ledger tracking annual leave quotas, duty credits (+Days), and leave deductions (−Days) for operational personnel. | `staff_credits` & `staff_credit_ledger` |
| **Annual Leave Quota** | The baseline annual leave entitlement allocated to an operational staff member (default `12.0` days/year, customizable per staff). | `staff_credits.annual_quota` |
| **Compensatory Duty Credit** | Credits awarded to operational staff by a Manager for weekend duties, examination support, or laboratory maintenance. | Logged as `duty_credit_awarded` in `staff_credit_ledger`. |
| **Lab Allocation** | The mapping of a Laboratory Staff member to one or more physical laboratory rooms for equipment custody and maintenance. | `operational_staff_labs` (`staff_id`, `room_id`) |
