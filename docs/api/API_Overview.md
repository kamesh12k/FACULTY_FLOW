# FAFLOW — REST API Overview & Standards

This document establishes the architectural standards, error handling patterns, authentication protocols, and request/response conventions for the FAFLOW REST API.

---

## 1. REST Conventions & Standards

- **Base URL**: `http://localhost:8000/api` (or `/api` under Nginx reverse proxy).
- **Transport**: HTTPS with TLS 1.3 enforced in production environments.
- **Content Type**: `application/json` for all request and response bodies (unless uploading `multipart/form-data` for CSV files).
- **Authentication**: HTTP `Authorization: Bearer <JWT_TOKEN>` header.

---

## 2. Standard HTTP Status Codes

| Status Code | Reason | Usage in FAFLOW |
|---|---|---|
| `200 OK` | Success | Successful resource retrieval or update. |
| `201 Created` | Created | Successful resource creation (user, slot, department). |
| `204 No Content`| Deleted | Successful deletion with no body returned. |
| `400 Bad Request`| Validation Error | Invalid payload, date conflicts, or rule violations. |
| `401 Unauthorized`| Missing / Invalid Token | Missing, expired, or tampered JWT. |
| `403 Forbidden` | Access Denied | Insufficient RBAC role or cross-tenant boundary breach. |
| `404 Not Found` | Resource Absent | Requested entity ID does not exist. |
| `409 Conflict` | Domain Conflict | Double-booking or duplicate unique key constraint. |
| `422 Unprocessable`| Pydantic Schema Error| Field type mismatch or schema validation failure. |

---

## 3. Standard Error Envelope Format

```json
{
  "detail": "Descriptive, human-readable error message explaining the failure or constraint violation."
}
```
