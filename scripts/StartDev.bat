@echo off
setlocal enabledelayedexpansion
cls

echo ========================================================================
echo     FACREDIT - Starting Development Mode Launcher
echo ========================================================================
echo.

:: Check prerequisites
echo Checking prerequisites...
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Git is not installed or not in PATH. Please install Git.
    pause
    exit /b 1
)

where python >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH. Please install Python 3.11+.
    pause
    exit /b 1
)

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH. Please install Node.js 18+.
    pause
    exit /b 1
)
echo All core tools found (Git, Python, Node.js).
echo.

:: Setup logs directory
if not exist logs mkdir logs

:: Setup backend virtual environment
echo Setting up Python virtual environment...
if not exist backend\venv (
    echo Virtual environment not found. Creating backend\venv...
    python -m venv backend\venv
    if %errorlevel% neq 0 (
        echo ERROR: Failed to create virtual environment.
        pause
        exit /b 1
    )
)
echo Python virtual environment ready.
echo.

:: Install backend dependencies
echo Installing/Verifying backend dependencies...
call backend\venv\Scripts\activate.bat
pip install -q -r backend\requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Failed to install backend dependencies.
    pause
    exit /b 1
)
echo Backend dependencies verified.
echo.

:: Install frontend dependencies
echo Installing/Verifying frontend dependencies...
if not exist frontend\node_modules (
    echo node_modules not found in frontend. Running npm install...
    cd frontend
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: npm install failed.
        cd ..
        pause
        exit /b 1
    )
    cd ..
)
echo Frontend dependencies verified.
echo.

:: Setup environment variables
echo Setting up .env configuration...
if not exist backend\.env (
    echo Creating backend\.env from template...
    for /f %%A in ('python -c "import secrets; print(secrets.token_hex(32))"') do set SECRET_KEY=%%A
    (
        echo DATABASE_URL=postgresql://postgres@localhost:5432/credits_db
        echo SECRET_KEY=!SECRET_KEY!
        echo ALGORITHM=HS256
        echo ACCESS_TOKEN_EXPIRE_MINUTES=60
        echo VAPID_PUBLIC_KEY=
        echo VAPID_PRIVATE_KEY=
        echo VAPID_CONTACT_EMAIL=admin@example.com
        echo PERIODS_PER_DAY=5
        echo DAY_ORDER_MAX=6
        echo APP_NAME=Credits
        echo PRIMARY_COLOR=#4f46e5
        echo FRONTEND_ORIGIN=http://localhost:5173
        echo MAX_SECONDARY_ADMINS=3
    ) > backend\.env
    echo Generated backend\.env with a secure random SECRET_KEY.
) else (
    echo backend\.env already exists.
)
echo.

:: Run pre-flight check and verify database
echo Running pre-flight checks...
pushd backend
python preflight_check.py >nul 2>&1
set PREFLIGHT_ERR=%errorlevel%
popd
if %PREFLIGHT_ERR% neq 0 (
    echo WARNING: Pre-flight checks failed. This usually means the database is not initialized.
    set /p INIT_DB="Would you like to initialize/reset the local database? (Y/N): "
    if /i "!INIT_DB!"=="Y" (
        echo Initializing database...
        :: Prompt for password once to use in commands
        set /p PGPASSWORD="Enter PostgreSQL 'postgres' user password: "
        setx PGPASSWORD "!PGPASSWORD!" >nul
        
        :: Attempt database creation and schema load
        psql -h localhost -U postgres -c "CREATE DATABASE credits_db;" 2>nul
        psql -h localhost -U postgres -d credits_db -f database\schema.sql
        if %errorlevel% neq 0 (
            echo ERROR: Schema import failed. Please verify PostgreSQL is running on port 5432.
            pause
            exit /b 1
        )
        
        :: Import sample seed data for development
        echo Importing seed data...
        psql -h localhost -U postgres -d credits_db -f database\seed.sql >nul 2>&1
        echo Database initialized successfully with seed data.
    ) else (
        echo Continuing without initializing database. Note that the application may fail.
    )
) else (
    echo Pre-flight checks passed! Database is ready.
)
echo.

:: Launch services
echo Launching services...
echo Starting backend (FastAPI) on http://localhost:8000...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell -ArgumentList '-NoExit', '-Command', '$host.UI.RawUI.WindowTitle = ''FACREDIT_BACKEND_DEV''; cd backend; while ($true) { Write-Host ''=== Starting Backend (uvicorn) ===''; .\venv\Scripts\activate.ps1; cmd /c ''uvicorn app.main:app --reload --port 8000 2>&1'' | Tee-Object -FilePath ..\logs\backend_dev.log; Write-Host ''=== Backend crashed. Restarting in 3 seconds... ===''; Start-Sleep -s 3 }'"

echo Starting frontend (Vite) on http://localhost:5173...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell -ArgumentList '-NoExit', '-Command', '$host.UI.RawUI.WindowTitle = ''FACREDIT_FRONTEND_DEV''; cd frontend; while ($true) { Write-Host ''=== Starting Frontend (Vite) ===''; cmd /c ''npm run dev 2>&1'' | Tee-Object -FilePath ..\logs\frontend_dev.log; Write-Host ''=== Frontend crashed. Restarting in 3 seconds... ===''; Start-Sleep -s 3 }'"

echo.
echo Opening browser...
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo.
echo ========================================================================
echo     FACREDIT Development Services Launched!
echo ========================================================================
echo     Backend Log:  logs\backend_dev.log
echo     Frontend Log: logs\frontend_dev.log
echo.
echo     To stop all services, run StopDev.bat
echo ========================================================================
echo.

if "%1"=="-nopause" goto end
pause
:end
