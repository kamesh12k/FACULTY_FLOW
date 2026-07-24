@echo off
REM ==========================================================================
REM Credits — Production Deployment (Windows)
REM ==========================================================================
REM
REM Automates: Python venv creation, PostgreSQL dependency check, backend
REM dependency install, .env generation, database schema init, frontend
REM build, and health checks.
REM
REM Prerequisites (install before running this script):
REM   - Python 3.11+ (from python.org)
REM   - PostgreSQL 14+ (from postgresql.org)
REM   - Node.js 18+ (from nodejs.org)
REM   - Git (from git-scm.com)
REM
REM Usage:
REM   1. Open Command Prompt as Administrator
REM   2. cd C:\path\to\credits-system
REM   3. .\scripts\deploy_windows.bat
REM
REM ==========================================================================

setlocal enabledelayedexpansion
cls

echo.
echo ========================================================================
echo     Credits - Production Deployment
echo ========================================================================
echo.

color 0A

echo [1/10] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python 3.11+ not found. Download from https://python.org
    pause
    exit /b 1
)
echo OK

echo [2/10] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js 18+ not found. Download from https://nodejs.org
    pause
    exit /b 1
)
echo OK

echo [3/10] Checking PostgreSQL installation...
psql --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: PostgreSQL 14+ not found. Download from https://postgresql.org
    pause
    exit /b 1
)
echo OK

echo [4/10] Setting up backend Python environment...
if not exist backend\venv (
    python -m venv backend\venv
    if errorlevel 1 (
        echo ERROR: Failed to create venv
        pause
        exit /b 1
    )
)
echo OK

echo [5/10] Installing backend dependencies...
call backend\venv\Scripts\activate.bat
pip install -q -r backend\requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo OK

echo [6/10] Creating .env file...
if not exist backend\.env (
    for /f %%A in ('python -c "import secrets; print(secrets.token_hex(32))"') do set SECRET_KEY=%%A
    (
        echo DATABASE_URL=postgresql://postgres:password@localhost:5432/credits_db
        echo SECRET_KEY=!SECRET_KEY!
        echo ALGORITHM=HS256
        echo ACCESS_TOKEN_EXPIRE_MINUTES=60
        echo VAPID_PUBLIC_KEY=
        echo VAPID_PRIVATE_KEY=
        echo VAPID_CONTACT_EMAIL=admin@example.com
    ) > backend\.env
    echo Created backend\.env with generated SECRET_KEY
) else (
    echo backend\.env already exists (skipped)
)
echo OK

echo [7/10] Database initialization...
echo.
echo This script will attempt to create the database and run migrations.
echo PostgreSQL must be running and accessible at localhost:5432
echo.
set /p PGPASSWORD="Enter PostgreSQL 'postgres' user password: "
setx PGPASSWORD %PGPASSWORD% >nul

psql -h localhost -U postgres -c "CREATE DATABASE credits_db;" 2>nul
psql -h localhost -U postgres -d credits_db -f database\schema.sql >nul 2>&1
if errorlevel 1 (
    echo ERROR: Database setup failed. Ensure PostgreSQL is running.
    pause
    exit /b 1
)
echo OK

echo [8/10] Running pre-flight checks...
pushd backend
python preflight_check.py >nul 2>&1
set PREFLIGHT_ERR=%errorlevel%
popd
if %PREFLIGHT_ERR% neq 0 (
    echo ERROR: Pre-flight checks failed
    pushd backend
    python preflight_check.py
    popd
    pause
    exit /b 1
)
echo OK

echo [9/10] Building frontend...
cd frontend
call npm install --silent
call npm run build --silent
if errorlevel 1 (
    echo ERROR: Frontend build failed
    pause
    exit /b 1
)
cd ..
echo OK

echo [10/10] Verifying deployment...
echo.
echo ========================================================================
echo     Deployment Complete!
echo ========================================================================
echo.
echo Next steps:
echo.
echo   1. Start PostgreSQL service (if not running)
echo   2. Run the backend:
echo        cd backend
echo        venv\Scripts\activate.bat
echo        uvicorn app.main:app --reload --port 8000
echo.
echo   3. In another terminal, serve the frontend:
echo        cd frontend
echo        npm run dev
echo.
echo   4. Open http://localhost:5173 in your browser
echo.
echo   5. Log in with:
echo        Username: admin
echo        Password: admin
echo.
echo   6. Follow the forced credential change screen, then go to
echo      "Calendar ^& Day Order" to set up your Academic Year and
echo      Day Order calendar before using leave/timetable features
echo.
echo For production setup with Gunicorn + Nginx, see DEPLOYMENT.md
echo.
pause
