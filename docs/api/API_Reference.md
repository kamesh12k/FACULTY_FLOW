# FAFLOW — Comprehensive REST API Reference

This document provides a route-by-route catalog of all endpoints exposed by the FAFLOW backend API.

---

## 1. Authentication & System Endpoints (`/auth`, `/api`)

| Method | Endpoint | Access Control | Description |
|---|---|---|---|
| `POST` | `/auth/login` | Public | Authenticates credentials and returns JWT token. |
| `POST` | `/auth/first-login-setup` | Authenticated (New) | Forces first-login credential update. |
| `GET` | `/auth/me` | Authenticated | Returns current session identity. |
| `GET` | `/settings/public` | Public | Returns institutional branding settings. |
| `GET` | `/health` | Public | Returns service liveness status. |

---

## 2. Department & Manager Operations (`/departments`, `/manager`)

| Method | Endpoint | Access Control | Description |
|---|---|---|---|
| `GET` | `/departments/` | Authenticated | Lists active academic departments. |
| `POST` | `/departments/` | System Admin (L1) | Provisions a new department. |
| `GET` | `/manager/staff` | Manager / Admin | Lists operational staff members. |
| `POST` | `/manager/staff` | Manager / Admin | Provisions Laboratory or Non-Teaching staff. |
| `GET` | `/manager/leaves` | Manager / Admin | Fetches operational staff leave requests. |
| `POST` | `/manager/leaves/{id}/approve` | Manager / Admin | Approves staff leave and deducts credits. |
| `POST` | `/manager/credits/adjust` | Manager / Admin | Awards compensatory duty credits (+/− Days). |
| `POST` | `/manager/credits/quota` | Manager / Admin | Updates staff annual leave quota/limit. |

---

## 3. Academic Faculty & Timetables (`/teachers`, `/timetable`, `/classes`)

| Method | Endpoint | Access Control | Description |
|---|---|---|---|
| `GET` | `/teachers/` | Authenticated | Lists teachers within active department context. |
| `GET` | `/classes/` | Authenticated | Lists academic class sections. |
| `GET` | `/timetable/class/{id}` | Authenticated | Returns full class timetable matrix. |
| `GET` | `/timetable/teacher/{id}` | Authenticated | Returns personal teacher timetable. |
| `POST` | `/timetable/slots` | Admin / HOD | Allocates an instructional slot (checks conflicts). |
| `POST` | `/timetable/bulk-upload` | Admin / HOD | Bulk uploads timetable via CSV file. |

---

## 4. Leaves & Substitution Engine (`/leaves`, `/campus-operations`)

| Method | Endpoint | Access Control | Description |
|---|---|---|---|
| `POST` | `/leaves/` | Teacher / Admin | Submits a faculty leave application. |
| `GET` | `/leaves/my` | Teacher | Returns personal leave history. |
| `PATCH` | `/leaves/{id}/approve` | Admin / HOD | Approves leave and triggers substitution engine. |
| `POST` | `/leaves/{id}/cancel` | Teacher / Admin | Cancels approved leave and refunds credits. |
| `GET` | `/leaves/{id}/recommendations` | Admin / HOD | Returns top-ranked substitute candidates. |
| `GET` | `/credits/my/transactions` | Teacher | Returns personal credit ledger audit trail. |
| `POST` | `/credits/adjust` | Admin / HOD | Manually adjusts teacher credit balance. |
