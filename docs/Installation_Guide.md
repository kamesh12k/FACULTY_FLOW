# FAFLOW — Installation Guide

**Faculty Credit Management System**
Copyright © 2026 Kamesh G. All Rights Reserved.

> **Version:** 3.4.0
> **Document Revision:** 1.3


---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Requirements](#2-system-requirements)
3. [Windows Installation](#3-windows-installation)
4. [Linux Installation](#4-linux-installation)
5. [Python Setup](#5-python-setup)
6. [PostgreSQL Installation](#6-postgresql-installation)
7. [Database Creation](#7-database-creation)
8. [Environment Variables](#8-environment-variables)
9. [Backend Installation](#9-backend-installation)
10. [Frontend Installation](#10-frontend-installation)
11. [Development Mode](#11-development-mode)
12. [Production Deployment](#12-production-deployment)
13. [Backup](#13-backup)
14. [Restore](#14-restore)
15. [Updating the Application](#15-updating-the-application)
16. [Troubleshooting](#16-troubleshooting)
17. [Support Information](#17-support-information)

---

## 1. Project Overview

FAFLOW is a production-ready, role-based Faculty Credit Management System designed for educational institutions. It manages teacher leave requests, substitute assignments, and credit-based workload balancing through a rotating **Day Order (1–6)** schedule of five periods per day.

**Key capabilities:**
- Role-based access control (Super Admin / Secondary Admin / Teacher)
- Academic Calendar management with holiday-aware scheduling
- Automatic credit tracking and immutable transaction ledger
- Day-Order-based timetable and substitute assignment engine
- Browser push notifications (VAPID)
- Factory reset with automatic timestamped backup

**Technology Stack:**

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite 5, Vanilla CSS, React Router v6, Axios |
| Backend | FastAPI, Python 3.11+, SQLAlchemy 2.0 |
| Database | SQLite (dev) / PostgreSQL 14+ (prod) |
| Authentication | JWT (python-jose), bcrypt |
| Web Server (Dev) | Uvicorn |
| Web Server (Prod) | Gunicorn + Uvicorn workers |

---

## 2. System Requirements

### Minimum Hardware

| Component | Requirement |
|-----------|-------------|
| CPU | Dual-core 2 GHz or faster |
| RAM | 4 GB |
| Disk Space | 2 GB free (excluding database growth) |
| Network | TCP/IP access between all components |

### Software Prerequisites

| Software | Version | Notes |
|----------|---------|-------|
| Python | 3.11 or later | 3.12 recommended |
| Node.js | 18 LTS or later | 20 LTS recommended |
| npm | 9 or later | Bundled with Node.js |
| PostgreSQL | 14 or later | 15 or 16 recommended |
| Git | 2.x or later | Required for deployment |

### Supported Operating Systems

- Windows 10 / 11 / Server 2019+
- Ubuntu 20.04 LTS / 22.04 LTS
- Debian 11 / 12
- RHEL / CentOS 8+ / Rocky Linux 8+

---

## 3. Windows Installation

### 3.1 Install Git for Windows

1. Download Git from [https://git-scm.com/download/win](https://git-scm.com/download/win).
2. Run the installer, accepting the defaults.
3. Verify installation:
   ```powershell
   git --version
   ```

### 3.2 Clone the Repository

```powershell
git clone https://github.com/kamesh12k/FAFLOW.git
cd FAFLOW\credits-system
```

### 3.3 Install Python (Windows)

1. Download the Python 3.12 installer from [https://www.python.org/downloads/](https://www.python.org/downloads/).
2. Run the installer. **Important:** Check **"Add Python to PATH"** before clicking Install.
3. Verify installation:
   ```powershell
   python --version
   pip --version
   ```

### 3.4 Install Node.js (Windows)

1. Download the Node.js 20 LTS installer from [https://nodejs.org/](https://nodejs.org/).
2. Run the installer, accepting the defaults.
3. Verify installation:
   ```powershell
   node --version
   npm --version
   ```

> **Note:** Continue to [Section 6](#6-postgresql-installation) for PostgreSQL, then [Section 7](#7-database-creation) for database setup.

---

## 4. Linux Installation

### 4.1 Install Required Packages (Ubuntu/Debian)

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl build-essential
```

### 4.2 Clone the Repository

```bash
git clone https://github.com/kamesh12k/FAFLOW.git
cd FAFLOW/credits-system
```

### 4.3 Install Python (Ubuntu/Debian)

```bash
sudo apt install -y python3.12 python3.12-venv python3-pip
python3 --version
pip3 --version
```

### 4.4 Install Node.js via nvm (Linux)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
node --version
npm --version
```

---

## 5. Python Setup

Python virtual environments isolate FAFLOW dependencies from the system Python. **Always use a virtual environment.**

### 5.1 Create the Virtual Environment

Navigate to the `backend` directory:

```bash
# Windows (PowerShell)
cd backend
python -m venv venv

# Linux / macOS
cd backend
python3 -m venv venv
```

### 5.2 Activate the Virtual Environment

```bash
# Windows (PowerShell)
.\venv\Scripts\Activate.ps1

# Windows (Command Prompt)
.\venv\Scripts\activate.bat

# Linux / macOS
source venv/bin/activate
```

You will see `(venv)` prefixed in your terminal when the environment is active.

### 5.3 Upgrade pip

```bash
pip install --upgrade pip
```

---

## 6. PostgreSQL Installation

### 6.1 Windows

1. Download the installer from [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/).
2. Run the installer. Note the password you set for the `postgres` superuser.
3. Ensure the **PostgreSQL bin directory** is added to your system PATH (e.g. `C:\Program Files\PostgreSQL\16\bin`).
4. Verify:
   ```powershell
   psql --version
   ```

### 6.2 Ubuntu / Debian

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 6.3 Verify PostgreSQL is Running

```bash
# Linux
sudo systemctl status postgresql

# Windows — check Services or run:
pg_isready
```

---

## 7. Database Creation

### 7.1 Create the Database

```bash
# Connect as the postgres superuser
psql -U postgres

# Inside the psql prompt:
CREATE DATABASE credits_db;
\q
```

Or using the `createdb` utility:

```bash
createdb -U postgres credits_db
```

### 7.2 Apply the Base Schema

```bash
psql -U postgres -d credits_db -f database/schema.sql
```

### 7.3 Apply Migrations (Fresh Install)

Run all migration scripts in order:

```bash
psql -U postgres -d credits_db -f database/migrations/002_add_rbac_and_audit.sql
psql -U postgres -d credits_db -f database/migrations/003_academic_calendar.sql
psql -U postgres -d credits_db -f database/migrations/004_autonomous_substitution.sql
psql -U postgres -d credits_db -f database/migrations/005_add_cancelled_leave_status.sql
psql -U postgres -d credits_db -f database/migrations/006_multi_department.sql
```

### 7.5 Seed Sample Data (Development Only)

> **Warning:** Do **not** run `seed.sql` against a production database. It inserts sample departments, teachers, and classes that are not suitable for production.

```bash
psql -U postgres -d credits_db -f database/seed.sql
```

---

## 8. Environment Variables

### 8.1 Create the Backend `.env` File

```bash
# From the backend/ directory:
cp .env.example .env
```

### 8.2 Configure the `.env` File

Open `backend/.env` in a text editor and configure the following variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:password@localhost:5432/credits_db` |
| `SECRET_KEY` | JWT signing key — **must be unique per deployment** | `<generate below>` |
| `ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime in minutes | `60` |
| `VAPID_PUBLIC_KEY` | Push notification public key | *(optional)* |
| `VAPID_PRIVATE_KEY` | Push notification private key | *(optional)* |
| `VAPID_CONTACT_EMAIL` | Push notification contact | `admin@example.com` |
| `PERIODS_PER_DAY` | Periods per working day | `5` |
| `DAY_ORDER_MAX` | Maximum Day Order value | `6` |
| `APP_NAME` | Application display name | `Credits` |
| `FRONTEND_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |
| `MAX_SECONDARY_ADMINS` | Max concurrent secondary admins | `3` |

### 8.3 Generate a Secure `SECRET_KEY`

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Copy the output and paste it as the value for `SECRET_KEY` in your `.env` file.

> **Warning:** Never commit `.env` to version control. The `.gitignore` already excludes it, but verify before pushing.

---

## 9. Backend Installation

### 9.1 Install Python Dependencies

With the virtual environment activated:

```bash
# From the backend/ directory
pip install -r requirements.txt
```

This installs FastAPI, SQLAlchemy, Uvicorn, Pydantic, python-jose, bcrypt, and all other required packages.

### 9.2 Run the Preflight Check

The preflight script verifies database schema integrity before starting the server:

```bash
python preflight_check.py
```

Expected output includes confirmation that all required tables and columns are present. If errors appear, re-apply the relevant migration scripts from [Section 7.3](#73-apply-migrations-fresh-install).

### 9.3 Start the Backend Server (Development)

```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at:
- **API Base:** `http://localhost:8000`
- **Interactive Docs (Swagger UI):** `http://localhost:8000/docs`
- **Health Check:** `http://localhost:8000/health`

---

## 10. Frontend Installation

### 10.1 Install Node Dependencies

Open a **new terminal window** and navigate to the frontend directory:

```bash
cd frontend
npm install
```

### 10.2 Configure Frontend Environment (Optional)

The default Vite configuration points the API proxy to `http://localhost:8000`. No additional configuration is required for local development.

For a custom API URL in production, update the `VITE_API_URL` or the proxy configuration in `vite.config.js`.

---

## 11. Development Mode

Running both the backend and frontend concurrently:

### 11.1 Terminal 1 — Backend

```bash
cd backend
.\venv\Scripts\Activate.ps1    # Windows
# or
source venv/bin/activate        # Linux
uvicorn app.main:app --reload --port 8000
```

### 11.2 Terminal 2 — Frontend

```bash
cd frontend
npm run dev
```

### 11.3 Access the Application

| Service | URL |
|---------|-----|
| Frontend | `http://localhost:5173` |
| Backend API | `http://localhost:8000` |
| Swagger UI | `http://localhost:8000/docs` |

### 11.4 First Login (Bootstrap Credentials)

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `admin` |

> **Important:** The system will immediately redirect you to the **First Login Setup** page, where you must set a new username and secure password before accessing any other feature.

---

## 12. Production Deployment

See `DEPLOYMENT.md` in the project root for complete production deployment instructions. The summary below covers key steps.

### 12.1 Gunicorn + Uvicorn Workers

```bash
gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 120
```

### 12.2 systemd Service (Linux)

Create `/etc/systemd/system/faflow.service`:

```ini
[Unit]
Description=FAFLOW Backend
After=network.target postgresql.service

[Service]
User=www-data
WorkingDirectory=/opt/faflow/credits-system/backend
EnvironmentFile=/opt/faflow/credits-system/backend/.env
ExecStart=/opt/faflow/credits-system/backend/venv/bin/gunicorn \
    app.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --timeout 120
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable faflow
sudo systemctl start faflow
```

### 12.3 Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend (built static files)
    location / {
        root /opt/faflow/credits-system/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 12.4 Build the Frontend for Production

```bash
cd frontend
npm run build
```

The compiled output is placed in `frontend/dist/`.

### 12.5 Production Checklist

- [ ] Unique `SECRET_KEY` (32+ characters, not the example value)
- [ ] `FRONTEND_ORIGIN` set to the actual production domain
- [ ] `seed.sql` was **not** run against the production database
- [ ] HTTPS configured (TLS certificate applied via Let's Encrypt or equivalent)
- [ ] Automated database backups enabled
- [ ] At least one Academic Year and working Day Order populated before go-live
- [ ] Firewall rules restrict direct access to port 8000 (only Nginx should proxy to it)

---

## 13. Backup

### 13.1 Automated Application Backup (Factory Reset Safety Net)

FAFLOW automatically writes a timestamped JSON backup to `backend/backups/` whenever a **Factory Reset** is triggered. This backup captures all faculty data before deletion.

### 13.2 PostgreSQL Database Backup

**Full database dump:**

```bash
pg_dump -U postgres -F c -b -v -f "faflow_backup_$(date +%Y%m%d_%H%M%S).dump" credits_db
```

**Plain SQL dump:**

```bash
pg_dump -U postgres credits_db > "faflow_backup_$(date +%Y%m%d_%H%M%S).sql"
```

### 13.3 Scheduled Backups (Linux — cron)

```bash
crontab -e
# Add the following line to run a backup daily at 2:00 AM:
0 2 * * * pg_dump -U postgres -F c credits_db > /opt/faflow/backups/faflow_$(date +\%Y\%m\%d).dump
```

### 13.4 Backup Retention Policy

Retain at least:
- Daily backups for 7 days
- Weekly backups for 4 weeks
- Monthly backups for 12 months

---

## 14. Restore

> **Caution:** Restoring a database backup will **overwrite all current data**. Ensure you have a backup of the current state before proceeding.

### 14.1 Restore from a Custom-Format Dump

```bash
# Stop the application first
sudo systemctl stop faflow

# Drop and recreate the database
psql -U postgres -c "DROP DATABASE credits_db;"
psql -U postgres -c "CREATE DATABASE credits_db;"

# Restore
pg_restore -U postgres -d credits_db -v "faflow_backup_YYYYMMDD_HHMMSS.dump"

# Restart the application
sudo systemctl start faflow
```

### 14.2 Restore from a Plain SQL Dump

```bash
psql -U postgres -d credits_db < "faflow_backup_YYYYMMDD_HHMMSS.sql"
```

---

## 15. Updating the Application

### 15.1 Pull the Latest Code

```bash
cd credits-system
git pull origin main
```

### 15.2 Apply New Migrations

Check for new migration files in `database/migrations/` and apply any that have not been run:

```bash
psql -U postgres -d credits_db -f database/migrations/<new_migration>.sql
```

### 15.3 Update Backend Dependencies

```bash
cd backend
source venv/bin/activate   # or .\venv\Scripts\Activate.ps1 on Windows
pip install --upgrade -r requirements.txt
```

### 15.4 Rebuild the Frontend

```bash
cd frontend
npm install
npm run build
```

### 15.5 Restart the Application

```bash
sudo systemctl restart faflow
```

---

## 16. Troubleshooting

### `pip install` Fails with Build Errors

**Symptom:** Errors mentioning a C/Rust compiler, or "newer than PyO3's maximum supported version".

**Resolution:**

```bash
pip install --upgrade pip
pip install --upgrade -r requirements.txt
```

If the issue persists, ensure you are using Python 3.11 or 3.12, not 3.13/3.14.

---

### Preflight Check Fails: "calendar_days is missing columns"

**Symptom:** `python preflight_check.py` reports missing columns on the `calendar_days` table.

**Resolution:**

```bash
psql -U postgres -d credits_db -f database/migrations/003_academic_calendar.sql
```

---

### Preflight Check Fails: "users is missing column department_id"

**Symptom:** `python preflight_check.py` reports missing columns on the `users` or `subjects` tables.

**Resolution:** Run the multi-department migration script:

```bash
psql -U postgres -d credits_db -f database/migrations/006_multi_department.sql
```

---

### "X has no academic calendar entry" Error

**Symptom:** Leave submission or timetable creation fails with this message.

**Resolution:** The selected date has not been added to the Academic Calendar. Navigate to **Admin → Calendar & Day Order** and mark the date as a Working Day with a Day Order.

---

### "X is marked as holiday" Error

**Symptom:** An operation is rejected because a date is marked as a non-working day.

**Resolution:** This is intentional. Either choose a different date, or if the calendar entry is incorrect, edit it from **Admin → Calendar & Day Order**.

---

### Day Order Sequence Appears Incorrect

**Symptom:** Day Orders are not sequential after adding a holiday.

**Resolution:** The engine re-sequences all non-overridden working days after any calendar change. Check for dates with a manual **override** badge on the calendar, as they retain their pinned value.

---

### Cannot Connect to PostgreSQL

**Symptom:** `psycopg2.OperationalError: could not connect to server`.

**Resolution:**
1. Verify PostgreSQL is running: `sudo systemctl status postgresql`
2. Verify the `DATABASE_URL` in `backend/.env` is correct.
3. Verify the database exists: `psql -U postgres -l`

---

### Port 8000 or 5173 Already in Use

**Resolution:**

```bash
# Find the process using the port (Linux)
sudo lsof -i :8000

# Kill it (Linux)
sudo kill -9 <PID>

# Windows (PowerShell)
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

---

## 17. Support Information

| Contact | Details |
|---------|---------|
| Developer | Kamesh G |
| Commercial Licensing | 📧 kameshgovindhan01@gmail.com |
| GitHub Repository | https://github.com/kamesh12k/FAFLOW |

> **Note:** FAFLOW is proprietary software. Use, modification, or distribution without a commercial license agreement is prohibited. See `README.md` for full copyright terms.

---

*© 2026 Kamesh G. All Rights Reserved.*