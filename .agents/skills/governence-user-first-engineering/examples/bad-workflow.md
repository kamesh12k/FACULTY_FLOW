# Anti-Pattern Case Study: The Naive Allocation Flow (High Friction)

## 1. Scenario
The same Faculty Workload Allocation task implemented without User-First engineering discipline.

---

## 2. The Flawed Multi-Screen Flow

1. User clicks "Faculty Management" menu.
2. User selects "Department" from dropdown (even though the user only belongs to one department).
3. User selects "Academic Year" and "Semester" from separate dropdowns.
4. User clicks "Search Sections".
5. User clicks "Edit Section 1" $\rightarrow$ **Full page route navigation to `/sections/101/assign`**.
6. User has to manually type Faculty Employee ID (having to cross-reference an external PDF roster).
7. User clicks "Save" $\rightarrow$ Redirects back to Section List.
8. User repeats steps 5–7 eight times for all 8 course sections (**24 clicks + 8 page transitions**).
9. User navigates to a separate "Audit & Calculations" menu tab.
10. User clicks "Recalculate Workload Points" and waits 6 seconds for backend report generation.
11. User discovers 2 faculty members are overloaded, requiring them to manually go back and edit sections again.

---

## 3. The Hidden Costs
- **Clicks**: 28
- **Screens**: 10
- **Fields typed**: 8
- **Manual arithmetic / lookups**: 8
- **Friction Score**: **64.0**
- **Quality Gate Violations**:
  - Failed Q1 (Fewer clicks / screens).
  - Failed Q2 (Infer department / term).
  - Failed Q3 (Reuse existing faculty directory).
  - Failed Q5 (Real-time automatic calculation).
