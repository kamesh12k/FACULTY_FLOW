@echo off
setlocal enabledelayedexpansion
cls

:: Anchor working directory to script location
cd /d "%~dp0"

:: ANSI escape color codes setup
for /f "tokens=1,2 delims=#" %%a in ('"prompt #$H#$E# & echo on & for %%b in (1) do rem"') do set "ESC=%%b"
set "GREEN=%ESC%[92m"
set "BLUE=%ESC%[94m"
set "CYAN=%ESC%[96m"
set "RESET=%ESC%[0m"

echo %BLUE%========================================================================%RESET%
echo %CYAN%                 RESTARTING FAFLOW PRODUCTION SERVICES                  %RESET%
echo %BLUE%========================================================================%RESET%
echo.

call "%~dp0StopProd.bat" -nopause
echo %CYAN%Waiting for ports to clear...%RESET%
timeout /t 2 /nobreak >nul
echo.
echo %GREEN%Starting production services...%RESET%
call "%~dp0StartProd.bat" %*
