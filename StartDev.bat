@echo off
setlocal enabledelayedexpansion
cls

:: Anchor working directory to script location and set ROOT_DIR
cd /d "%~dp0"
set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"

:: ANSI escape color codes setup
for /f "tokens=1,2 delims=#" %%a in ('"prompt #$H#$E# & echo on & for %%b in (1) do rem"') do set "ESC=%%b"
set "GREEN=%ESC%[92m"
set "RED=%ESC%[91m"
set "YELLOW=%ESC%[93m"
set "BLUE=%ESC%[94m"
set "CYAN=%ESC%[96m"
set "RESET=%ESC%[0m"
set "BG_BLUE=%ESC%[44m%ESC%[97m"

echo %BLUE%========================================================================%RESET%
echo %BG_BLUE%                      FAFLOW - DEVELOPMENT LAUNCHER                     %RESET%
echo %BLUE%========================================================================%RESET%
echo.

:: 1. Check Prerequisites
echo %CYAN%[1/6] Verifying system prerequisites...%RESET%
set MISSING_PREREQ=0

:: Check Git
set "GIT_EXEC="
where git >nul 2>&1
if !errorlevel! equ 0 (
    for /f "delims=" %%i in ('where git') do (
        "%%i" --version >nul 2>&1
        if !errorlevel! equ 0 (
            set "GIT_EXEC=%%i"
            goto :git_found
        )
    )
)
:git_found
if not defined GIT_EXEC (
    echo   - Git:      %RED%Not Found%RESET% [Required]
    set MISSING_PREREQ=1
) else (
    echo   - Git:      %GREEN%Found%RESET% [!GIT_EXEC!]
)

:: Check Python
set "PYTHON_EXEC="
:: Test python in PATH
where python >nul 2>&1
if !errorlevel! equ 0 (
    for /f "delims=" %%i in ('where python') do (
        "%%i" -c "import sys; sys.exit(0 if sys.version_info >= (3,11) else 1)" >nul 2>&1
        if !errorlevel! equ 0 (
            set "PYTHON_EXEC=%%i"
            goto :python_found
        )
    )
)
:: Test py launcher
where py >nul 2>&1
if !errorlevel! equ 0 (
    py -3 -c "import sys; sys.exit(0 if sys.version_info >= (3,11) else 1)" >nul 2>&1
    if !errorlevel! equ 0 (
        set "PYTHON_EXEC=py -3"
        goto :python_found
    )
)
:python_found
if not defined PYTHON_EXEC (
    echo   - Python:   %RED%Not Found%RESET% [Required 3.11+]
    set MISSING_PREREQ=1
) else (
    echo   - Python:   %GREEN%Found%RESET% [!PYTHON_EXEC!]
)

:: Check Node
set "NODE_EXEC="
where node >nul 2>&1
if !errorlevel! equ 0 (
    for /f "delims=" %%i in ('where node') do (
        "%%i" --version >nul 2>&1
        if !errorlevel! equ 0 (
            set "NODE_EXEC=%%i"
            goto :node_found
        )
    )
)
:node_found
if not defined NODE_EXEC (
    echo   - Node.js:  %RED%Not Found%RESET% [Required 18+]
    set MISSING_PREREQ=1
) else (
    echo   - Node.js:  %GREEN%Found%RESET% [!NODE_EXEC!]
)

if !MISSING_PREREQ! equ 1 (
    echo.
    echo %RED%ERROR: Please install missing prerequisites and add them to your PATH.%RESET%
    pause
    exit /b 1
)
echo %GREEN%Prerequisites verified.%RESET%
echo.

:: 2. Setup venv
echo %CYAN%[2/6] Preparing Python virtual environment...%RESET%
set "VENV_DIR=!ROOT_DIR!\backend\venv"
if exist "!VENV_DIR!" (
    "!VENV_DIR!\Scripts\python.exe" -c "import sys" >nul 2>&1
    if !errorlevel! neq 0 (
        echo   - Existing virtual environment at !VENV_DIR! is invalid. Recreating...
        rmdir /s /q "!VENV_DIR!"
    )
)

if not exist "!VENV_DIR!" (
    echo   - Creating virtual environment in !VENV_DIR!...
    !PYTHON_EXEC! -m venv "!VENV_DIR!"
    if !errorlevel! neq 0 (
        echo %RED%ERROR: Failed to create virtual environment in !VENV_DIR!.%RESET%
        pause
        exit /b 1
    )
)
echo   - Virtual environment: %GREEN%Ready%RESET% [!VENV_DIR!]
echo.

:: 3. Dependencies
echo %CYAN%[3/6] Verifying project dependencies...%RESET%

:: Find requirements file
set "REQUIREMENTS_FILE="
if exist "!ROOT_DIR!\backend\requirements.txt" set "REQUIREMENTS_FILE=!ROOT_DIR!\backend\requirements.txt"
if exist "!ROOT_DIR!\requirements.txt" if not defined REQUIREMENTS_FILE set "REQUIREMENTS_FILE=!ROOT_DIR!\requirements.txt"

if not defined REQUIREMENTS_FILE (
    echo %RED%ERROR: Requirements file not found in backend\ or root.%RESET%
    pause
    exit /b 1
)

echo   - Checking backend dependencies using !REQUIREMENTS_FILE!...
"!VENV_DIR!\Scripts\python.exe" -m pip install -q -r "!REQUIREMENTS_FILE!"
if !errorlevel! neq 0 (
    echo %RED%ERROR: Failed to install backend dependencies.%RESET%
    pause
    exit /b 1
)
echo     Backend dependencies: %GREEN%OK%RESET%

:: Find frontend dir
set "FRONTEND_DIR="
if exist "!ROOT_DIR!\frontend\package.json" set "FRONTEND_DIR=!ROOT_DIR!\frontend"
if exist "!ROOT_DIR!\package.json" if not defined FRONTEND_DIR set "FRONTEND_DIR=!ROOT_DIR!"

if not defined FRONTEND_DIR (
    echo %RED%ERROR: Frontend directory not found [package.json not located].%RESET%
    pause
    exit /b 1
)

echo   - Checking frontend dependencies in !FRONTEND_DIR!...
if not exist "!FRONTEND_DIR!\node_modules" (
    echo     node_modules not found. Running npm install...
    pushd "!FRONTEND_DIR!"
    call npm install
    popd
    if !errorlevel! neq 0 (
        echo %RED%ERROR: npm install failed in !FRONTEND_DIR!.%RESET%
        pause
        exit /b 1
    )
)
echo     Frontend dependencies: %GREEN%OK%RESET%
echo.

:: 4. Env file
echo %CYAN%[4/6] Checking environment configurations...%RESET%
if exist "!ROOT_DIR!\backend\.env" (
    echo   - Configuration file: %GREEN%Exists [.env]%RESET%
    goto env_done
)

echo   - Generating backend\.env from template...
"!VENV_DIR!\Scripts\python.exe" -c "import secrets; print(secrets.token_hex(32))" > "!ROOT_DIR!\temp_secret.txt" 2>nul
set /p SECRET_KEY=<"!ROOT_DIR!\temp_secret.txt"
del "!ROOT_DIR!\temp_secret.txt" 2>nul

(
    echo DATABASE_URL=postgresql://postgres@localhost:5432/credits_db
    echo SECRET_KEY=!SECRET_KEY!
    echo ALGORITHM=HS256
    echo ACCESS_TOKEN_EXPIRE_MINUTES=60
    echo VAPID_PUBLIC_KEY=
    echo VAPID_PRIVATE_KEY=
    echo VAPID_CONTACT_EMAIL=admin@faflow.com
    echo PERIODS_PER_DAY=5
    echo DAY_ORDER_MAX=6
    echo APP_NAME=FAFLOW
    echo PRIMARY_COLOR=#4f46e5
    echo FRONTEND_ORIGIN=http://localhost:5173
    echo MAX_SECONDARY_ADMINS=3
) > "!ROOT_DIR!\backend\.env"
echo   - %GREEN%Generated backend\.env with unique SECRET_KEY.%RESET%

:env_done
echo.

:: 5. Pre-flight Checks and DB Init
echo %CYAN%[5/6] Performing database pre-flight checks...%RESET%
if not exist "!ROOT_DIR!\logs" mkdir "!ROOT_DIR!\logs"
pushd "!ROOT_DIR!\backend"
"!VENV_DIR!\Scripts\python.exe" preflight_check.py >nul 2>&1
set PREFLIGHT_ERR=!errorlevel!
popd

if !PREFLIGHT_ERR! equ 0 (
    echo   - Database check: %GREEN%OK [Ready]%RESET%
    goto db_done
)

echo %YELLOW%WARNING: Pre-flight checks failed. Database might not be initialized.%RESET%
set /p INIT_DB="Would you like to initialize/reset the local database? (Y/N): "
if /i "!INIT_DB!" neq "Y" (
    echo %YELLOW%Continuing without database setup. Services might fail.%RESET%
    goto db_done
)

echo.
echo %CYAN%Database Initialization%RESET%
set /p PGPASSWORD="Enter PostgreSQL 'postgres' user password: "
set "PGPASSWORD=!PGPASSWORD!"

echo   - Creating database 'credits_db' if not exists...
psql -h localhost -U postgres -c "CREATE DATABASE credits_db;" 2>nul

echo   - Importing base schema...
psql -h localhost -U postgres -d credits_db -f "!ROOT_DIR!\database\schema.sql"
if !errorlevel! neq 0 (
    echo %RED%ERROR: Schema import failed. Verify PostgreSQL is running on port 5432.%RESET%
    pause
    exit /b 1
)

echo   - Seeding development data...
psql -h localhost -U postgres -d credits_db -f "!ROOT_DIR!\database\seed.sql" >nul 2>&1
echo %GREEN%Database initialized successfully with seed data.%RESET%

:db_done
echo.

:: 6. Launch
echo %CYAN%[6/6] Launching FAFLOW Development Services...%RESET%
echo   - Starting backend on http://localhost:8000...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-NoExit', '-Command', '$host.UI.RawUI.WindowTitle = ''FAFLOW_BACKEND_DEV''; cd ''!ROOT_DIR!\backend''; while ($true) { Write-Host ''=== Starting Backend (uvicorn) ==='' -ForegroundColor Cyan; & .\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000 2>&1 | Tee-Object -FilePath ..\logs\backend_dev.log; Write-Host ''=== Backend crashed. Restarting in 3 seconds... ==='' -ForegroundColor Red; Start-Sleep -s 3 }'"

echo   - Starting frontend on http://localhost:5173...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell -ArgumentList '-NoExit', '-Command', '$host.UI.RawUI.WindowTitle = ''FAFLOW_FRONTEND_DEV''; cd ''!FRONTEND_DIR!''; while ($true) { Write-Host ''=== Starting Frontend (Vite) ==='' -ForegroundColor Cyan; cmd /c ''npm run dev 2>&1'' | Tee-Object -FilePath ..\logs\frontend_dev.log; Write-Host ''=== Frontend crashed. Restarting in 3 seconds... ==='' -ForegroundColor Red; Start-Sleep -s 3 }'"

echo.
echo %GREEN%Launching browser in 3 seconds...%RESET%
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo %BLUE%========================================================================%RESET%
echo %GREEN%                FAFLOW Development Launcher Completed!%RESET%
echo %BLUE%========================================================================%RESET%
echo   Access the application:
echo     - Local Address:   %CYAN%http://localhost:5173%RESET%
for /f "usebackq tokens=*" %%i in (`powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 -Type Unicast | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' }).IPAddress"`) do (
    echo     - Network Address: %CYAN%http://%%i:5173%RESET%
)
echo.
echo   Backend logs:  logs\backend_dev.log
echo   Frontend logs: logs\frontend_dev.log
echo.
echo   To stop all running services, run: %YELLOW%StopDev.bat%RESET%
echo %BLUE%========================================================================%RESET%
echo.

if "%1"=="-nopause" goto end
pause
:end
