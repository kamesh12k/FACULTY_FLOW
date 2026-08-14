# FAFLOW — Development Workflow & Git Standards

This document establishes the Git branching model, pull request guidelines, and code review standards for FAFLOW engineering.

---

## 1. Branching Strategy

- `main`: Production-ready releases.
- `develop`: Integration branch for tested feature sets.
- `feature/<name>`: New feature implementations.
- `fix/<issue-name>`: Bug fixes and performance patches.

---

## 2. Commit Message Standards

Use the Conventional Commits specification:
- `feat(manager)`: Add staff annual leave quota update endpoint
- `fix(timetable)`: Prevent overlapping period assignment conflict
- `docs(api)`: Update REST API authentication reference
- `test(credits)`: Add double-deduction regression test
