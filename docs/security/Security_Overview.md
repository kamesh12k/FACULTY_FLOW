# FAFLOW — Enterprise Security & Threat Model

This document outlines the defense-in-depth security model, threat vector mitigations, and cryptographic standards of FAFLOW.

---

## 1. Defense-in-Depth Security Architecture

```mermaid
flowchart TD
    Edge[Edge Layer: HTTPS / TLS 1.3 / Strict CSP & CORS] --> WAF[Nginx Reverse Proxy: Rate Limiting & Header Sanitization]
    WAF --> Auth[Application Security: Signed JWT Bearer Verification]
    Auth --> RBAC[FastAPI Route Interceptors: Role & Tenant Scoping]
    RBAC --> Logic[Domain Logic: Input Validation & Sanitization]
    Logic --> DB[Database Layer: Parameterized Queries & Strict Check Constraints]
```

---

## 2. Cryptographic Protocols & Storage

- **Password Hashing**: Cryptographic `bcrypt` algorithm with automated salting and work factor `12`. Plaintext passwords are never logged, cached, or persisted.
- **Session Tokens**: Compact JSON Web Tokens (JWT) signed with HMAC-SHA256 (`HS256`).
- **Transport Encryption**: Enforced TLS 1.2 / 1.3 for all web client and API traffic.
- **SQL Injection Prevention**: 100% of database interactions execute through SQLAlchemy parameter binding, preventing SQL injection vulnerabilities.
