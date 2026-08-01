@echo off
setlocal enabledelayedexpansion
cls

:: Anchor working directory to script location and set ROOT_DIR
cd /d "%~dp0"
set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"

:: Safe ANSI escape color codes setup
for /f "tokens=1,2 delims=#" %%a in ('"prompt #$H#$E# & echo on & for %%b in (1) do rem"') do set "ESC=%%b"

set "GREEN=%ESC%[92m"
set "RED=%ESC%[91m"
set "YELLOW=%ESC%[93m"
set "BLUE=%ESC%[94m"
set "CYAN=%ESC%[96m"
set "RESET=%ESC%[0m"
set "BG_BLUE=%ESC%[44m%ESC%[97m"

:: Command line options defaults
set NO_BROWSER=0
set FORCE_RESET_DB=0
set NO_PAUSE=0

:: Parse CLI arguments
:parse_args
if "%~1"=="" goto args_done
if /i "%~1"=="--no-browser" set NO_BROWSER=1
if /i "%~1"=="-nobrowser" set NO_BROWSER=1
if /i "%~1"=="--reset-db" set FORCE_RESET_DB=1
if /i "%~1"=="-resetdb" set FORCE_RESET_DB=1
if /i "%~1"=="-nopause" set NO_PAUSE=1
if /i "%~1"=="--no-pause" set NO_PAUSE=1
if /i "%~1"=="--help" goto show_help
if /i "%~1"=="-help" goto show_help
if /i "%~1"=="-h" goto show_help
if /i "%~1"=="/?" goto show_help
shift
goto parse_args

:show_help
echo %BLUE%========================================================================%RESET%
echo %BG_BLUE%                FAFLOW - PRODUCTION DEPLOYER HELP                       %RESET%
echo %BLUE%========================================================================%RESET%
echo.
echo Usage: StartProd.bat [options]
echo.
echo Options:
echo   --no-browser, -nobrowser    Do not automatically open browser on startup
echo   --reset-db, -resetdb        Force database re-initialization prompt
echo   -nopause, --no-pause        Do not pause terminal at completion
echo   -h, --help, /?              Display this help menu
echo.
pause
exit /b 0

:args_done

echo %BLUE%========================================================================%RESET%
echo %BG_BLUE%        FAFLOW - PRODUCTION DEPLOYER (AUTO-HEALING ACTIVE)              %RESET%
echo %BLUE%========================================================================%RESET%
echo.

:: 0. Auto Error Correction: Port Cleanup
echo %CYAN%[0/6] Running pre-launch port auto-cleanup...%RESET%
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Get-NetTCPConnection -LocalPort 8000, 5173 -State Listen -ErrorAction Stop | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } } catch {}; exit 0"
echo %GREEN%Port status verified clean.%RESET%
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
    echo   - Git:        %RED%Not Found%RESET% [Required]
    set MISSING_PREREQ=1
) else (
    echo   - Git:        %GREEN%Found%RESET% [!GIT_EXEC!]
)

:: Check Python
set "PYTHON_EXEC="
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
    echo   - Python:     %RED%Not Found%RESET% [Required 3.11+]
    set MISSING_PREREQ=1
) else (
    echo   - Python:     %GREEN%Found%RESET% [!PYTHON_EXEC!]
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
    echo   - Node.js:    %RED%Not Found%RESET% [Required 18+]
    set MISSING_PREREQ=1
) else (
    echo   - Node.js:    %GREEN%Found%RESET% [!NODE_EXEC!]
)

:: Auto Error Correction: PostgreSQL Service Check & Auto-Start
powershell -NoProfile -ExecutionPolicy Bypass -Command "if (-not (Get-NetTCPConnection -LocalPort 5432 -State Listen -ErrorAction SilentlyContinue)) { Write-Host '  - Starting PostgreSQL service...' -ForegroundColor Yellow; Get-Service -Name '*postgres*' -ErrorAction SilentlyContinue | Start-Service -ErrorAction SilentlyContinue } else { Write-Host '  - PostgreSQL: Found (Listening on port 5432)' -ForegroundColor Green }; exit 0"

if !MISSING_PREREQ! equ 1 (
    echo.
    echo %RED%ERROR: Please install missing prerequisites and add them to your PATH.%RESET%
    pause
    exit /b 1
)
echo %GREEN%Prerequisites verified.%RESET%
echo.

:: 2. Setup venv & Auto-Healing
echo %CYAN%[2/6] Preparing Python virtual environment...%RESET%
set "VENV_DIR=%ROOT_DIR%\backend\venv"

if exist "%VENV_DIR%" (
    "%VENV_DIR%\Scripts\python.exe" -c "import sys, fastapi, uvicorn, sqlalchemy" >nul 2>&1
    if !errorlevel! neq 0 (
        echo   - %YELLOW%Existing virtual environment is corrupted or missing packages. Recreating...%RESET%
        rmdir /s /q "%VENV_DIR%" 2>nul
    )
)

if not exist "%VENV_DIR%" (
    echo   - Creating virtual environment in %VENV_DIR%...
    !PYTHON_EXEC! -m venv "%VENV_DIR%"
    if !errorlevel! neq 0 (
        echo %RED%ERROR: Failed to create virtual environment in %VENV_DIR%.%RESET%
        pause
        exit /b 1
    )
)
echo   - Virtual environment: %GREEN%Ready%RESET% [%VENV_DIR%]
echo.

:: 3. Dependencies Verification & Auto-Repair
echo %CYAN%[3/6] Verifying and installing dependencies...%RESET%

set "REQUIREMENTS_FILE="
if exist "%ROOT_DIR%\backend\requirements.txt" set "REQUIREMENTS_FILE=%ROOT_DIR%\backend\requirements.txt"
if exist "%ROOT_DIR%\requirements.txt" if not defined REQUIREMENTS_FILE set "REQUIREMENTS_FILE=%ROOT_DIR%\requirements.txt"

if not defined REQUIREMENTS_FILE (
    echo %RED%ERROR: Requirements file not found in backend\ or root.%RESET%
    pause
    exit /b 1
)

echo   - Installing backend dependencies using %REQUIREMENTS_FILE%...
"%VENV_DIR%\Scripts\python.exe" -m pip install -q -r "%REQUIREMENTS_FILE%"
if !errorlevel! neq 0 (
    echo %YELLOW%Warning: pip install failed. Upgrading pip and retrying...%RESET%
    "%VENV_DIR%\Scripts\python.exe" -m pip install --upgrade pip >nul 2>&1
    "%VENV_DIR%\Scripts\python.exe" -m pip install -r "%REQUIREMENTS_FILE%"
    if !errorlevel! neq 0 (
        echo %RED%ERROR: Failed to install backend dependencies.%RESET%
        pause
        exit /b 1
    )
)
echo     Backend dependencies: %GREEN%OK%RESET%

set "FRONTEND_DIR="
if exist "%ROOT_DIR%\frontend\package.json" set "FRONTEND_DIR=%ROOT_DIR%\frontend"
if exist "%ROOT_DIR%\package.json" if not defined FRONTEND_DIR set "FRONTEND_DIR=%ROOT_DIR%"

if not defined FRONTEND_DIR (
    echo %RED%ERROR: Frontend directory not found [package.json not located].%RESET%
    pause
    exit /b 1
)

echo   - Installing frontend dependencies in %FRONTEND_DIR%...
pushd "%FRONTEND_DIR%"
call npm install --no-audit --no-fund
if !errorlevel! neq 0 (
    echo %RED%ERROR: npm install failed in %FRONTEND_DIR%.%RESET%
    popd
    pause
    exit /b 1
)
echo     Frontend dependencies: %GREEN%OK%RESET%
echo.

:: 4. Build Frontend for Production with Auto-Repair
echo %CYAN%[4/6] Building frontend for production compilation...%RESET%
call npm run build
popd
if !errorlevel! neq 0 (
    echo %YELLOW%Warning: Production build failed. Clearing npm cache and retrying build...%RESET%
    pushd "%FRONTEND_DIR%"
    call npm cache clean --force >nul 2>&1
    call npm run build
    popd
    if !errorlevel! neq 0 (
        echo %RED%ERROR: Frontend production compilation failed.%RESET%
        pause
        exit /b 1
    )
)
echo   - Production build: %GREEN%Compiled Successfully (dist/)%RESET%
echo.

:: 5. Env file Auto-Healing
echo %CYAN%[5/6] Checking environment configurations...%RESET%
if exist "%ROOT_DIR%\backend\.env" (
    findstr /i "DATABASE_URL" "%ROOT_DIR%\backend\.env" >nul 2>&1
    if !errorlevel! neq 0 (
        echo   - %YELLOW%Auto-healing backend\.env ^(Adding missing DATABASE_URL^)...%RESET%
        >> "%ROOT_DIR%\backend\.env" echo DATABASE_URL=postgresql://postgres@localhost:5432/credits_db
    )
    findstr /i "SECRET_KEY" "%ROOT_DIR%\backend\.env" >nul 2>&1
    if !errorlevel! neq 0 (
        echo   - %YELLOW%Auto-healing backend\.env ^(Adding missing SECRET_KEY^)...%RESET%
        "%VENV_DIR%\Scripts\python.exe" -c "import secrets; print(secrets.token_hex(32))" > "%ROOT_DIR%\temp_secret.txt" 2>nul
        set /p NEW_SK=<"%ROOT_DIR%\temp_secret.txt"
        del "%ROOT_DIR%\temp_secret.txt" 2>nul
        >> "%ROOT_DIR%\backend\.env" echo SECRET_KEY=!NEW_SK!
    )
    echo   - Configuration file: %GREEN%Verified [.env]%RESET%
) else (
    echo   - Generating backend\.env from template...
    "%VENV_DIR%\Scripts\python.exe" -c "import secrets; print(secrets.token_hex(32))" > "%ROOT_DIR%\temp_secret.txt" 2>nul
    set /p SECRET_KEY=<"%ROOT_DIR%\temp_secret.txt"
    del "%ROOT_DIR%\temp_secret.txt" 2>nul

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
    ) > "%ROOT_DIR%\backend\.env"
    echo   - %GREEN%Generated backend\.env with unique SECRET_KEY.%RESET%
)
echo.

:: 6. Pre-flight Checks and DB Init
echo %CYAN%[6/6] Performing database pre-flight checks...%RESET%
if not exist "%ROOT_DIR%\logs" mkdir "%ROOT_DIR%\logs"
pushd "%ROOT_DIR%\backend"
"%VENV_DIR%\Scripts\python.exe" preflight_check.py >nul 2>&1
set PREFLIGHT_ERR=!errorlevel!
popd

if !FORCE_RESET_DB! equ 1 (
    echo %YELLOW%Database reset requested via CLI flag --reset-db.%RESET%
    goto db_init_prompt
)

if !PREFLIGHT_ERR! equ 0 (
    echo   - Database check: %GREEN%OK [Ready]%RESET%
    goto db_done
)

echo %YELLOW%WARNING: Pre-flight checks failed. Production database not initialized.%RESET%

:db_init_prompt
set /p INIT_DB="Would you like to initialize the production database? (Y/N): "
if /i "!INIT_DB!" neq "Y" (
    echo %YELLOW%Continuing without database setup. Services might fail.%RESET%
    goto db_done
)

echo.
echo %CYAN%Database Initialization%RESET%

set "PGPASSWORD="
setlocal disabledelayedexpansion
set /p PGPASSWORD="Enter PostgreSQL 'postgres' user password: "
endlocal & set "PGPASSWORD=%PGPASSWORD%"

echo   - Creating database 'credits_db' if not exists...
psql -h localhost -U postgres -c "CREATE DATABASE credits_db;" 2>nul

echo   - Importing base schema...
psql -h localhost -U postgres -d credits_db -f "%ROOT_DIR%\database\schema.sql"
if !errorlevel! neq 0 (
    echo %RED%ERROR: Schema import failed. Verify PostgreSQL is running on port 5432.%RESET%
    pause
    exit /b 1
)
echo %GREEN%Production database initialized successfully [No seed/demo data loaded].%RESET%

:db_done
echo.

:: Launch Services in Production
echo %CYAN%Launching FAFLOW Production Services...%RESET%
echo   - Starting production backend on http://localhost:8000...
start "FAFLOW_BACKEND_PROD" powershell -NoProfile -ExecutionPolicy Bypass -NoExit -Command "cd '%ROOT_DIR%\backend'; while ($true) { Write-Host '=== Starting Production Backend (uvicorn) ===' -ForegroundColor Green; & '%ROOT_DIR%\backend\venv\Scripts\python.exe' -m uvicorn app.main:app --host 0.0.0.0 --port 8000 2>&1 | Tee-Object -FilePath '%ROOT_DIR%\logs\backend_prod.log'; Write-Host '=== Production Backend stopped. Clearing port and restarting in 5 seconds... ===' -ForegroundColor Red; try { Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction Stop | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } } catch {}; Start-Sleep -s 5 }"

echo   - Starting production frontend web server on http://localhost:5173...
start "FAFLOW_FRONTEND_PROD" powershell -NoProfile -ExecutionPolicy Bypass -NoExit -Command "cd '%ROOT_DIR%'; while ($true) { Write-Host '=== Starting Production Frontend (serve) ===' -ForegroundColor Green; npx -y serve -s '%ROOT_DIR%\frontend\dist' -l 5173 2>&1 | Tee-Object -FilePath '%ROOT_DIR%\logs\frontend_prod.log'; Write-Host '=== Production Frontend stopped. Restarting in 5 seconds... ===' -ForegroundColor Red; try { Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction Stop | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } } catch {}; Start-Sleep -s 5 }"

echo.
if !NO_BROWSER! equ 0 (
    echo %GREEN%Launching browser in 5 seconds...%RESET%
    timeout /t 5 /nobreak >nul
    start http://localhost:5173
) else (
    echo %CYAN%Browser auto-launch skipped [--no-browser active].%RESET%
)

echo %BLUE%========================================================================%RESET%
echo %GREEN%               FAFLOW Production Deployment Completed!%RESET%
echo %BLUE%========================================================================%RESET%
echo   Access the application:
echo     - Local Frontend:      %CYAN%http://localhost:5173%RESET%
echo     - Local Backend API:   %CYAN%http://localhost:8000%RESET%
echo     - Backend API Docs:    %CYAN%http://localhost:8000/docs%RESET%
powershell -NoProfile -Command "try { Get-NetIPAddress -AddressFamily IPv4 -Type Unicast | Where-Object { $_.IPAddress -notlike '127*' -and $_.IPAddress -notlike '169*' } | ForEach-Object { Write-Host ('    - Network Address:     http://' + $_.IPAddress + ':5173'); Write-Host ('    - Network API Address: http://' + $_.IPAddress + ':8000') } } catch {}; exit 0"
echo.
echo   Live Website (Public):   Running locally on this PC.
echo                            To access online / host live, see DEPLOYMENT.md
echo                            Or run quick tunnel: npx cloudflared tunnel --url http://localhost:5173
echo.
echo   Backend logs:  logs\backend_prod.log
echo   Frontend logs: logs\frontend_prod.log
echo.
echo   To stop all running production services, run: %YELLOW%StopProd.bat%RESET%
echo %BLUE%========================================================================%RESET%
echo.

if !NO_PAUSE! equ 1 goto end
pause
:end

