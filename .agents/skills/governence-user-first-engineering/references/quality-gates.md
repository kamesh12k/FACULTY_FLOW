# Quality Gates & Verification Checklist (Enterprise Guide)

## 1. The 16-Point Quality Gate

Every non-trivial PR or feature must physically pass this checklist with verifiable evidence:

```
[ ] 1. User/business value stated in one unambiguous sentence
[ ] 2. UX reviewed against the five questions (minimize friction & mental overhead)
[ ] 3. Clicks, screens, and fields minimized, or trade-offs explicitly justified
[ ] 4. Automation opportunities leveraged (infer / reuse / autocomplete / combine)
[ ] 5. Accessibility reviewed for all UI surfaces (keyboard nav, contrast, ARIA)
[ ] 6. Security reviewed (authentication, input sanitization, secrets, tenant data scope)
[ ] 7. Performance reviewed for hot paths, algorithms, and critical render loops
[ ] 8. Scalability impact considered (statelessness, async queues, lock contention)
[ ] 9. Resource usage reviewed (queries, memory footprint, bundle size)
[ ] 10. Error handling and failure pathways reviewed (clear user remediation)
[ ] 11. Database impact reviewed (indexes, N+1 query prevention, pagination)
[ ] 12. API contract integrity verified (backward compatibility, types)
[ ] 13. Tests executed, not just written (pass/fail output recorded)
[ ] 14. Regression risk reviewed across adjacent dependencies
[ ] 15. Final Git diff re-read thoroughly to catch unintended artifacts
[ ] 16. Documentation and inline architectural comments updated
```

---

## 2. Change Classification & Enforcement Matrix

| Gate Criterion | Major Change (Schema, Auth, Algorithms) | Minor Change (Bugfix, Local Styling) |
| :--- | :---: | :---: |
| Value Statement (#1) | **Mandatory** | **Mandatory** |
| 5 UX Questions (#2, #3, #4) | **Mandatory** | If UI Touched |
| Accessibility (#5) | **Mandatory** | If UI Touched |
| Security Review (#6) | **Mandatory** | **Mandatory** |
| Performance & DB (#7, #9, #11) | **Mandatory** | If Queries Changed |
| Scalability & Errors (#8, #10) | **Mandatory** | Optional |
| API & Tests Executed (#12, #13) | **Mandatory** | **Mandatory** |
| Regression & Diff Review (#14, #15) | **Mandatory** | **Mandatory** |
| Docs & Comments (#16) | **Mandatory** | Optional |
