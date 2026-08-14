# FAFLOW — Backup, Disaster Recovery & Restore Procedures

This document details automated database backups, disaster recovery, Point-in-Time Recovery (PITR), and emergency restoration workflows.

---

## 1. Automated Daily Backups (`pg_dump`)

Create an automated cron backup script at `/usr/local/bin/faflow-backup.sh`:

```bash
#!/bin/bash
set -eo pipefail

BACKUP_DIR="/var/backups/faflow"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="$BACKUP_DIR/credits_db_$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

# Execute compressed PostgreSQL dump
pg_dump -h localhost -U faflow_user -d credits_db | gzip > "$FILENAME"

# Retain backups for 30 days
find "$BACKUP_DIR" -type f -name "credits_db_*.sql.gz" -mtime +30 -delete

echo "FAFLOW Database Backup Completed: $FILENAME"
```

Configure in root crontab (`sudo crontab -e`):
```cron
0 2 * * * /usr/local/bin/faflow-backup.sh >> /var/log/faflow/backup.log 2>&1
```

---

## 2. Disaster Restoration Procedure

To restore a full backup into a fresh database:

```bash
# 1. Stop backend services to prevent partial writes
sudo systemctl stop faflow-backend

# 2. Re-create clean database
sudo -u postgres psql -c "DROP DATABASE IF EXISTS credits_db;"
sudo -u postgres psql -c "CREATE DATABASE credits_db OWNER faflow_user;"

# 3. Restore from compressed archive
gunzip -c /var/backups/faflow/credits_db_20260815_020000.sql.gz | psql -h localhost -U faflow_user -d credits_db

# 4. Restart services
sudo systemctl start faflow-backend
```
