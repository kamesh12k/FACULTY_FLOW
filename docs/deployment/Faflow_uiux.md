# FAFLOW — UX Redesign Brief (Agent-Ready)
**Product:** FAFLOW (`FACREDIT-enhanced-20260724-v5`) · **Company:** Governence · **Owner:** kameshGovindhan

> Rewritten for an AI coding agent (e.g. Claude Code) with real repo access. Cross-checked against `FAFLOW_EXISTING_PROJECT_ARCHITECTURE_REPORT.md` (v3.0.0-AUDIT, 2026-08-14) so instructions point at real routes and files instead of generic placeholders. Both that report and this brief are snapshots — re-verify specifics against the live repo before relying on them.

---

## 0. Scope reality check — read before starting

**Attendance and geolocation (directive's original §5 / §18 / §19) do not exist in the current system.** No attendance table, no lat/long field, no geofencing anywhere in the 19-table schema or the API inventory. Treat this as **new feature work** — schema migration, new backend service and routes, a mapping UI — not a redesign of something already there. Decide explicitly whether it's in scope for this pass or a separate project; don't let an agent quietly assume it exists and improvise around it.

This is unrelated to the "attendance / duty log" mentioned for the proposed **Manager role** (Lab Staff / Non-Teaching Staff) elsewhere in the architecture report — that's a narrower, already-scoped feature for a different user type. Don't conflate the two.

Everything else in this brief — timetable, leave, substitution, credits, setup, teacher "today" — maps onto a real, already-built system. Those genuinely are redesigns of existing screens and APIs.

---

## 1. What you're working with

**Stack:** React 18 + Vite 5 + Tailwind 3 + react-router-dom · FastAPI + SQLAlchemy 2 + PostgreSQL, Pydantic validation · JWT (HS256) auth · 19-table schema · 424 Pytest tests in `backend/tests/`.

**Real role names** — the directive uses generic labels; here's the mapping:

| Directive says | Actually is |
|---|---|
| "System Admin" | `system_admin` (institution-wide) |
| "HOD" | `admin` with `admin_level = super_admin` |
| HOD's assistant (not named in directive) | `admin` with `admin_level = secondary_admin`, max 3 per department |
| "Teacher" | `teacher` |
| *(not mentioned in directive at all)* | `principal` — global, and read-only: the backend blocks any mutation from this role with a 403 |

**Domain quirk that changes most "today" UX:** the calendar isn't Monday–Friday. It's a 6-day **Day Order** rotation (`calendar_days.day_order`, values 1–6) resolved per date, with 5 periods/day. Any "what's happening now" screen has to resolve through Day Order, not day-of-week.

**Rule chain that has to stay intact end to end:** Academic Year/Semester → CalendarDay (Day Order) → TimetableSlot → LeaveRequest / Room Availability → AlterAssignment (substitute scorer) → CreditTransaction (ledger) → Reports/Notifications.

---

## 2. Already built — redesign the UI, don't rebuild the capability

| Directive asks for | Already exists as |
|---|---|
| Bulk approve/reject leave | `POST /leaves/bulk-approve`, `/leaves/bulk-reject` |
| Bulk timetable upload | `POST /timetable/` |
| Bulk class / room creation | `POST /classes/bulk`, `POST /rooms/bulk` |
| Automatic substitute suggestions | "Assisted" mode scoring (`GET /leaves/{id}/recommendations`) and "Autonomous" mode zero-click assignment — both already implemented; toggle lives in `/admin/settings` |
| Teacher "today" data | `GET /academic-calendar/my-today-summary` already returns it |
| Mobile-first shell | `BottomNav.jsx`, `MobileDrawer.jsx`, responsive `TableCard` pattern, 44×44px touch targets — already in place |

**Real gaps** (nothing to redesign — these need building): bulk **teacher** import (only a single `POST /teachers/` exists today — `/classes/bulk` and `/rooms/bulk` are the pattern to copy), a setup-status/progress view, cross-entity global search (TopBar already has *a* search slot — check what it currently indexes before assuming a rebuild), attendance + geofencing (§0).

---

## 3. Non-negotiables — specific, not generic

- `chk_user_department_role` and the 3-tier department-scoping chain (DB constraint → `get_tenant_department_id` → per-query filtering). Any new UI path must go through all three, not around them.
- The Day Order / period model — don't design around a standard Mon–Fri week.
- `substitution_service.py` filters candidates by `User.role == Role.teacher` exclusively. Any new UI — or the separate Manager-role work, if it lands around the same time — must never let non-teaching staff enter that pool.
- Principal is read-only at the backend. Don't design a Principal screen with write actions.
- The 424-test suite in `backend/tests/` is the real regression signal — run it before and after each phase instead of eyeballing the result.
- Known technical debt to route around, not "clean up" as a drive-by: the legacy `User.department_old` column, hard-coded `BETWEEN 1 AND 5` period constraints, and a `Role` enum that requires a migration to extend.

---

## 4. Product principles (stated once)

Apply to every screen, in this order:
1. Fewer clicks?
2. Zero manual re-entry of something FAFLOW already knows (user, date, Day Order, period, class, room, department)?
3. Can the system default or infer this instead of asking?
4. Can the user finish without leaving the screen?
5. Does the user need to see this at all?

Patterns to prefer:
- **Defaults over prompts** — if teacher/date/period/class are known, show them plus one action, not six dropdowns.
- **Bulk over one-at-a-time** — paste/CSV + validation preview, matching the existing `/classes/bulk`-style pattern.
- **Inline over modal** — for admin-heavy tables: edit in place, keyboard nav, multi-select.
- **Proactive over passive** — surface conflicts and pending approvals; don't make users go looking.
- **Visual over technical** — timetable as a drag-and-drop grid with conflict highlighting; if geofencing gets built, map + radius, never raw lat/long.
- **One tap for the common case.**
- **Search that understands intent**, not just exact match.
- **Restraint over flash** — delight is things working smoothly, not animation.

Don't apply these mechanically where they don't fit — use judgment per screen.

---

## 5. Who you're designing for

| Persona | Primary need | UI density | Target reaction |
|---|---|---|---|
| System Admin (`system_admin`) | Guided setup, full config | High | "That was faster than I expected." |
| HOD (`admin` / super_admin) | Department control, no admin overhead | Medium–high | "I can run my department without fighting the software." |
| Teacher (`teacher`) | Today's task, fast, mobile | Low | "It already knows what I need." |
| Principal (`principal`) | Oversight only — no persona work needed, just don't break it | Read-only | — |

---

## 6. Phased scope — one phase at a time, against real routes

Don't start the next phase until the current one is reviewed. Each phase ships working changes, not a plan for changes.

**Phase 1 — System Admin.** Chain the existing create flows (`/admin/departments` → HOD creation → `/admin/teachers` → `/admin/subjects` / `/admin/classes` / `/admin/rooms` → `/admin/timetable`) into one guided setup, instead of requiring admins to know to visit six separate screens in the right order. Add a setup-status view — new UI, but just an aggregation over endpoints that already exist.

**Phase 2 — HOD.** Turn `/admin/teachers` into an inline-editable, importable table (needs a new `POST /teachers/bulk`, mirroring `/classes/bulk`). Collapse `/admin/leaves`' approve/reject/recommendation/impact into one queue view instead of drill-in. Make the operations-mode choice in `/admin/settings` (manual / assisted / autonomous) and its consequences more visible before HODs pick it.

**Phase 3 — Teacher.** Build the "Today" home screen around the existing `my-today-summary` endpoint. Simplify `/teacher/leave/apply` down to type + dates + reason. Keep using the existing mobile shell rather than rebuilding it. Attendance/geofencing only if §0's scope question was resolved as "yes, build it now."

**Phase 4 — Cross-cutting.** Extend or replace TopBar search once you've confirmed what it currently covers. Notification UX (the backend — `/notifications/*` — already exists).

If time is short, stop after Phase 2 — Admin and HOD unblock the most downstream work.

---

## 7. Definition of done, per workflow

- [ ] Click/field count before vs. after, as numbers
- [ ] No manual re-entry of data FAFLOW already has
- [ ] Non-negotiables from §3 untouched, or the exception is called out explicitly
- [ ] `backend/tests/` (424 tests) still passes
- [ ] Works on mobile, using the existing responsive shell
- [ ] Designed empty state and error state
- [ ] Screen answers, at a glance: where am I, what can I do, what's next

---

## 8. Deliverable, per phase

1. **The implementation** — real components, routes, and services, following existing conventions (FastAPI route → service → SQLAlchemy model; React page → `api/services.js` call). Not a mockup or a description of changes.
2. **A one-page experience note** — what changed, before→after numbers from §7, any business-rule questions this raised, what's deliberately deferred.

Skip a global 20-section report. A one-page note per phase actually gets read; a giant end-of-project report doesn't.

---

## 9. Working process

- The architecture report already answers most "what does the system look like" questions — check it before asking the human. Ask when it's a judgment call ("is attendance in scope this quarter"), not when it's a lookup.
- Prefer extending existing components and endpoints (the `bulk` pattern, the `my-today-summary` pattern) over inventing new ones, unless a phase explicitly calls for a rebuild.
- Flag anything touching §3 before touching it, and say why.
- Favor working, reviewable increments over one large unreviewable change.

---

*FAFLOW by Governence. Product owner: kameshGovindhan.*