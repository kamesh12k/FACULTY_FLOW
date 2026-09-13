# Research Methodology & Technical Decision Making (Enterprise Guide)

## 1. Decision Criteria: When to Research vs. When to Build

Research carries an opportunity cost. Use the **Decision Matrix**:

| Change Dimension | High Complexity / Reversibility Cost | Low Complexity / Easily Reversible |
| :--- | :--- | :--- |
| **Familiar Domain** | Lightweight design plan (10 mins) | Immediate implementation (0 min research) |
| **Unfamiliar Domain** | Deep technical research & RFC (30-60 mins) | Targeted benchmark or spike (10-15 mins) |

---

## 2. Research Protocol

When formal research is warranted:
1. **Define the Hypothesis**: E.g., *"Does switching from Redis Pub/Sub to PostgreSQL LISTEN/NOTIFY simplify our operational deployment without degrading throughput below 500 msg/sec?"*
2. **Examine Active Code & Real Data**: Inspect actual project dependencies, database engines, and runtime resource constraints.
3. **Prototype / Spike**: Build an isolated script in `scratch/` to measure real latencies or evaluate library ergonomics.
4. **Document Trade-Offs**: Articulate what is gained and what is conceded.
