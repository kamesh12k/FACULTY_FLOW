@echo off
setlocal enabledelayedexpansion
cls

:: Anchor working directory to script location
cd /d "%~dp0"
set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"

echo ================================================================================
echo               STOPPING FAFLOW PRODUCTION SERVICES (GRACEFUL)                   
echo ================================================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ". '%ROOT_DIR%\deployment\process-manager.ps1'; Stop-FaflowServices -RootDir '%ROOT_DIR%'"

echo.
echo All FAFLOW production services stopped and ports verified clean.
echo.

if "%1"=="-nopause" goto end
if "%1"=="--no-pause" goto end
pause
:end
