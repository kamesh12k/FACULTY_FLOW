# FAFLOW — Installation Guide

This guide details the complete installation procedure for deploying FAFLOW across Windows, Linux (Ubuntu/Debian, RHEL/Rocky), and macOS environments.

---

## 1. Pre-requisites & Environment Matrix

| Component | Minimum Version | Recommended Version | Purpose |
|---|---|---|---|
| **Python** | 3.11.0 | 3.12.x LTS | Core backend API, business logic, algorithms |
| **Node.js** | 18.18.0 LTS | 20.x LTS | Frontend application build & runtime toolchain |
| **npm** | 9.0.0 | 10.x | Package management for frontend dependencies |
| **PostgreSQL** | 14.0 | 16.x | Primary relational database with ACID guarantees |
| **Git** | 2.30.0 | Latest | Version control and deployment synchronization |

---

## 2. Operating System Preparation

### Ubuntu / Debian Linux
```bash
# Update package repositories
sudo apt update && sudo apt upgrade -y

# Install Python 3.12, venv, and build tools
sudo apt install -y python3.12 python3.12-venv python3-pip python3-dev build-essential libpq-dev git

# Install Node.js 20 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL 16
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### Windows (PowerShell / Command Prompt)
1. Download and install **Python 3.12** from [python.org](https://www.python.org/downloads/) (Ensure "Add python.exe to PATH" is checked).
2. Download and install **Node.js LTS** from [nodejs.org](https://nodejs.org/).
3. Download and install **PostgreSQL 16** from [postgresql.org](https://www.postgresql.org/download/windows/).
4. Ensure `psql`, `python`, and `npm` are accessible in PowerShell.

---

## 3. Database Initialization

1. Connect to PostgreSQL and create the primary application database:
```sql
-- Connect via psql as superuser
sudo -u postgres psql

-- Create database and user
CREATE DATABASE credits_db;
CREATE USER faflow_user WITH ENCRYPTED PASSWORD 'SecureDatabasePassword123!';
GRANT ALL PRIVILEGES ON DATABASE credits_db TO faflow_user;
ALTER DATABASE credits_db OWNER TO faflow_user;
\q
```

2. Apply the canonical schema:
```bash
# Execute schema migration
psql -h localhost -U faflow_user -d credits_db -f database/schema.sql

# (Optional) Seed demo dataset for testing
psql -h localhost -U faflow_user -d credits_db -f database/seed.sql
```

---

## 4. Backend Setup & Configuration

1. Navigate to the `backend/` directory:
```bash
cd backend
python3 -m venv venv

# Activate virtual environment
# Linux/macOS:
source venv/bin/activate
# Windows:
# venv\Scripts\activate
```

2. Install Python dependencies:
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

3. Create the `.env` file in `backend/`:
```ini
DATABASE_URL=postgresql://faflow_user:SecureDatabasePassword123!@localhost:5432/credits_db
SECRET_KEY=generate-a-strong-random-64-character-hex-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
LOG_LEVEL=INFO
ENVIRONMENT=production
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

4. Verify backend functionality:
```bash
# Run pytest verification suite
pytest tests/ -v
```

---

## 5. Frontend Setup & Build

1. Navigate to the `frontend/` directory:
```bash
cd ../frontend
npm install
```

2. Create the frontend configuration `.env` in `frontend/`:
```ini
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_NAME=FAFLOW
```

3. Build the production client bundle:
```bash
npm run build
```
Verify that the output generates `dist/index.html` and assets with zero errors.

---

## 6. Service Verification Checklist

| Test | Expected Output | Status |
|---|---|---|
| `GET http://localhost:8000/api/health` | `{"status": "healthy"}` | Pass |
| `GET http://localhost:8000/api/settings/public` | `{"app_name": "FAFLOW", ...}` | Pass |
| `POST http://localhost:8000/api/auth/login` | Returns JWT bearer token | Pass |
| Frontend Browser Load | Renders authentication view at `/login` | Pass |
