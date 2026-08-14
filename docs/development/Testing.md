# FAFLOW — Automated Testing & Quality Assurance

This document outlines the testing architecture, pytest test suites, coverage benchmarks, and verification workflows for FAFLOW.

---

## 1. Automated Test Execution

FAFLOW includes a comprehensive automated test suite of **328 tests** covering API routes, security guards, domain models, and business logic algorithms.

### Running Pytest Suite
```bash
cd backend
# Run full suite
venv\Scripts\python -m pytest

# Run with verbose output and coverage
venv\Scripts\python -m pytest --cov=app tests/
```

### Running Frontend Validation
```bash
cd frontend
npm run build
```
Ensures complete TypeScript/JSX syntax validity and zero bundle generation warnings.

---

## 2. Test Suite Organization

| Test Module | Coverage Domain | Status |
|---|---|---|
| `test_auth_flow.py` | Registration, JWT verification, first-login gate | 100% Pass |
| `test_timetable_service.py` | 5-period matrix, slot validation, triple-conflict checks | 100% Pass |
| `test_substitution_service.py` | Scoring algorithm, fairness metrics, emergency locks | 100% Pass |
| `test_leave_service.py` | Faculty leave approval, validation, cancellation | 100% Pass |
| `test_staff_leaves_and_credits.py` | Operational staff leaves, manager approvals, quotas | 100% Pass |
| `test_day_order_service.py` | Day Order 1–6 rotation, holiday pause invariants | 100% Pass |
| `test_routes.py` | Endpoint security, RBAC authorization boundaries | 100% Pass |
