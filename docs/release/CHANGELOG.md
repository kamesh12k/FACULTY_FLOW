# FAFLOW — Changelog & Version History

All notable changes to the FAFLOW platform are documented in this file in reverse chronological order.

---

## [5.0.0] — 2026-08-15 (Enterprise Release)

### Added
- **Operational Manager Role & Portal**: Full management of Laboratory Staff and Non-Teaching Staff.
- **Staff Leave & Credit Ledger Accounting**: Configurable annual leave quotas, manager duty credit adjustments, and running balance statements.
- **Faculty Credit Intelligence Hub**: Redesigned `/teacher/credits` with dynamic standing tiers (Diamond, Gold, Silver), coverage reliability meters, and full audit filters.
- **Classwise Timetable for Teachers**: Added comprehensive schedule matrix access at `/teacher/class-timetable`.
- **Enterprise Application Shell**: Desktop locked viewport (`h-screen overflow-hidden`) with static sidebar, independent menu scrolling, and pinned user profile/logout footer.

---

## [4.0.0] — 2026-07-24

### Added
- **Autonomous Substitution Engine**: Multi-factor scoring formula with fairness metrics and emergency window detection.
- **Multi-Department Multi-Tenancy**: Tenant-scoped HOD administration and cross-department substitution permissions.
- **Database Performance Optimization**: Composite B-tree indexing across high-traffic schedule and leave queries.

---

## [3.0.0] — 2026-06-29

### Added
- **Academic Calendar Engine**: Single source of truth date modeling (`calendar_days`) and cyclical Day Order rotation (1–6).
- **Five-Period Timetable Constraints**: Enforced 5 periods per day at both database and API layers.
- **Role-Based Access Control (RBAC)**: Multi-level administration hierarchy and immutable audit logs.
