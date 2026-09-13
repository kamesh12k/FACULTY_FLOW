# Exemplary Case Study: Faculty Workload Allocation Matrix (User-First Design)

## 1. Scenario
A Department Coordinator needs to allocate 8 newly scheduled course sections for the upcoming semester across 12 department faculty members without violating maximum teaching credit limits.

---

## 2. The User-First Architecture

### 2.1 UX Flow
```text
[Dashboard] ──> Click "Allocation Matrix"
                    │
                    ▼
[Single Unified Screen: Timetable Matrix]
- Academic Year & Department pre-inferred from session context.
- Left Panel: List of 8 unassigned course sections.
- Right Panel: Faculty grid showing real-time load bars (e.g. 12/16 hrs).
- Drag section onto faculty card OR select from inline smart dropdown.
- Live credit engine calculates point totals instantly (client-side + optimistic sync).
- Immediate conflict warning badge if faculty has a slot collision.
- Click "Save & Publish" (Single batch transaction).
```

### 2.2 Friction Metrics
- **Clicks**: 3
- **Screens**: 1
- **Fields typed**: 0 (all selections and drag-and-drop)
- **Waiting time**: < 500ms
- **Manual arithmetic**: 0 (workload automatically computed in real time)
- **Friction Score**: **9.0** (vs. 48.5 naive approach)
