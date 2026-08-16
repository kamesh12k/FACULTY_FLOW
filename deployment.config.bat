@echo off
:: ============================================================================
:: FAFLOW PRODUCTION DEPLOYMENT CONFIGURATION OVERRIDES
:: ============================================================================
:: This file allows administrators to customize deployment parameters.
:: If any value is left blank, StartProd.bat automatically uses intelligent
:: auto-detected hardware and network defaults.
:: ============================================================================

:: --- Server Ports ---
set "FAFLOW_BACKEND_PORT=8000"
set "FAFLOW_FRONTEND_PORT=5173"

:: --- Performance & Concurrency Profile ---
:: Options: LOW | BALANCED | PERFORMANCE | AUTO (leave blank for AUTO)
set "FAFLOW_PROFILE="

:: --- Backend Workers Override ---
:: Leave blank for automatic hardware-based calculation (1-4 workers)
set "FAFLOW_WORKERS="

:: --- Database Connection Pool Overrides ---
:: Leave blank for automatic profile calculation
set "FAFLOW_DB_POOL_SIZE="
set "FAFLOW_DB_MAX_OVERFLOW="

:: --- Network & LAN Mode ---
:: true = Allow connections from LAN devices (displays LAN IP)
:: false = Local machine only
set "FAFLOW_LAN_MODE=true"

:: --- Client & Browser Launch ---
:: true = Automatically open default browser after healthy startup
:: false = Do not open browser
set "FAFLOW_AUTO_BROWSER=true"

:: --- Service Watchdog & Auto-Healing ---
:: Maximum number of automatic restarts before entering error state
set "FAFLOW_MAX_RESTARTS=5"

:: --- Logging Level ---
:: Options: DEBUG | INFO | WARNING | ERROR
set "FAFLOW_LOG_LEVEL=INFO"
