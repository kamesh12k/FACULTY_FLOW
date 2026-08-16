@echo off
setlocal enabledelayedexpansion
cls

:: ============================================================================
:: FAFLOW ENTERPRISE PRODUCTION SERVER LAUNCHER & ORCHESTRATOR
:: ============================================================================
:: One-click production deployment, health monitoring, auto-recovery, and management.
:: ============================================================================

:: Anchor working directory to script location
cd /d "%~dp0"
set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"

:: Load configuration overrides if present
if exist "%ROOT_DIR%\deployment.config.bat" (
    call "%ROOT_DIR%\deployment.config.bat"
)

:: Default command options
set NO_BROWSER=0
set NO_PAUSE=0
set LAN_MODE=0
set MODE=DEPLOY

:: Parse CLI arguments
:parse_args
if "%~1"=="" goto args_done
if /i "%~1"=="--no-browser" set NO_BROWSER=1
if /i "%~1"=="-nobrowser"   set NO_BROWSER=1
if /i "%~1"=="--no-pause"   set NO_PAUSE=1
if /i "%~1"=="-nopause"     set NO_PAUSE=1
if /i "%~1"=="--lan"        set LAN_MODE=1
if /i "%~1"=="-lan"         set LAN_MODE=1
if /i "%~1"=="--diagnostic" set MODE=DIAGNOSTIC
if /i "%~1"=="-diagnostic"  set MODE=DIAGNOSTIC
if /i "%~1"=="--repair"      set MODE=REPAIR
if /i "%~1"=="-repair"       set MODE=REPAIR
if /i "%~1"=="--health"      set MODE=HEALTH
if /i "%~1"=="-health"       set MODE=HEALTH
if /i "%~1"=="--stop"        goto do_stop
if /i "%~1"=="-stop"         goto do_stop
if /i "%~1"=="--restart"     goto do_restart
if /i "%~1"=="-restart"      goto do_restart
if /i "%~1"=="--help"        goto show_help
if /i "%~1"=="-help"         goto show_help
if /i "%~1"=="-h"            goto show_help
if /i "%~1"=="/?"            goto show_help
shift
goto parse_args

:show_help
echo ================================================================================
echo                     FAFLOW PRODUCTION ORCHESTRATOR HELP                         
echo ================================================================================
echo.
echo Usage: StartProd.bat [options]
echo.
echo Modes:
echo   StartProd.bat                Start full production server with auto-orchestration
echo   StartProd.bat --diagnostic   Run read-only system, dependency, and database audit
echo   StartProd.bat --repair       Repair venv, dependencies, node_modules, and build
echo   StartProd.bat --health       Run active HTTP smoke test on running server
echo   StartProd.bat --stop         Gracefully stop all FAFLOW server processes
echo   StartProd.bat --restart      Stop, clear ports, and restart production server
echo.
echo Flags:
echo   --no-browser, -nobrowser     Do not open web browser automatically on startup
echo   --no-pause, -nopause         Do not pause console window after completion
echo   --lan, -lan                  Display and bind LAN IP access points
echo   -h, --help, /?               Display this help message
echo.
echo Configuration File:
echo   Customize deployment.config.bat to override ports, workers, and DB pool sizes.
echo ================================================================================
if %NO_PAUSE% equ 1 exit /b 0
pause
exit /b 0

:do_stop
call "%ROOT_DIR%\StopProd.bat" -nopause
if %NO_PAUSE% equ 1 exit /b 0
pause
exit /b 0

:do_restart
call "%ROOT_DIR%\RestartProd.bat" %*
exit /b 0

:args_done

:: 1. Diagnostic Mode
if "%MODE%"=="DIAGNOSTIC" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT_DIR%\deployment\diagnostic.ps1" -RootDir "%ROOT_DIR%"
    goto end_script
)

:: 2. Health Check Mode
if "%MODE%"=="HEALTH" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command ". '%ROOT_DIR%\deployment\health-check.ps1'; $res = Test-FaflowServicesHealth; Write-Host ('Backend Healthy:  ' + $res.BackendHealthy); Write-Host ('Frontend Healthy: ' + $res.FrontendHealthy); if ($res.OverallHealthy) { Write-Host 'Overall Status:   HEALTHY' -ForegroundColor Green } else { Write-Host 'Overall Status:   UNHEALTHY' -ForegroundColor Red }"
    goto end_script
)

:: 3. Repair Mode
if "%MODE%"=="REPAIR" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT_DIR%\deployment\orchestrator.ps1" -RootDir "%ROOT_DIR%" -RepairOnly
    goto end_script
)

:: 4. Full Production Deployment
set "PS_ARGS=-RootDir \"%ROOT_DIR%\""
if %NO_BROWSER% equ 1 set "PS_ARGS=%PS_ARGS% -NoBrowser"
if %NO_PAUSE% equ 1   set "PS_ARGS=%PS_ARGS% -NoPause"
if %LAN_MODE% equ 1   set "PS_ARGS=%PS_ARGS% -LanMode"

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT_DIR%\deployment\orchestrator.ps1" %PS_ARGS%

:end_script
if %NO_PAUSE% equ 1 exit /b 0
echo.
echo Press any key to close this launcher window (services continue running in background windows)...
pause >nul
