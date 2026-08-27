# FAFLOW — Delight & Friction-Elimination Pass (Agent Prompt)

**For:** Google Antigravity, operating with real repo access on `FACREDIT-enhanced-20260724-v5`
**Builds on:** `docs/deployment/Faflow_uiux.md` (Phases 1–4, already shipped per `UX_REDESIGN_EXPERIENCE_NOTE.md`) and `FAFLOW_EXISTING_PROJECT_ARCHITECTURE_REPORT.md`
**Type of pass:** Not new features. A cross-cutting quality/friction audit and fix pass across the whole app.

---

## 0. Read this before touching code

Phases 1–4 shipped the mechanics: guided setup, bulk import, the Teacher "Today" screen, global search. What's missing is a pass that goes screen-by-screen and asks: *is this the fewest possible clicks, and does using it feel good?* That's what this prompt is for.

Re-read `docs/deployment/Faflow_uiux.md` §0–§3 first — the scope boundaries (no attendance/geofencing unless separately approved), the non-negotiables (department scoping, Day Order model, Principal read-only, the 424-test suite), and the real role names still apply here without exception. This pass never trades correctness or the scoping chain for speed.

---

## 1. The actual goal, stated plainly

The company's success metric here is not "feature complete." It's:

- **Every user — System Admin, HOD, Teacher — finishes their task in the fewest possible clicks/keystrokes, every time.**
- **Nobody re-types anything FAFLOW already knows.**
- **The app should feel fast and a little bit fun to use, not just functional** — teachers and HODs should reach for it, not tolerate it.
- **Quality and quantity together**: this is not "ship something impressive-looking." Every screen touched must still pass the real backend test suite and hold up under actual data entry load (50+ rows pasted, not 3).

If a proposed change makes something feel more polished but adds a click, taps, or a modal — reject it. If a proposed change removes a click but hides information a user needs to trust the result — also reject it. Optimize for both at once; don't trade one for the other.

---

## 2. Scope of this pass

Audit and improve, in this order of priority:

1. **Data entry surfaces** — every bulk/single create-edit flow: teachers, subjects, classes, rooms, departments, timetable slots, leave application. These get hit hardest and most often; friction here compounds daily.
2. **Daily-use screens** — Teacher "Today," HOD leave queue, Admin dashboard. These are opened constantly; shave seconds here and it's felt every day, not just once during setup.
3. **Setup and onboarding** — `SetupGuide.jsx` and the wizard steps already built. Audit for any remaining re-typing, unnecessary confirmation, or steps that could default/infer instead of ask.
4. **Feedback and micro-interactions** — does the app confirm actions instantly (optimistic UI, inline success states) or make people wait and wonder? Does an error tell the user exactly what to fix, or just that something failed?

Do not expand into attendance/geofencing or any feature explicitly deferred in `Faflow_uiux.md` §0/§3 — this pass makes existing flows excellent, it doesn't add new ones, unless a fix requires touching a shared component (e.g., `BulkEntityEditor`) that's already used across several flows.

---

## 3. Concrete audit checklist — run this against every screen in scope

For each screen, answer and record all six:

1. **Click/field count**: count exactly, before and after your change. If you can't produce a number, you haven't actually improved it.
2. **Re-entry check**: does this screen ask for anything FAFLOW already has in context (logged-in user, current date, resolved Day Order, department, selected class/room)? If yes, default it and let the user override rather than blank-start.
3. **Bulk-first check**: if this entity is ever created more than one at a time in practice, does the paste/CSV path exist and is it the *first* thing offered, not buried behind a "manual entry" default? (`BulkEntityEditor` is the existing pattern — extend it, don't reinvent it.)
4. **Validation-before-commit check**: does the user see exactly what will happen (valid rows / rows needing correction, with the specific reason) before anything is written? No silent partial failures.
5. **Response latency perception**: does the UI respond within ~100ms to any click (optimistic update, skeleton, inline spinner) even if the network call takes longer? A screen that "freezes" for even 500ms during common flows should be treated as a bug.
6. **Recovery path**: if something goes wrong mid-entry (bad row, network drop, validation failure), can the user fix just the broken part without re-doing the whole flow?

Where an answer is "no," fix it — inline in the existing component where possible, not a rewrite.

---

## 4. Delight, specifically (not vague — concrete signals to build)

"Users should want to use this" isn't a mood, it's a checklist:

- **Instant confirmation** on every write action — a row that was just added animates in, a leave that was just approved shows a checkmark immediately, not after a full page refetch.
- **Undo, not "are you sure?"** — wherever destructive-but-recoverable (removing a bulk-import row before commit, deleting a draft), prefer an undo toast over a confirmation modal. Modals are friction; undo is safety without friction.
- **Progress that's visible without asking** — the Setup Guide's readiness ring is the right pattern; check whether other multi-step flows (bulk import preview, leave application) could use the same at-a-glance treatment.
- **Keyboard-first for power users** (mostly HOD/Admin table screens) — tab between cells, Enter to commit a row, arrow-key navigation in tables, `Ctrl+K`/`Cmd+K` search already exists — make sure new table-heavy screens don't regress behind mouse-only interaction.
- **Empty and loading states that don't feel like dead ends** — every list/table already needs a designed empty state per §7 of the original brief; extend that to "first 5 seconds after setup" — a brand-new HOD or teacher account should never land on a blank, unexplained screen.
- **One accurate number beats five vague ones** — where a screen currently says "Loading…" or shows nothing, prefer a real count or percentage the moment it's knowable.

Reject anything decorative that doesn't serve one of the above — animation for its own sake, extra copy, or restyling that doesn't reduce clicks or increase confidence is out of scope per the original brief's "restraint over flash" principle.

---

## 5. Persona-specific bar

| Persona | What "delight" means for them here | What NOT to do |
|---|---|---|
| System Admin | Setup and bulk config feel like minutes, not hours; always know % complete and what's next | Don't add extra confirmation steps "for safety" — validation-before-commit already covers that |
| HOD | Running the department daily (leave queue, roster, substitutions) never requires drilling into 3 screens for one decision | Don't collapse so much into one queue view that context (why this leave, what's the impact) gets lost — check against real HOD workflow, not just fewer clicks |
| Teacher | Opens the app, sees today, is done in seconds; leave application is nearly zero-friction | Don't add gamification, notifications-for-the-sake-of-it, or anything that makes a low-engagement user (this persona wants speed, not a dashboard to explore) feel nagged |
| Principal | Not in scope for this pass — read-only, no interaction design needed | Don't add interactive elements here at all — backend blocks writes with 403; don't build UI that implies otherwise |

---

## 6. Process

1. **Audit first, in writing** — go screen by screen per §2/§3 and produce a short findings list (screen → current click count → proposed fix → new click count) before changing code. This is the only "document" this pass produces up front; everything else is code.
2. **Fix highest-frequency screens first** — daily-use screens (Teacher Today, HOD leave queue) before setup screens (touched once).
3. **Extend existing components, don't fork them** — `BulkEntityEditor`, `TableCard`, the Setup Guide's `StatusRing`/readiness pattern, and the existing mobile shell (`BottomNav`, `MobileDrawer`) are the established conventions. New patterns need a specific reason.
4. **Run `backend/tests/` before and after every batch of changes**, not just at the end. If a fix needs a backend change, it needs a matching test — mirror the pattern from Phase 2's `POST /teachers/bulk` tests.
5. **Ship in reviewable increments** — one persona's screen set per increment, not one giant diff across all three personas.

---

## 7. Deliverable, same shape as the original brief

1. **The implementation** — real component/route/service changes, not a mockup.
2. **A short findings-and-results note** — the audit table from §6 step 1, filled in with actual before/after numbers, plus anything you deliberately didn't touch and why (e.g., "Principal has no interactive surface, skipped by design").

No separate design doc, no long report — the audit table plus the working code is the whole deliverable.

---

## 8. Non-negotiables (repeated on purpose — do not relax these for speed)

- Department-scoping chain (DB constraint → `get_tenant_department_id` → per-query filtering) stays intact on every touched screen.
- Day Order / period model — nothing gets redesigned around a Mon–Fri assumption.
- `substitution_service.py`'s teacher-only candidate pool is untouched.
- Principal stays read-only, no exceptions.
- 424+ backend tests (currently 427 per the last experience note) must pass before and after.
- No scope creep into attendance/geofencing.