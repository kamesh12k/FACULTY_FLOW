# Management & Reporting Standards (Enterprise Guide)

## 1. Decision-Oriented Dashboards

A management dashboard is **not** a raw dump of database records. An executive or department head opens a dashboard to answer 4 immediate questions:
1. **What is the current health status?** (e.g. Total Allocated Hours vs. Capacity, % Timetable Completed).
2. **What requires immediate attention?** (e.g. 3 Overloaded Faculty Members, 2 Unassigned Course Sections).
3. **Why did this occur?** (Contextual drill-down showing overlapping time slots or sudden section additions).
4. **What action should I take right now?** (Direct 1-click CTA: "Reassign Section" or "Approve Overload Request").

---

## 2. Visual Hierarchy & Information Layout

- **Top Row (KPI Summary Cards)**: 3–5 high-level metrics with delta indicators (+12% vs last term) and alert status badges.
- **Middle Section (Visual Distribution)**: Charts (workload distribution, department allocation breakdown).
- **Bottom Section (Actionable Exceptions Table)**: Filtered list showing only anomalous records requiring review, with inline action triggers.

---

## 3. Data Consistency & Export Integrity
- All summary metrics displayed on screen must strictly match downloadable reports (CSV, Excel, PDF).
- Every export file must include metadata headers: Generating User, Timestamp, Filter Criteria, and Data Scope.
