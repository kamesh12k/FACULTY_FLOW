# FAFLOW — Faculty Credit Management & Autonomous Campus Operations Platform

[![Version](https://img.shields.io/badge/version-5.0.0--enterprise-blue.svg)](file:///c:/Users/kames/Downloads/FACREDIT-enhanced-20260724-v5/docs/release/Release_Notes.md)
[![Backend](https://img.shields.io/badge/backend-FastAPI%20%7C%20Python%203.12-emerald.svg)](file:///c:/Users/kames/Downloads/FACREDIT-enhanced-20260724-v5/docs/architecture/Backend_Architecture.md)
[![Frontend](https://img.shields.io/badge/frontend-React%2018%20%7C%20Vite%20%7C%20Tailwind-indigo.svg)](file:///c:/Users/kames/Downloads/FACREDIT-enhanced-20260724-v5/docs/architecture/Frontend_Architecture.md)
[![Database](https://img.shields.io/badge/database-PostgreSQL%2016-blue.svg)](file:///c:/Users/kames/Downloads/FACREDIT-enhanced-20260724-v5/docs/architecture/Database_Architecture.md)
[![Tests](https://img.shields.io/badge/tests-328%20passed%20%7C%20100%25-brightgreen.svg)](file:///c:/Users/kames/Downloads/FACREDIT-enhanced-20260724-v5/docs/development/Testing.md)
[![License](https://img.shields.io/badge/license-Proprietary%20%2F%20Commercial-red.svg)](file:///c:/Users/kames/Downloads/FACREDIT-enhanced-20260724-v5/docs/legal/LICENSE.md)

---

## 1. Product Overview

**FAFLOW** is an enterprise-grade academic workload governance, autonomous substitution orchestration, and operational personnel accounting platform engineered for universities and engineering colleges. Built on strict database invariants and a cyclical **Day Order (1–6)** calendar architecture of **5 periods per working day**, FAFLOW replaces manual timetable adjustments with an automated, peer-to-peer workload credit ledger and intelligent substitution routing.

---

## 2. Key Capabilities

- **Autonomous Substitution Engine**: Multi-factor algorithmic scheduling evaluating teacher eligibility, current day workload, fairness distribution, and emergency response times ($0 \le \text{Score} \le 100$).
- **Dual Double-Entry Ledger Architecture**:
  - **Academic Faculty Credits**: Automated `+1.0` award for substituting classes and `−1.0` deduction for approved leaves.
  - **Operational Staff Ledgers**: Configurable annual leave limits/quotas, manager duty credit awards, and running balance statements.
- **Single Source of Calendar Truth**: Rotational Day Order (1–6) sequence governed by `calendar_days` that pauses automatically across holidays without altering master timetable definitions.
- **Operational Personnel & Laboratory Governance**: Specialized **Manager** role overseeing Laboratory Staff, physical laboratory custody, and non-teaching personnel.
- **Enterprise Security & Multi-Tenancy**: Scoped Head of Department (HOD) administration, first-login credential reset gates, signed JWT sessions, and immutable audit logging.

---

## 3. Technology Stack

| Layer | Technologies | Description |
|---|---|---|
| **Backend API** | Python 3.12, FastAPI, Pydantic v2, Uvicorn | High-performance asynchronous RESTful microservice layer. |
| **Persistence** | PostgreSQL 16, SQLAlchemy 2.0, psycopg2 | ACID-compliant relational data store with domain check constraints. |
| **Frontend Client** | React 18, Vite 5, Tailwind CSS, Context API | Responsive single-page application with desktop locked-viewport shell. |
| **Security & Auth** | JWT (python-jose), Passlib (Bcrypt Work Factor 12) | Stateless cryptographic session tokens and secure credential hashing. |
| **Quality Assurance** | Pytest, Pytest-Cov, AnyIO (328 Automated Tests) | Comprehensive integration and regression test coverage. |

---

## 4. User Role Hierarchy

```text
System Administrator (admin_level=1)
  ├── Secondary Administrator / HOD (admin_level=2, Department-Scoped)
  │     └── Academic Teachers (Role.teacher)
  ├── Principal (Role.principal) [Executive Read-Only Institutional Oversight]
  └── Operational Manager (Role.manager)
        ├── Laboratory Staff (Role.lab_staff)
        └── Non-Teaching Staff (Role.non_teaching_staff)
```

---

## 5. Quick Start (Development)

### Backend Service
```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate | Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend Client
```bash
cd frontend
npm install
npm run dev
```

### Default Bootstrap Credentials
- **URL**: `http://localhost:5173/login`
- **Username**: `admin`
- **Password**: `admin` *(Mandates immediate credential change upon first login)*

---

## 6. Enterprise Documentation Suite

For complete architectural specifications, user manuals, API catalogs, and deployment guides, refer to the [Documentation Hub](file:///c:/Users/kames/Downloads/FACREDIT-enhanced-20260724-v5/docs/README.md):

- 📘 **User Manuals**: [Teacher](file:///c:/Users/kames/Downloads/FACREDIT-enhanced-20260724-v5/docs/user-guides/Teacher_Manual.md) · [Manager](file:///c:/Users/kames/Downloads/FACREDIT-enhanced-20260724-v5/docs/user-guides/Manager_Manual.md) · [Principal](file:///c:/Users/kames/Downloads/FACREDIT-enhanced-20260724-v5/docs/user-guides/Principal_Manual.md) · [HOD](file:///c:/Users/kames/Downloads/FACREDIT-enhanced-20260724-v5/docs/user-guides/HOD_Manual.md) · [Staff](file:///c:/Users/kames/Downloads/FACREDIT-enhanced-20260724-v5/docs/user-guides/Staff_Manual.md)
- ⚙️ **Administration**: [Master Admin Manual](file:///c:/Users/kames/Downloads/FACREDIT-enhanced-20260724-v5/docs/administration/Admin_Manual.md) · [Department Multi-Tenancy](file:///c:/Users/kames/Downloads/FACREDIT-enhanced-20260724-v5/docs/administration/Department_Management.md) · [Academic Calendar & Day Order](file:///c:/Users/kames/Downloads/FACREDIT-enhanced-20260724-v5/docs/administration/Academic_Management.md)
- 🏗️ **Architecture**: [System](file:///c:/Users/kames/Downloads/FACREDIT-enhanced-20260724-v5/docs/architecture/System_Architecture.md) · [Backend](file:///c:/Users/kames/Downloads/FACREDIT-enhanced-20260724-v5/docs/architecture/Backend_Architecture.md) · [Frontend](file:///c:/Users/kames/Downloads/FACREDIT-enhanced-20260724-v5/docs/architecture/Frontend_Architecture.md) · [Database & Migrations](file:///c:/Users/kames/Downloads/FACREDIT-enhanced-20260724-v5/docs/architecture/Database_Architecture.md)
- 🔌 **API Reference**: [API Overview](file:///c:/Users/kames/Downloads/FACREDIT-enhanced-20260724-v5/docs/api/API_Overview.md) · [Authentication](file:///c:/Users/kames/Downloads/FACREDIT-enhanced-20260724-v5/docs/api/Authentication_API.md) · [Full Route Catalog](file:///c:/Users/kames/Downloads/FACREDIT-enhanced-20260724-v5/docs/api/API_Reference.md)
- 🚀 **Deployment**: [Production Setup](file:///c:/Users/kames/Downloads/FACREDIT-enhanced-20260724-v5/docs/deployment/Production_Deployment.md) · [Database Operations](file:///c:/Users/kames/Downloads/FACREDIT-enhanced-20260724-v5/docs/deployment/Database_Deployment.md) · [Backup & Recovery](file:///c:/Users/kames/Downloads/FACREDIT-enhanced-20260724-v5/docs/deployment/Backup_and_Restore.md)
- 🛡️ **Security**: [Security Model](file:///c:/Users/kames/Downloads/FACREDIT-enhanced-20260724-v5/docs/security/Security_Overview.md) · [RBAC Matrix](file:///c:/Users/kames/Downloads/FACREDIT-enhanced-20260724-v5/docs/security/RBAC.md) · [Best Practices](file:///c:/Users/kames/Downloads/FACREDIT-enhanced-20260724-v5/docs/security/Security_Best_Practices.md)

---

## 7. License & Commercial Inquiries

Copyright © 2026 Kamesh G. All Rights Reserved.

FAFLOW is proprietary commercial software. Use, distribution, or reproduction without an explicit commercial license agreement is strictly prohibited.

For commercial licensing and procurement inquiries:  
📧 `kamesh.business@muthayammal.in`
