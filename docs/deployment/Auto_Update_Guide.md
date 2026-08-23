# FAFLOW Linux Auto-Updater Module

The **FAFLOW Auto-Updater** is an automated maintenance and deployment engine for Ubuntu/Debian Linux production servers. It periodically checks the upstream Git repository, safely creates database snapshots, applies code updates, rebuilds frontend assets, restarts services, and verifies health.

---

## 1. Quick One-Command Setup

On your Linux server (`FAFLOW-SERVER-01`), navigate to the project directory and run:

```bash
sudo bash scripts/setup_auto_updater.sh
```

*(Optional: You can customize the check interval in minutes, e.g. `sudo bash scripts/setup_auto_updater.sh 10` for every 10 minutes. Default is 5 minutes).*

---

## 2. How It Works

The auto-updater runs on a lightweight `systemd.timer` cycle:

1. **Lightweight Git Fetch**: Checks `origin/main` without modifying local files. If no new commits exist, it exits immediately with zero overhead.
2. **Pre-Update Safety Backup**: If new commits are detected, it automatically runs `pg_dump` and saves a timestamped snapshot in `backend/backups/pre_update_YYYYMMDD_HHMMSS.sql`.
3. **Fast-Forward Pull**: Pulls latest commits (`git pull origin main`).
4. **Backend Dependency Sync**: If `requirements.txt` was updated, installs new packages in `backend/venv` and runs `preflight_check.py`.
5. **Frontend Asset Rebuild**: If frontend source code or dependencies changed, runs `npm install` and `npm run build`.
6. **Zero-Downtime Reload**: Gracefully reloads `faflow-backend.service` (and reloads Nginx if active).
7. **Post-Deployment Health Check**: Automatically sends a request to `http://127.0.0.1:8000/health` to confirm the new version is responding properly.
8. **Logging & Log Rotation**: All update operations are logged to `/var/log/faflow/updater.log` and automatically rotated weekly via `logrotate`.

---

## 3. Useful Commands

### Check Auto-Updater Timer Status
```bash
sudo systemctl status faflow-updater.timer
```

### View Scheduled Next Run Time
```bash
sudo systemctl list-timers | grep faflow
```

### Trigger a Manual Update Instantly
```bash
sudo bash scripts/auto_update.sh --force
```

### View Live Update Logs
```bash
sudo tail -f /var/log/faflow/updater.log
```

### Disable Auto-Updates Temporarily
```bash
sudo systemctl stop faflow-updater.timer
sudo systemctl disable faflow-updater.timer
```
