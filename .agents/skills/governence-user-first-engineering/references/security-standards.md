# Security Standards (Enterprise Guide)

## 1. Authentication & Authorization (RBAC / ABAC)

### 1.1 Strict Route Enforcement
- Every endpoint (except explicit public auth/health endpoints) must enforce authentication dependencies:
  ```python
  @router.post("/api/v1/allocations")
  def create_allocation(
      payload: AllocationCreateSchema,
      current_user: User = Depends(require_role(["ADMIN", "HOD", "COORDINATOR"])),
      db: Session = Depends(get_db)
  ):
      ...
  ```

### 1.2 Tenant & Department Data Scoping
- **Never trust client-supplied tenant or department IDs blindly.**
- Scope database queries directly to the authenticated user's authorized department:
  ```python
  query = db.query(Faculty)
  if current_user.role != "SUPERADMIN":
      query = query.filter(Faculty.department_id == current_user.department_id)
  ```

---

## 2. Input Validation & Injection Defenses

### 2.1 Pydantic Validation & Sanitization
- All incoming payloads must be strictly typed and validated using Pydantic models.
- String fields must strip control characters and be bounded by `max_length`.

### 2.2 Complete Parameterization
- Never interpolate variables directly into SQL queries or shell commands:
  ```python
  # INCORRECT (SQL Injection Vulnerability):
  db.execute(f"SELECT * FROM faculty WHERE name = '{user_input}'")
  
  # CORRECT (Parameterized):
  db.execute(text("SELECT * FROM faculty WHERE name = :name"), {"name": user_input})
  ```

---

## 3. Cryptography, Tokens & Secrets

### 3.1 Secrets Management
- All database passwords, JWT secrets, and API tokens must be loaded from environment variables (`.env`).
- Never commit default secrets or `.env` files into source control.

### 3.2 Secure Password Hashing
- Use `bcrypt` or `argon2` with appropriate work factors (salt rounds $\ge 12$).
- Tokens must expire within bounded lifetimes (Access Token $\le 60$ mins, Refresh Token $\le 14$ days).
