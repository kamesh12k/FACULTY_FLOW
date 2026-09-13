# UX & User-First Standards (Enterprise Guide)

## 1. Prime Directive
> **Advanced inside, simple outside.** Complexity is a cost the software must absorb, not the user.

If a feature makes the user think harder, click more, wait longer, or perform mental calculations, it has failed—no matter how sophisticated the underlying algorithm.

---

## 2. The 5 UX Decision Heuristics
Before designing or approving any UI screen, modal, form, or workflow, rigorously evaluate these 5 questions:

### Q1: Can the user reach the same result with fewer clicks or fewer screens?
- **Flatten Hierarchies**: Avoid requiring users to drill down 3 levels just to inspect a single record.
- **Side Drawers & Modals vs. Route Shifts**: Use side sheets for quick inspection/edits so users don't lose their context in a master table.
- **Batch Actions**: Provide multi-select checkboxes for batch approvals, bulk deletions, and status toggles.

### Q2: Can the system infer this instead of asking?
- **Session & Context Awareness**: Pre-select the active Academic Year, Semester, and Department from the logged-in user's profile.
- **Timestamp & Author Tracking**: Never ask the user for "Today's Date" or "Entered By"—populate these automatically.
- **Smart Defaults**: Set dropdowns to the most probable choice (e.g. status default to "Active", semester default to current active term).

### Q3: Can existing information be reused instead of re-entered?
- **Auto-Fill & Lookup**: When a user selects a Course Code, auto-populate the Course Title, Department, and Credit Value.
- **Historical Cloning**: Provide "Clone from Previous Semester" capabilities for recurring timetables and allocations.
- **Unified Profile Data**: Pull faculty designations, max workload points, and contact info directly from the master faculty directory.

### Q4: Can separate steps be combined into one?
- **Combined Upload & Validation**: When importing an Excel/CSV file, validate rows immediately on upload and present inline previews with errors highlighted, rather than forcing a 3-step wizard.
- **Save & Next**: Provide inline keyboard shortcuts (`Tab`, `Ctrl+Enter`) for continuous data entry.

### Q5: Can the system just do this, instead of asking the user to?
- **Real-Time Workload Engine**: Calculate total workload points and lecture/lab ratios as the user types or toggles checkboxes—do not require a "Calculate Workload" button.
- **Live Conflict Detection**: Instantly highlight faculty schedule overlaps or credit ceiling breaches in red with contextual tooltips.
- **Auto-Save & Draft States**: Continuously persist draft changes to local storage or background API endpoints to prevent accidental data loss.

---

## 3. UI Interaction Standards

### Modals vs. Drawers vs. Inline Editing
- **Inline Editing**: Best for single-field adjustments (e.g. changing an assigned room or section status).
- **Side Drawer (Sheet)**: Best for complex record inspection/editing where maintaining visual context of the underlying list is valuable.
- **Modal Dialog**: Reserved strictly for high-focus single-purpose tasks (e.g., confirmations, file uploads) that require immediate resolution before returning to the main view.

### Empty States & Error Feedback
- **Actionable Empty States**: When a table is empty, do not display a blank page or generic "No data". Display:
  1. An intuitive icon.
  2. A clear explanation of why it is empty.
  3. A prominent Call-To-Action (e.g. "Assign First Faculty Member" or "Import Timetable").
- **Inline Contextual Errors**: Place error messages directly adjacent to the offending input field with clear remediation instructions (e.g., *"Must be between 1 and 24 hours"*).
