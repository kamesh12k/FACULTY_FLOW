# Performance Standards (Enterprise Guide)

## 1. Hot Paths & Bounded Complexity
A hot path is any critical path executed frequently (e.g. calculation engines, authentication middlewares, search filters, list rendering).
- Hot paths must have **strictly bounded algorithmic time and memory complexity** ($O(1)$ or $O(N \log N)$).
- Avoid nested loops over large datasets ($O(N^2)$).

---

## 2. Database & ORM Performance Guidelines

### 2.1 Eliminating N+1 Queries
- **The Problem**: Querying a parent record and iterating over children in a loop results in $1 + N$ database round-trips.
- **The Solution**: Always use eager loading in SQLAlchemy:
  ```python
  # CORRECT: Single query with joinedload or selectinload
  from sqlalchemy.orm import joinedload
  
  allocations = db.query(CourseAllocation)\
      .options(joinedload(CourseAllocation.faculty))\
      .filter(CourseAllocation.term_id == active_term_id)\
      .all()
  ```

### 2.2 Strict Pagination
- Never execute unbounded `.all()` queries on growing tables.
- All collection endpoints must default to bounded pagination:
  ```python
  @router.get("/api/v1/faculty")
  def list_faculty(
      offset: int = Query(0, ge=0),
      limit: int = Query(50, le=200),
      db: Session = Depends(get_db)
  ):
      query = db.query(Faculty)
      total = query.count()
      items = query.offset(offset).limit(limit).all()
      return {"total": total, "items": items, "offset": offset, "limit": limit}
  ```

### 2.3 Indexing Discipline
- Index all foreign key columns.
- Create composite indexes for common filter combinations:
  ```sql
  CREATE INDEX idx_allocations_term_dept ON course_allocations (term_id, department_id);
  ```
- Use `EXPLAIN ANALYZE` to verify query execution plans for queries taking > 50ms.

---

## 3. Frontend & Client-Side Performance

### 3.1 Bundle Size & Code Splitting
- Lazy-load non-critical routes via `React.lazy()` or dynamic imports.
- Avoid importing entire utility libraries when only a single function is needed (e.g., `import debounce from 'lodash/debounce'`).

### 3.2 Virtualization for Large Datasets
- For matrix views, grid timetables, or audit logs exceeding 100 items, implement virtualized scrolling (`react-window` or `@tanstack/react-virtual`) to maintain 60 FPS rendering.

### 3.3 Debouncing & Request Throttling
- Debounce real-time search inputs by 300ms to avoid flooding backend endpoints with intermediate keystrokes.
