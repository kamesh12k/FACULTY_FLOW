# FAFLOW — Environment Variables Specification

This document details all required and optional environment variables for the FAFLOW backend and frontend services.

---

## 1. Backend Environment Variables (`backend/.env`)

| Variable Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `DATABASE_URL` | String | **Yes** | — | PostgreSQL connection URI in standard format: `postgresql://user:pass@host:port/dbname` |
| `SECRET_KEY` | String | **Yes** | — | High-entropy cryptographic secret for HMAC-SHA256 JWT signature generation. |
| `ALGORITHM` | String | No | `HS256` | JWT signing algorithm. Supported: `HS256`, `HS384`, `HS512`. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Integer | No | `480` (8 hrs) | Lifetime of session bearer tokens before re-authentication is mandated. |
| `LOG_LEVEL` | String | No | `INFO` | Application log verbosity: `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`. |
| `ENVIRONMENT` | String | No | `production` | Deployment environment flag: `development`, `staging`, `production`. |
| `ALLOWED_ORIGINS` | String | No | `*` | Comma-separated list of CORS origins allowed to access the REST API. |
| `VAPID_PUBLIC_KEY` | String | No | — | Web Push notification public encryption key. |
| `VAPID_PRIVATE_KEY` | String | No | — | Web Push notification private signing key. |
| `VAPID_ADMIN_EMAIL` | String | No | — | Administrative contact email for Web Push notifications. |

---

## 2. Frontend Environment Variables (`frontend/.env`)

| Variable Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `VITE_API_BASE_URL` | String | **Yes** | `http://localhost:8000` | Base URL of the backend FastAPI service. |
| `VITE_APP_NAME` | String | No | `FAFLOW` | Client-side application title displayed in titles and navigation. |
| `VITE_ENABLE_PUSH` | Boolean | No | `true` | Enables or disables browser Push Notification registration. |

---

## 3. Sample Production `.env` File Example

```ini
# Database Connection
DATABASE_URL=postgresql://faflow_prod_user:k9$L#mP82@db.internal.muthayammal.in:5432/faflow_prod

# Cryptography & Sessions
SECRET_KEY=9f83ab29c4e1b847d02e88a31e847c1b09283471029384710293847102938471
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

# Security & CORS
ENVIRONMENT=production
LOG_LEVEL=INFO
ALLOWED_ORIGINS=https://faflow.muthayammal.in,https://app.faflow.muthayammal.in

# Web Push Notifications
VAPID_PUBLIC_KEY=BG98x_...
VAPID_PRIVATE_KEY=3948...
VAPID_ADMIN_EMAIL=sysadmin@muthayammal.in
```
