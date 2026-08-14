# FAFLOW — Security Hardening & Best Practices

This guide provides institutional system administrators with security hardening guidelines for deploying FAFLOW.

---

## 1. Operating System & Host Hardening

- **Firewall Isolation**: Only expose ports `80` (HTTP redirect) and `443` (HTTPS) to the public internet. Restrict PostgreSQL port `5432` to localhost or internal private network interfaces.
- **SSH Key Authentication**: Disable password-based SSH authentication on production application servers.
- **Non-Root Execution**: Run the FastAPI backend service under a dedicated unprivileged system account (`faflow`).

---

## 2. Secrets Management & Key Rotation

- **Cryptographic Secret Key**: Generate a 64-character hex secret for `SECRET_KEY` using `openssl rand -hex 32`.
- **Database Passwords**: Use strong passwords (16+ characters) containing uppercase, lowercase, numbers, and symbols.
- **Environment File Permissions**: Ensure `.env` is readable only by the service user (`chmod 600 backend/.env`).
