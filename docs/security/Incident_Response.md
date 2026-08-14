# FAFLOW — Security Incident Response & Escalation Plan

This document establishes the incident triage protocol and response workflows for FAFLOW security events.

---

## 1. Incident Severity Classifications

| Severity Level | Definition | Response SLA |
|---|---|---|
| **Critical (P1)** | Active data breach, unauthorized privilege escalation, or full service outage. | Immediate (< 1 hour) |
| **High (P2)** | Authentication failure affecting multiple users or compromised non-admin credentials. | < 4 hours |
| **Medium (P3)** | Suspicious failed login spikes or non-exploitable configuration warning. | < 24 hours |
| **Low (P4)** | Informational security report or minor policy discrepancy. | Next Maintenance Window |

---

## 2. Emergency Account Revocation Protocol

If an administrator or faculty account is suspected of compromise:

```bash
# Connect to PostgreSQL production instance
sudo -u postgres psql -d credits_db

# 1. Immediately deactivate compromised user account
UPDATE users SET is_active = FALSE WHERE username = 'compromised.user@college.edu';

# 2. Invalidate active sessions by forcing credential reset flag
UPDATE users SET must_change_credentials = TRUE WHERE username = 'compromised.user@college.edu';
```
