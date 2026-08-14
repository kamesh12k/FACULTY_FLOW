# FAFLOW — Core Business Rules & Invariants

This document codifies the non-negotiable mathematical, scheduling, and accounting rules enforced across the FAFLOW platform.

---

## 1. Scheduling & Timetable Rules

1. **Max 5 Periods Rule**: Every working instructional day contains exactly 5 periods (`1` through `5`).
2. **Conflict Invariant**: No teacher, room, or class section can occupy more than one slot during the same Day Order and Period Number.
3. **Calendar Precedence**: Any date lacking an explicit `working` entry in `calendar_days` is non-working. No timetable slots or leaves can be executed on non-working dates.

---

## 2. Autonomous Substitution Scoring Formula

The autonomous substitution recommendation algorithm evaluates candidate teachers based on a weighted composite score ($0 \le \text{Score} \le 100$):

$$\text{Score} = (W_{\text{load}} \times S_{\text{load}}) + (W_{\text{fair}} \times S_{\text{fair}}) + (W_{\text{dept}} \times S_{\text{dept}}) + S_{\text{pref}}$$

Where:
- **Eligibility Filter**: Teacher must be `is_active=TRUE`, have no scheduled classes or leaves in that period, and must not have exceeded the weekly substitution cap (default: max 3/week).
- **$S_{\text{load}}$ (Current Day Workload Score)**: Rewards faculty with fewer classes on the target day.
- **$S_{\text{fair}}$ (Fairness Score)**: Prioritizes faculty who have performed fewer substitutions relative to peers.
- **$S_{\text{dept}}$ (Department Affinity)**: Boosts primary department faculty before cross-department fallback.
- **$S_{\text{pref}}$ (Preference Modifier)**: Factors in individual teacher period availability preferences.

---

## 3. Double-Entry Credit Accounting Rules

1. **Atomic Transaction Rule**: Every balance alteration must be accompanied by an immutable record in `credit_transactions` (for faculty) or `staff_credit_ledger` (for operational staff).
2. **Zero Holiday Drift**: System-wide calendar updates to holidays or non-working days never generate phantom credit deductions or penalties.
3. **Reversal Invariant**: Any cancelled leave must atomically reverse the exact credit delta and unassign the allocated substitute.
