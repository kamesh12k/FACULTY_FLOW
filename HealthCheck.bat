@echo off
setlocal enabledelayedexpansion
cls

:: Anchor working directory to script location
cd /d "%~dp0"
set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"

echo ================================================================================
echo                    FAFLOW ACTIVE HEALTH AND SMOKE TEST                         
echo ================================================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ". '%ROOT_DIR%\deployment\health-check.ps1'; $res = Test-FaflowServicesHealth; Write-Host ('Backend Healthy:  ' + $res.BackendHealthy); Write-Host ('Frontend Healthy: ' + $res.FrontendHealthy); if ($res.OverallHealthy) { Write-Host 'Overall Status:   HEALTHY' -ForegroundColor Green } else { Write-Host 'Overall Status:   UNHEALTHY' -ForegroundColor Red }"

echo.
if "%1"=="-nopause" goto end
if "%1"=="--no-pause" goto end
pause
:end
