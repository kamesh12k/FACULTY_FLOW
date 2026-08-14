# FAFLOW — System Architecture Overview

This document presents the high-level system context, component topology, and data flows of the FAFLOW enterprise platform.

---

## 1. High-Level Component Topology

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        Browser[Modern Web Browser\nChrome, Firefox, Safari, Edge]
        Mobile[Mobile Devices\nPWA Responsive Layout]
    end

    subgraph Edge["Reverse Proxy & Security"]
        Nginx[Nginx Web Server\nSSL/TLS, Rate Limiting, Static Assets]
    end

    subgraph AppServer["Application Layer"]
        Uvicorn[Uvicorn ASGI Server]
        FastAPI[FastAPI Application\nAsync Endpoints, Dependency Injection]
        AuthEngine[Auth & RBAC Middleware\nJWT Validation, Guard Interceptors]
        SubEngine[Autonomous Substitution Engine\nScoring Algorithm, Conflict Detection]
    end

    subgraph DataStore["Persistence Layer"]
        Postgres[(PostgreSQL 16 Database\nRelational Schema, Invariants, Ledgers)]
    end

    Browser -->|HTTPS / WSS| Nginx
    Mobile -->|HTTPS / WSS| Nginx
    Nginx -->|Proxy Pass http://localhost:8000| Uvicorn
    Uvicorn --> FastAPI
    FastAPI --> AuthEngine
    FastAPI --> SubEngine
    FastAPI -->|SQLAlchemy 2.0 Pool| Postgres
```

---

## 2. Key Architectural Tenets

1. **Database as the Invariant Enforcer**:
   - PostgreSQL constraints (`CHECK`, `UNIQUE`, `FOREIGN KEY`) enforce domain rules at the physical data layer (e.g. max 5 periods/day, no double-bookings, strict 1–6 Day Orders).
2. **Stateless API Services**:
   - Backend instances store no session state; authentication relies on signed HMAC-SHA256 JWT tokens with database-backed revocations.
3. **Dual Ledger Architecture**:
   - Academic Workload Credits and Operational Staff Leave Days operate on independent, immutable double-entry ledgers.
4. **Single Source of Calendar Truth**:
   - Date validity is governed solely by `calendar_days`, ensuring consistent behavior across scheduling, leave accounting, and reporting modules.
