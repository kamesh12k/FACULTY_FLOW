# FAFLOW — Production Troubleshooting & Diagnostics Playbook

This document provides symptom-to-resolution playbooks for diagnosing and fixing issues in FAFLOW production environments.

---

## 1. Fast Diagnostic Commands

```bash
# Check service statuses
sudo systemctl status faflow-backend
sudo systemctl status nginx
sudo systemctl status postgresql

# Inspect live backend logs
sudo journalctl -u faflow-backend -f --lines 100

# Inspect application error logs
tail -n 100 /var/log/faflow/error.log
tail -n 100 /var/log/nginx/error.log
```

---

## 2. Common Issues & Solutions

### A. Database Connection Refused (`psycopg2.OperationalError`)
- **Symptom**: API returns `500 Internal Server Error` and logs `could not connect to server: Connection refused`.
- **Resolution**:
  1. Verify PostgreSQL is running: `sudo systemctl status postgresql`.
  2. Verify credentials in `.env`: `psql "postgresql://faflow_user:password@localhost:5432/credits_db"`.
  3. Verify `pg_hba.conf` permits `md5` or `scram-sha-256` authentication for local sockets.

### B. First-Login Redirect Loop
- **Symptom**: User is unable to navigate beyond `/first-login-setup`.
- **Resolution**: Ensure the user successfully submits a valid new password meeting all complexity criteria (8+ chars, 1 letter, 1 digit, no default passwords). Check that `must_change_credentials` transitions to `false` in the database.

### C. Timetable Conflict 400 Bad Request
- **Symptom**: Slot assignment fails with `Teacher conflict`, `Room conflict`, or `Class conflict`.
- **Resolution**: Inspect the Classwise Timetable or personal teacher schedule for the target Day Order and Period Number to locate the overlapping allocation.
