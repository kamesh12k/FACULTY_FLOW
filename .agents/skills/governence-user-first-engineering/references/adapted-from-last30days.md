# Provenance & Adaptation Notes (Enterprise Guide)

## 1. Provenance & Attribution
Governence User-First Engineering synthesizes user-centric design with disciplined engineering verification patterns. Key conceptual inspirations:
- **Evidence-Quality Taxonomy**: Explicit separation between *measured observation* vs. *speculative estimation*.
- **Honest Empty State Architecture**: Acknowledging missing data cleanly rather than returning ambiguous zero-values or false confirmations.
- **Strict Gate Governance**: Enforcing physical execution of tests and diff reviews before sign-off.

---

## 2. Solutions Note Convention
When resolving complex, non-obvious bugs, footguns, or architectural idiosyncrasies, record a concise **Solutions Note** in the codebase or pull request:

```markdown
### Solutions Note: [Brief Problem Summary]
- **Symptom**: [What went wrong or failed unexpectedly]
- **Root Cause**: [Why it happened - e.g. SQLite locking during concurrency, React stale closure]
- **Resolution**: [How it was fixed cleanly]
- **Prevention**: [Rule or test added to prevent recurrence]
```
