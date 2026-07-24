@echo off
echo ========================================================================
echo     Restarting FACREDIT Development Mode Services...
echo ========================================================================
echo.

call StopDev.bat -nopause
echo Waiting for ports to clear...
timeout /t 2 /nobreak >nul
call StartDev.bat %*
