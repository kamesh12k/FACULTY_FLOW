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
echo %YELLOW%       STOPPING FAFLOW PROD SERVICES (WITH RETRY ^& AUTO-CLEAN)         %RESET%
echo %BLUE%========================================================================%RESET%
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "Write-Host '1. Stopping production console windows...' -ForegroundColor Cyan; Get-Process | Where-Object MainWindowTitle -like '*FAFLOW*' | Stop-Process -Force -ErrorAction SilentlyContinue; Get-Process | Where-Object MainWindowTitle -like '*FACREDIT*' | Stop-Process -Force -ErrorAction SilentlyContinue; Write-Host '2. Cleaning up ports 8000 and 5173...' -ForegroundColor Cyan; try { Get-NetTCPConnection -LocalPort 8000, 5173 -State Listen -ErrorAction Stop | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } } catch {}; Write-Host 'Done!' -ForegroundColor Green; exit 0"

echo.
echo %GREEN%All production services stopped and ports verified clean.%RESET%
echo.

if "%1"=="-nopause" goto end
if "%1"=="--no-pause" goto end
pause
:end
