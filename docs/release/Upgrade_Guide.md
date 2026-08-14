# FAFLOW — Version Upgrade & Migration Guide

This guide assists system administrators in upgrading existing FAFLOW deployments from prior versions to Version 5.0 Enterprise.

---

## 1. Upgrading from v4.x to v5.0

### Step 1: Database Migration
Execute migration script `008_add_manager_and_staff.sql` to provision operational staff and ledger tables:

```bash
psql -h localhost -U faflow_user -d credits_db -f database/migrations/008_add_manager_and_staff.sql
```

### Step 2: Backend Codebase Upgrade
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt --upgrade
pytest tests/ -v
sudo systemctl restart faflow-backend
```

### Step 3: Frontend Client Build
```bash
cd frontend
npm install
npm run build
sudo systemctl reload nginx
```
