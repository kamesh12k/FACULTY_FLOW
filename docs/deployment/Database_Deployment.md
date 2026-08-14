# FAFLOW — Database Deployment & Tuning Guide

This document covers PostgreSQL configuration, connection pool optimization, and maintenance operations for FAFLOW.

---

## 1. PostgreSQL Production Parameter Tuning (`postgresql.conf`)

For a standard dedicated database host (4 vCPU / 16 GB RAM):

```ini
# Memory Configuration
shared_buffers = 4GB                  # 25% of Total RAM
effective_cache_size = 12GB           # 75% of Total RAM
work_mem = 64MB                       # Sized for complex analytics & sorting
maintenance_work_mem = 1GB

# Checkpoints & WAL
min_wal_size = 1GB
max_wal_size = 16GB
checkpoint_completion_target = 0.9

# Connection Settings
max_connections = 200
```

---

## 2. Running Schema Migrations

Always execute migrations in order using standard transactional SQL:

```bash
# Apply migrations sequentially
psql -h localhost -U faflow_user -d credits_db -f database/migrations/002_add_rbac_and_audit.sql
psql -h localhost -U faflow_user -d credits_db -f database/migrations/003_academic_calendar.sql
psql -h localhost -U faflow_user -d credits_db -f database/migrations/004_autonomous_substitution.sql
psql -h localhost -U faflow_user -d credits_db -f database/migrations/005_add_cancelled_leave_status.sql
psql -h localhost -U faflow_user -d credits_db -f database/migrations/006_multi_department.sql
psql -h localhost -U faflow_user -d credits_db -f database/migrations/007_performance_indexes.sql
```
