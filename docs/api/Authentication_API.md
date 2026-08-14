# FAFLOW — Authentication API Reference

This document provides endpoint specifications for user authentication, first-login setup, token verification, and password management.

---

## 1. User Login

- **Endpoint**: `POST /auth/login`
- **Access**: Public / Anonymous
- **Request Body**:
```json
{
  "username": "anita.sharma@college.edu",
  "password": "UserPassword123!"
}
```
- **Response `200 OK`**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "must_change_credentials": false,
  "user": {
    "id": 14,
    "name": "Anita Sharma",
    "email": "anita.sharma@college.edu",
    "username": "anita.sharma@college.edu",
    "role": "teacher",
    "admin_level": null,
    "department_id": 1,
    "is_active": true
  }
}
```

---

## 2. First-Login Credential Setup

- **Endpoint**: `POST /auth/first-login-setup`
- **Access**: Authenticated (User with `must_change_credentials=TRUE`)
- **Request Body**:
```json
{
  "name": "System Administrator",
  "email": "admin@muthayammal.in",
  "username": "sysadmin",
  "password": "NewStrongAdminPassword2026!"
}
```
- **Response `200 OK`**:
```json
{
  "message": "Credentials updated successfully",
  "access_token": "eyJhbGciOiJIUzI1Ni...",
  "token_type": "bearer"
}
```

---

## 3. Session Profile & Identity

- **Endpoint**: `GET /auth/me`
- **Access**: Authenticated
- **Response `200 OK`**: Returns current authenticated user record.
