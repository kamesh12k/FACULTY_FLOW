# FAFLOW — Security Audit Logs & Compliance

This document describes the immutable audit trail system in FAFLOW used for regulatory compliance, security audits, and forensic tracking.

---

## 1. Audit Log Architecture

All administrative, security, and financial-impacting events are written to the `audit_logs` table:

```sql
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id INTEGER,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 2. Monitored Security & Administrative Events

| Action Event Key | Triggering Event | Captured Payload (`details`) |
|---|---|---|
| `auth.login` | Successful user authentication | IP address, user-agent, timestamp |
| `auth.logout` | Session termination | User ID, session duration |
| `credentials.first_login_setup` | Initial password setup | Updated fields, completion status |
| `user.create` / `user.update` | User account provisioning | Role, department ID, username |
| `credits.manual_adjust` | Administrator credit change | Credit delta, reason, category |
| `staff.quota_update` | Annual quota revision | Old quota, new quota, balance delta |
| `timetable.bulk_upload` | Schedule batch import | Number of slots created, department |
| `leave.override_substitute` | Manual substitute reassignment | Leave ID, old substitute, new substitute |

---

## 3. Immutability & Retention Policy

- **Append-Only**: Audit log rows cannot be updated or deleted through standard application APIs.
- **Foreign Key Safety**: When a user account is deleted, the `user_id` in historical audit records is set to `NULL` (`ON DELETE SET NULL`), preserving the timestamp and JSON details for forensic continuity.
