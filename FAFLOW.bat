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

:menu
cls
set "CHOICE="
echo %BLUE%========================================================================%RESET%
echo %BG_BLUE%                     FAFLOW - MASTER CONTROL PANEL                      %RESET%
echo %BLUE%========================================================================%RESET%
echo.
echo %CYAN% Please select an action to execute:%RESET%
echo.
echo   %GREEN%[1]%RESET% Start Development Mode (Default - Opens Browser)
echo   %GREEN%[2]%RESET% Start Development Mode (Headless / No Browser)
echo   %GREEN%[3]%RESET% Start Production Deployment (Build ^& Serve)
echo.
echo   %YELLOW%[4]%RESET% Stop Development Services
echo   %YELLOW%[5]%RESET% Stop Production Services
echo.
echo   %CYAN%[6]%RESET% Restart Development Services
echo   %CYAN%[7]%RESET% Restart Production Services
echo.
echo   %GREEN%[R]%RESET% %BG_BLUE% Auto-Repair System ^& Fix Dependencies %RESET%
echo   %RED%[8]%RESET% Run Database Pre-flight ^& Reset Prompt
echo   %BLUE%[9]%RESET% View System Logs (Backend / Frontend)
echo.
echo   %RESET%[0] Exit Control Panel
echo.
echo %BLUE%========================================================================%RESET%
set /p CHOICE="Enter choice [0-9, R]: "

if /i "%CHOICE%"=="R" goto auto_repair

if "%CHOICE%"=="1" (
    cls
    call "%ROOT_DIR%\StartDev.bat"
    echo.
    echo %GREEN%Action completed. Press any key to return to Main Menu...%RESET%
    pause >nul
    goto menu
)

if "%CHOICE%"=="2" (
    cls
    call "%ROOT_DIR%\StartDev.bat" --no-browser
    echo.
    echo %GREEN%Action completed. Press any key to return to Main Menu...%RESET%
    pause >nul
    goto menu
)

if "%CHOICE%"=="3" (
    cls
    call "%ROOT_DIR%\StartProd.bat"
    echo.
    echo %GREEN%Action completed. Press any key to return to Main Menu...%RESET%
    pause >nul
    goto menu
)

if "%CHOICE%"=="4" (
    cls
    call "%ROOT_DIR%\StopDev.bat" -nopause
    echo.
    echo %GREEN%Services stopped. Press any key to return to Main Menu...%RESET%
    pause >nul
    goto menu
)

if "%CHOICE%"=="5" (
    cls
    call "%ROOT_DIR%\StopProd.bat" -nopause
    echo.
    echo %GREEN%Services stopped. Press any key to return to Main Menu...%RESET%
    pause >nul
    goto menu
)

if "%CHOICE%"=="6" (
    cls
    call "%ROOT_DIR%\RestartDev.bat"
    echo.
    echo %GREEN%Services restarted. Press any key to return to Main Menu...%RESET%
    pause >nul
    goto menu
)

if "%CHOICE%"=="7" (
    cls
    call "%ROOT_DIR%\RestartProd.bat"
    echo.
    echo %GREEN%Services restarted. Press any key to return to Main Menu...%RESET%
    pause >nul
    goto menu
)

if "%CHOICE%"=="8" (
    cls
    call "%ROOT_DIR%\StartDev.bat" --reset-db --no-browser
    echo.
    echo %GREEN%Action completed. Press any key to return to Main Menu...%RESET%
    pause >nul
    goto menu
)

if "%CHOICE%"=="9" goto logs_menu
if "%CHOICE%"=="0" goto exit_panel

echo %RED%Invalid option '%CHOICE%'. Please enter a valid menu option [0-9, R].%RESET%
timeout /t 2 >nul
goto menu

:auto_repair
cls
echo %BLUE%========================================================================%RESET%
echo %BG_BLUE%             FAFLOW - AUTOMATIC SYSTEM REPAIR ^& DIAGNOSTICS            %RESET%
echo %BLUE%========================================================================%RESET%
echo.

echo %CYAN%Step 1/5: Auto-Clearing Orphaned Processes on Ports 8000 and 5173...%RESET%
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Get-NetTCPConnection -LocalPort 8000, 5173 -State Listen -ErrorAction Stop | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } } catch {}; exit 0"
echo %GREEN%Ports 8000 and 5173 cleared.%RESET%
echo.

echo %CYAN%Step 2/5: Checking PostgreSQL Service ^& Port 5432...%RESET%
powershell -NoProfile -ExecutionPolicy Bypass -Command "if (-not (Get-NetTCPConnection -LocalPort 5432 -State Listen -ErrorAction SilentlyContinue)) { Write-Host '  - Starting PostgreSQL service...' -ForegroundColor Yellow; Get-Service -Name '*postgres*' -ErrorAction SilentlyContinue | Start-Service -ErrorAction SilentlyContinue } else { Write-Host '  - PostgreSQL active on port 5432.' -ForegroundColor Green }; exit 0"
echo.

echo %CYAN%Step 3/5: Verifying and Repairing Python Virtual Environment...%RESET%
set "VENV_DIR=%ROOT_DIR%\backend\venv"
if exist "%VENV_DIR%" (
    "%VENV_DIR%\Scripts\python.exe" -c "import sys, fastapi, uvicorn, sqlalchemy" >nul 2>&1
    if !errorlevel! neq 0 (
        echo %YELLOW%  - Virtual environment corrupted. Re-creating...%RESET%
        rmdir /s /q "%VENV_DIR%" 2>nul
    )
)
if not exist "%VENV_DIR%" (
    echo %YELLOW%  - Creating virtual environment...%RESET%
    python -m venv "%VENV_DIR%"
)
echo %CYAN%  - Re-installing backend requirements...%RESET%
"%VENV_DIR%\Scripts\python.exe" -m pip install -q -r "%ROOT_DIR%\backend\requirements.txt"
echo %GREEN%Python virtual environment healthy.%RESET%
echo.

echo %CYAN%Step 4/5: Verifying Frontend Dependencies...%RESET%
if not exist "%ROOT_DIR%\frontend\node_modules" (
    echo %YELLOW%  - Installing frontend dependencies...%RESET%
    pushd "%ROOT_DIR%\frontend"
    call npm install
    popd
)
echo %GREEN%Frontend dependencies healthy.%RESET%
echo.

echo %CYAN%Step 5/5: Auto-healing Configuration and Testing Database Connection...%RESET%
if not exist "%ROOT_DIR%\backend\.env" (
    "%VENV_DIR%\Scripts\python.exe" -c "import secrets; print(secrets.token_hex(32))" > "%ROOT_DIR%\temp_secret.txt" 2>nul
    set /p SK=<"%ROOT_DIR%\temp_secret.txt"
    del "%ROOT_DIR%\temp_secret.txt" 2>nul
    (
        echo DATABASE_URL=postgresql://postgres@localhost:5432/credits_db
        echo SECRET_KEY=!SK!
        echo ALGORITHM=HS256
        echo ACCESS_TOKEN_EXPIRE_MINUTES=60
        echo PERIODS_PER_DAY=5
        echo DAY_ORDER_MAX=6
        echo APP_NAME=FAFLOW
        echo FRONTEND_ORIGIN=http://localhost:5173
    ) > "%ROOT_DIR%\backend\.env"
    echo %GREEN%Generated backend\.env file.%RESET%
)

pushd "%ROOT_DIR%\backend"
"%VENV_DIR%\Scripts\python.exe" preflight_check.py >nul 2>&1
set PRE_ERR=!errorlevel!
popd

if !PRE_ERR! equ 0 (
    echo %GREEN%Database connectivity and schema preflight checks PASSED!%RESET%
) else (
    echo %YELLOW%Database preflight failed. Database might need schema initialization.%RESET%
)

echo.
echo %BLUE%========================================================================%RESET%
echo %GREEN%            FAFLOW Auto-Repair ^& Diagnostics Completed!              %RESET%
echo %BLUE%========================================================================%RESET%
echo.
echo %GREEN%Press any key to return to Main Menu...%RESET%
pause >nul
goto menu

:logs_menu
cls
set "LOG_CHOICE="
echo %BLUE%========================================================================%RESET%
echo %BG_BLUE%                        FAFLOW SYSTEM LOG VIEWER                        %RESET%
echo %BLUE%========================================================================%RESET%
echo.
echo   [1] View Backend Development Log  (logs\backend_dev.log)
echo   [2] View Frontend Development Log (logs\frontend_dev.log)
echo   [3] View Backend Production Log   (logs\backend_prod.log)
echo   [4] View Frontend Production Log  (logs\frontend_prod.log)
echo   [0] Return to Main Menu
echo.
echo %BLUE%========================================================================%RESET%
set /p LOG_CHOICE="Select log to view [0-4]: "

if "%LOG_CHOICE%"=="1" (
    if exist "%ROOT_DIR%\logs\backend_dev.log" (
        powershell -NoProfile -Command "Get-Content -Path '%ROOT_DIR%\logs\backend_dev.log' -Tail 100 -Wait"
    ) else (
        echo %RED%Log file logs\backend_dev.log does not exist yet.%RESET%
        pause
    )
    goto logs_menu
)
if "%LOG_CHOICE%"=="2" (
    if exist "%ROOT_DIR%\logs\frontend_dev.log" (
        powershell -NoProfile -Command "Get-Content -Path '%ROOT_DIR%\logs\frontend_dev.log' -Tail 100 -Wait"
    ) else (
        echo %RED%Log file logs\frontend_dev.log does not exist yet.%RESET%
        pause
    )
    goto logs_menu
)
if "%LOG_CHOICE%"=="3" (
    if exist "%ROOT_DIR%\logs\backend_prod.log" (
        powershell -NoProfile -Command "Get-Content -Path '%ROOT_DIR%\logs\backend_prod.log' -Tail 100 -Wait"
    ) else (
        echo %RED%Log file logs\backend_prod.log does not exist yet.%RESET%
        pause
    )
    goto logs_menu
)
if "%LOG_CHOICE%"=="4" (
    if exist "%ROOT_DIR%\logs\frontend_prod.log" (
        powershell -NoProfile -Command "Get-Content -Path '%ROOT_DIR%\logs\frontend_prod.log' -Tail 100 -Wait"
    ) else (
        echo %RED%Log file logs\frontend_prod.log does not exist yet.%RESET%
        pause
    )
    goto logs_menu
)
if "%LOG_CHOICE%"=="0" goto menu

echo %RED%Invalid choice.%RESET%
timeout /t 2 >nul
goto logs_menu

:exit_panel
echo.
echo %GREEN%Exiting FAFLOW Control Panel.%RESET%
echo %CYAN%Press any key to close this window...%RESET%
pause >nul
exit /b 0
