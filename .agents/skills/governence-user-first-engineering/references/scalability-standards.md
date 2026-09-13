# Scalability Standards (Enterprise Guide)

## 1. Architectural Tenets for Scalability

### 1.1 Stateless Services
- Application instances must remain strictly stateless. Session state, JWT validations, and cache entries must reside in distributed stores (e.g. Redis) or signed client tokens, never in application process memory.
- Enables seamless horizontal autoscaling across instances.

### 1.2 Asynchronous Background Task Queues
- Web request threads must never perform long-running tasks (> 500ms):
  - Database backups and snapshot archiving.
  - Generating large PDF/Excel summary reports across departments.
  - Bulk email notifications.
- Offload these jobs to background workers (e.g. Celery, RQ, or FastAPI `BackgroundTasks`).

---

## 2. Concurrency & Database Contention

### 2.1 Minimizing Transaction Hold Time
- Keep database transactions as short as possible.
- Perform external API requests, file generation, and password hashing *outside* the open database transaction block.

### 2.2 Idempotency & Conflict Resolution
- Write endpoints performing financial calculations, allocations, or state transitions must accept an `Idempotency-Key` header or enforce database unique constraints to prevent duplicate insertions upon network retries:
  ```sql
  ALTER TABLE course_allocations ADD CONSTRAINT uq_faculty_slot UNIQUE (faculty_id, time_slot_id, term_id);
  ```

---

## 3. Resource Pool Sizing
- Database connection pools must be configured with sensible pool sizes and overflow limits:
  - `pool_size = 20`
  - `max_overflow = 10`
  - `pool_timeout = 30`
  - `pool_recycle = 1800`
