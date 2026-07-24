@echo off
setlocal enabledelayedexpansion
cls

:: Anchor working directory to script location
cd /d "%~dp0"

:: ANSI escape color codes setup
for /f "tokens=1,2 delims=#" %%a in ('"prompt #$H#$E# & echo on & for %%b in (1) do rem"') do set "ESC=%%b"
set "GREEN=%ESC%[92m"
set "RED=%ESC%[91m"
set "YELLOW=%ESC%[93m"
set "BLUE=%ESC%[94m"
set "CYAN=%ESC%[96m"
set "RESET=%ESC%[0m"

echo %BLUE%========================================================================%RESET%
echo %YELLOW%                   STOPPING FAFLOW DEVELOPMENT SERVICES                  %RESET%
echo %BLUE%========================================================================%RESET%
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "Write-Host '1. Stopping backend and frontend console windows...' -ForegroundColor Cyan; Get-Process | Where-Object { $_.MainWindowTitle -like '*FAFLOW_BACKEND_DEV*' -or $_.MainWindowTitle -like '*FAFLOW_FRONTEND_DEV*' } | ForEach-Object { Write-Host 'Stopping console process:' $_.Name 'with PID:' $_.Id -ForegroundColor Yellow; Stop-Process -Id $_.Id -Force }; Write-Host '2. Cleaning up orphaned processes on port 8000 (Backend)...' -ForegroundColor Cyan; Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -gt 4 } | ForEach-Object { Write-Host 'Killing backend process on port 8000, PID:' $_.OwningProcess -ForegroundColor Red; Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }; Write-Host '3. Cleaning up orphaned processes on port 5173 (Frontend)...' -ForegroundColor Cyan; Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -gt 4 } | ForEach-Object { Write-Host 'Killing frontend process on port 5173, PID:' $_.OwningProcess -ForegroundColor Red; Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }; Write-Host 'Done!' -ForegroundColor Green"

echo.
echo %GREEN%All development services stopped successfully.%RESET%
echo.

if "%1"=="-nopause" goto end
pause
:end
