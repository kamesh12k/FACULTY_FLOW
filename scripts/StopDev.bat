@echo off
echo ========================================================================
echo     Stopping FACREDIT Development Mode Services...
echo ========================================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "Write-Host '1. Stopping backend and frontend console windows...'; Get-Process | Where-Object { $_.MainWindowTitle -like '*FACREDIT_BACKEND_DEV*' -or $_.MainWindowTitle -like '*FACREDIT_FRONTEND_DEV*' } | ForEach-Object { Write-Host 'Stopping console process:' $_.Name 'with PID:' $_.Id; Stop-Process -Id $_.Id -Force }; Write-Host '2. Cleaning up orphaned processes on port 8000 (Backend)...'; Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host 'Killing backend process on port 8000, PID:' $_.OwningProcess; Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }; Write-Host '3. Cleaning up orphaned processes on port 5173 (Frontend)...'; Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host 'Killing frontend process on port 5173, PID:' $_.OwningProcess; Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }; Write-Host 'Done!'"

echo.
echo Dev services stopped successfully.
if "%1"=="-nopause" goto end
pause
:end
