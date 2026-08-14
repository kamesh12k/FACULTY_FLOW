# FAFLOW — Deployment Architecture & Infrastructure Guide

This guide outlines deployment models, infrastructure topologies, high availability, and network requirements for running FAFLOW in production.

---

## 1. Production Architecture Topology

```mermaid
flowchart TD
    Client[Institutional Users] -->|HTTPS 443| LB[Load Balancer / Cloudflare]
    LB -->|Reverse Proxy| NGINX[Nginx 1.24+]
    NGINX -->|Static Files| DIST[/var/www/faflow/frontend/dist]
    NGINX -->|Unix Socket / Localhost:8000| UVICORN[Gunicorn / Uvicorn Workers]
    UVICORN -->|Connection Pool| PG[(PostgreSQL 16 High Availability)]
```

---

## 2. Infrastructure Sizing Guidelines

| Deployment Tier | Active Faculty & Staff | Application Nodes | CPU / RAM | PostgreSQL Sizing |
|---|---|---|---|---|
| **Department / Small College** | < 150 | 1 VM / Container | 2 vCPU / 4 GB RAM | 2 vCPU, 4 GB RAM, SSD |
| **Medium Institution** | 150 – 600 | 2 App Nodes + Nginx | 4 vCPU / 8 GB RAM | 4 vCPU, 16 GB RAM, NVMe |
| **Large Multi-Campus / University** | 600 – 3,000+ | 4+ App Nodes Behind LB | 8 vCPU / 16 GB RAM | Primary + Read Replica, 32 GB RAM |
