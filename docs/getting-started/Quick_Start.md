# FAFLOW — Quick Start Guide

This guide provides the fastest route to launching and evaluating a fully operational instance of FAFLOW on a local workstation.

---

## 1. System Requirements

Ensure the following prerequisites are installed:
- **Python**: Version `3.11` or `3.12`
- **Node.js**: Version `18.x` or `20.x` LTS (with `npm`)
- **PostgreSQL**: Version `14`, `15`, or `16`
- **Git**: Version `2.35+`

---

## 2. Five-Minute Setup

### Step 1: Clone Repository & Setup Database
```bash
# Clone repository
git clone https://github.com/kamesh12k/FACULTY_FLOW.git
cd FACULTY_FLOW

# Initialize PostgreSQL database
createdb credits_db
psql -d credits_db -f database/schema.sql
psql -d credits_db -f database/seed.sql  # Optional: Loads sample demo data
```

### Step 2: Configure & Start Backend
```bash
cd backend
python -m venv venv

# Windows:
venv\Scripts\activate
# Linux/macOS:
# source venv/bin/activate

pip install -r requirements.txt

# Start backend server (Runs on port 8000)
uvicorn app.main:app --reload --port 8000
```

### Step 3: Configure & Start Frontend
Open a separate terminal window:
```bash
cd frontend
npm install

# Start Vite development server (Runs on port 5173)
npm run dev
```

---

## 3. Immediate Access & Default Credentials

Open your web browser and navigate to: **`http://localhost:5173`**

### Bootstrap System Administrator Account
The backend automatically provisions the default Super Admin on initial startup:
- **Username**: `admin`
- **Password**: `admin`

> [!IMPORTANT]
> **First-Login Credential Reset**: The application strictly enforces credential change on first login. Upon entering `admin` / `admin`, you will be redirected to the mandatory setup screen to configure a new administrator name, email, secure password, and department.

### Pre-Seeded Sample Accounts (Local Dev Demo)
If `database/seed.sql` was executed:

| User Role | Username / Email | Default Password | Department |
|---|---|---|---|
| **System Admin** | `admin` | `admin` (Forces reset) | Global |
| **HOD / Admin** | `cs.admin` | `password123` | Computer Science |
| **Manager** | `manager@muthayammal.in` | `password123` | Operations / General |
| **Teacher** | `anita.sharma@college.edu` | `password123` | Computer Science |
| **Teacher** | `meena.iyer@college.edu` | `password123` | Mathematics |
| **Lab Staff** | `lab.staff.cs@muthayammal.in` | `password123` | Computer Science |
| **Non-Teaching Staff** | `office.staff@muthayammal.in` | `password123` | General Operations |

---

## 4. One-Click Batch Scripts (Windows)

For Windows environments, FAFLOW includes automated launcher scripts in the project root:

| Script | Purpose |
|---|---|
| `StartDev.bat` | Starts both backend (port 8000) and frontend (port 5173) in development mode. |
| `StopDev.bat` | Terminates all background development processes cleanly. |
| `RestartDev.bat` | Stops and restarts development servers. |
| `StartProd.bat` | Builds production frontend assets and launches optimized Uvicorn workers. |
| `StopProd.bat` | Shuts down production background workers. |
