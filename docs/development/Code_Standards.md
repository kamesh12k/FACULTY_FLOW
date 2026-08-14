# FAFLOW — Code Standards & Architectural Rules

This document codifies the coding conventions, formatting standards, and structural guidelines for FAFLOW.

---

## 1. Backend Python Standards

- **PEP 8 Compliance**: Follow standard Python conventions with 4-space indentation.
- **Type Annotations**: Explicit type hints on all function parameters, return values, and Pydantic schemas.
- **SQLAlchemy 2.0 Syntax**: Use explicit `db.query()` or `select()` statements with parameter binding. Never concatenate raw SQL queries.
- **Error Handling**: Use standard FastAPI `HTTPException` with explicit HTTP status codes and clear `detail` messages.

---

## 2. Frontend React & JavaScript Standards

- **Functional Components**: Use React 18 functional components with modern hooks (`useState`, `useEffect`, `useMemo`).
- **Tailwind CSS Utility Classes**: Use semantic design system classes; avoid inline styles.
- **Clean Component Structure**: Separate reusable UI primitives into `components/ui` and page views into `pages/`.
