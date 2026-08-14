# FAFLOW — Credit Management & Ledger Accounting

This document details the mathematical rules, data structures, and auditing mechanisms governing faculty substitution credits and staff operational ledgers.

---

## 1. Faculty Workload Credit Model

The Academic Faculty Credit system provides an automated, peer-to-peer workload accounting ledger:

```mermaid
flowchart TD
    subgraph Earning["Credit Earning (+1.0)"]
        S[Cover Colleague's Class] -->|Trigger| AC[+1.0 Workload Credit]
    end

    subgraph Deduction["Credit Deduction (−1.0)"]
        L[Take Approved Leave] -->|Trigger| DC[−1.0 Credit per Period]
    end

    AC --> LEDGER[(Immutable Credit Ledger)]
    DC --> LEDGER
    LEDGER --> BAL[Live O(1) Cached Balance]
```

### Business Invariants:
1. **Zero Holiday Impact**: Approved leaves on official holidays produce zero credit transactions.
2. **Double-Booking Protection**: A teacher cannot earn multiple credits in the same period.
3. **Cancellation Refund**: If an approved leave is cancelled, the deducted credits are refunded immediately to the applicant, and any awarded substitution credits are reversed with audit logging.

---

## 2. Operational Staff Leave Ledger & Quota Management

Operational personnel maintain an annual leave quota and duty credit ledger:

| Action | Ledger Type | Balance Impact | Audit Note |
|---|---|---|---|
| **Annual Quota Initialization** | `opening_balance` | `+12.0 Days` (Default) | System onboarding |
| **Approved Full Day Leave** | `leave_deduction` | `−1.0 Day` | Leave request approval |
| **Approved Half Day Leave (FN/AN)** | `leave_deduction` | `−0.5 Day` | Half-day leave approval |
| **Manager Duty Credit Award** | `duty_credit_awarded` | `+1.0 Day` (Custom) | Weekend or exam duty compensation |
| **Annual Quota Adjustment** | `quota_adjustment` | `+/− Difference` | Revised employment quota |
| **Leave Cancellation** | `cancellation_refund` | `+1.0` / `+0.5 Day` | Automatic refund upon cancellation |
