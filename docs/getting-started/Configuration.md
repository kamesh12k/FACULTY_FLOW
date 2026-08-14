# FAFLOW — Configuration Reference

This document outlines the runtime parameters, branding options, and institutional settings for the FAFLOW platform.

---

## 1. Institutional Branding & Appearance

FAFLOW supports dynamic institution branding managed in `backend/app/config.py` and persistent database settings:

| Setting Key | Default Value | Description |
|---|---|---|
| `app_name` | `FAFLOW` | Platform title displayed in page headers, email notifications, and metadata. |
| `institution_name` | `Muthayammal Engineering College` | Legal name of the academic institution. |
| `logo_emoji` | `🎓` | Favicon and header symbol if custom image logo is absent. |
| `organization_logo` | `🏛️` | Organization badge for multi-tenant workspace menus. |
| `accent_color` | `#4F46E5` (Indigo-600) | Primary branding theme color. |

---

## 2. Academic Calendar & Timetable Rules

| Parameter | Configuration Value | Constraints / Enforcement |
|---|---|---|
| **Periods Per Working Day** | `5` | Fixed integer constraint (`CHECK (period_number BETWEEN 1 AND 5)`). |
| **Day Order Cycle** | `1` to `6` | Cyclical rotation across working days (`CHECK (day_order BETWEEN 1 AND 6)`). |
| **Emergency Substitution Window** | `120 minutes` (2 hours) | Threshold under which same-day substitution requests are flagged as emergency. |
| **Annual Leave Quota (Staff)** | `12.0 days/year` | Baseline leave quota for operational staff; customizable per individual. |
| **Credit Rate (Teaching)** | `+1.0 Credit` / Class | Automatic reward for covering a colleague's class. |
| **Leave Cost (Teaching)** | `−1.0 Credit` / Session | Automatic deduction for faculty leave sessions on working days. |

---

## 3. Autonomous Substitution Engine Configuration

The autonomous engine settings can be updated globally or per department via the `/campus-operations/mode` API:

```json
{
  "mode": "autonomous",
  "enable_emergency_auto_assign": true,
  "fairness_weight": 0.4,
  "workload_weight": 0.4,
  "department_affinity_weight": 0.2,
  "allow_cross_department": false
}
```

### Operational Modes:
- **`manual`**: Substitutes must be manually selected and assigned by the teacher or HOD.
- **`assisted`**: Engine computes top recommended candidates with match scores (0–100); requires one-click confirmation.
- **`autonomous`**: Engine instantly schedules the optimal eligible teacher upon leave approval and dispatches notifications.
