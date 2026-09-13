---
name: governence-user-first-engineering
description: >-
  Governence's company-wide engineering and product standard: maximum useful capability with
  minimum user effort, complexity, and resource use, and maximum reliability. Consult this skill
  for any non-trivial work on a Governence codebase — designing or changing a screen, form, or
  workflow; adding or modifying a feature, API, or data model; anything touching auth, roles, or
  data access; performance, scalability, or resource-usage work; and before calling any change
  "done" or "ready to ship." Also trigger on phrases like "add a feature," "new screen/page,"
  "redesign this flow," "review this PR/diff," "why is this slow," "will this scale," "is this
  secure," "make this a dashboard," or "clean this up." Do not invoke the full process for
  single-line, cosmetic, or purely exploratory changes — see "When this does and doesn't apply."
compatibility: >-
  Framework- and language-agnostic. Works with any coding agent that can read project files and
  run shell commands (Claude Code, Claude Cowork, Google Antigravity, Cursor, etc). Scripts need
  Python 3.9+ only; no third-party packages required (PyYAML used opportunistically if present).
---

# Governence User-First Engineering

## Prime directive

> Maximum useful capability with minimum user effort, minimum unnecessary complexity, minimum
> unnecessary resource consumption, and maximum reliability.

Complexity is a cost the *software* should absorb, not the *user*. "Advanced inside, simple
outside": a Governence feature can be sophisticated in implementation, but if it makes the person
using it think harder, click more, or wait longer than necessary, it has failed — regardless of
how impressive the engineering behind it is.

Everything below exists to make that directive checkable instead of aspirational.

## When this does and doesn't apply

**Run the full loop** for: a new feature or screen, a changed workflow, a new or changed
API/data model, anything touching auth/roles/permissions/data-scoping, anything you'd describe as
a performance or scalability change, anything meant for a management/reporting view, and any point
where you're about to say a change is finished.

**Don't force the full ceremony** onto a copy-edit, a one-line style fix, a config value tweak, or
genuinely exploratory throwaway code. Use judgment — but "small diff" isn't the same as "small
impact"; a one-line change to a shared auth check or a shared query still gets the Security and
"check affected APIs" treatment from Phase 4. When in doubt, do the cheap parts (Phase 1
understanding, Phase 4 verification) and skip the expensive parts (formal research, friction
scoring).

## How this skill is organized

This file is the operating loop — read it in full, every time. The `references/` files are detail
you load only when the phase you're in needs them; don't front-load all of them into context.

| File | Load it when... |
|---|---|
| `references/ux-standards.md` | Designing or changing anything a human clicks through, types into, or reads |
| `references/performance-standards.md` | Touching a hot path, a query, a bundle, or anything you'd call "slow" |
| `references/scalability-standards.md` | Adding concurrency, a new integration, background work, or answering "will this scale" |
| `references/security-standards.md` | Touching auth, roles, input handling, secrets, or third-party data |
| `references/accessibility-standards.md` | Building or changing any user-facing screen or component |
| `references/customization-standards.md` | Adding a setting, role, branding hook, or org-specific behavior |
| `references/management-standards.md` | Building a dashboard, report, or anything management will look at |
| `references/research-methodology.md` | Deciding whether and how to research before a non-trivial design decision |
| `references/quality-gates.md` | Phase 4, for the full gate with pass/fail evidence guidance and a major/minor classifier |
| `references/adapted-from-last30days.md` | You want to know what in this skill came from where, and why |

`scripts/` has runnable tools — see "Scripts" near the end. `examples/` has worked examples — see
"Examples" near the end.

## The operating loop

Every non-trivial change goes through four phases. Move through a phase quickly if it's simple —
but skipping one is how regressions and reinvented wheels happen.

### Phase 1 — Inspect

Before writing or changing code:

1. Find the actual current implementation — don't assume from a file name or a memory of a
   similar project. Read it.
2. Identify what already exists that solves part of this problem (a component, a util, a config
   pattern, a query). Reusing beats rebuilding.
3. Identify dependencies and callers: what else touches this code, calls this API, renders this
   data.
4. Identify the existing convention (naming, folder structure, error handling, state management)
   and match it, even if you'd have chosen differently on a blank page.
5. Name the smallest change that actually solves the problem. "Smallest" is about blast radius,
   not line count — a 5-line change to a shared auth check has a bigger blast radius than a
   200-line new isolated module.

### Phase 2 — Decide

Before implementing, answer these — in the plan or PR description, not just in your head:

**The five UX questions** (full decision heuristics in `references/ux-standards.md`):
- Can the user reach the same result with fewer clicks or fewer screens?
- Can the system infer this instead of asking?
- Can existing information be reused instead of re-entered?
- Can separate steps be combined into one?
- Can the system just do this, instead of asking the user to?

If the honest answer to any of these is "yes, but it's more engineering work," that's not a reason
to skip it — it's the actual job. If the honest answer is "no, and here's why," write the why
down; a design decision without a stated reason looks identical to a decision nobody made.

**Should this be researched first?** (full rules in `references/research-methodology.md`) —
research when the decision is expensive to reverse, the problem space is unfamiliar, or you're
about to assert something is a "best practice" without having checked. Skip research when the
right answer is already obvious from the codebase or domain knowledge; research is a cost too, and
spending it on a one-line fix is its own violation of resource-efficiency.

**Is this worth its complexity?** Weigh it, at whatever depth the decision size warrants:

```
User value | Business value | UX impact | Engineering complexity
Performance impact | Scalability impact | Resource consumption
Security impact | Reliability impact | Maintenance cost
Customization impact | Accessibility impact
```

A feature isn't approved because it's technically impressive. If you can't state the user or
business value in one sentence, that's a signal, not a formality to complete.

### Phase 3 — Implement

- Preserve existing functionality; a fix or feature that breaks something unrelated is a
  regression, not progress.
- Reuse existing components, utilities, and patterns over writing parallel ones. If you're about
  to write something that looks like it might already exist, search for it first.
- Follow the project's actual conventions, not your default style.
- Maintain backward compatibility for anything with external callers (API consumers, other
  services, saved data) unless the task explicitly says otherwise.
- Document non-obvious architectural decisions where you make them — a comment or a short note,
  not a separate document nobody will find.
- If you hit a non-trivial bug or footgun that cost real time to work out, write it down. See
  `references/adapted-from-last30days.md` for the short, categorized "solutions note" pattern
  Governence uses for this, so the next person — human or agent — doesn't rediscover it the hard
  way.

### Phase 4 — Verify

Nothing is "done" until this phase has actually happened — not summarized as having happened.

1. Run the relevant tests. State which ones you ran and what passed or failed. Never say a test
   passed if you didn't run it.
2. Check the APIs your change touches, end to end — a backend change isn't finished if the
   frontend that calls it wasn't updated to match.
3. Check database behavior: new queries reviewed for missing indexes, N+1 shape, and pagination
   (`references/performance-standards.md`; `scripts/backend_query_audit.py` gives a first pass).
4. Check the UI/UX against the five questions above, if any surface changed.
5. Check performance where the change plausibly affects a hot path.
6. Check security implications — anything touching auth, input, or data scope
   (`references/security-standards.md`).
7. Review the actual diff, not your memory of what you meant to change. Look for anything
   unintended riding along.
8. Look explicitly for regressions in adjacent functionality, not just the thing you changed.
9. Run the Quality Gate below.
10. Report exactly what changed and exactly what was tested — no more and no less than what's
    true.

**The Quality Gate** — for any change Phase 1 judged non-trivial. `references/quality-gates.md`
has the full version with a major/minor classifier and pass/fail evidence guidance; this is the
checklist to physically go through:

```
[ ] User/business value stated in one sentence
[ ] UX reviewed against the five questions
[ ] Clicks/screens/fields minimized, or the trade-off is explained
[ ] Automation opportunities considered (infer / reuse / autocomplete / combine)
[ ] Accessibility considered for any UI surface touched
[ ] Security reviewed (auth, input validation, secrets, data scope)
[ ] Performance reviewed where the change plausibly affects a hot path
[ ] Scalability impact considered, or explicitly judged not applicable
[ ] Resource usage reviewed (queries, bundle size, background load)
[ ] Error handling reviewed — what happens when this fails?
[ ] Database impact reviewed (indexes, N+1, pagination)
[ ] API impact reviewed (contract, versioning, consumers)
[ ] Tests executed, not just written
[ ] Regression risk reviewed beyond the immediate diff
[ ] Final diff actually re-read, not assumed
[ ] Documentation or comments updated where a future reader would need them
```

Don't check a box you didn't actually do. An unchecked, explicitly-explained box ("N/A because...")
is honest; a checked box that wasn't done is the single most damaging thing this skill can produce.

## Minimum-effort workflow analysis

Whenever you touch an existing user-facing workflow, measure it — don't just assert it's better.
Count, before and after:

```
Clicks · Screens · Fields · Decisions · Waiting · Manual calculations · Repeated info entry
```

```
Before:                      After:
8 clicks                     4 clicks
3 screens                    1 screen
12 fields                    7 fields
2 manual calculations        0 manual calculations
```

`scripts/workflow_friction_score.py` turns those counts into one comparable number and prints the
table for you — see "Scripts" below. If you didn't measure something (say, you're estimating
clicks from a design mock rather than a working screen), call it "estimated," not "measured." See
`examples/before-after.md` for a reusable template and `examples/good-workflow.md` for a full
worked case.

## Anti-patterns — stop if you catch yourself doing these

- Adding a toggle, service, abstraction layer, or dependency because it's possible, without a
  stated user or business reason.
- Claiming "handles N concurrent users," "fully optimized," "production ready," or "scales"
  without a load test, benchmark, or other evidence behind the claim.
- Weakening a test, coverage floor, or quality threshold to make a build pass, instead of fixing
  what it caught. If a floor is genuinely wrong, moving it is a reviewed decision with a stated
  reason — never a quiet edit to unblock yourself.
- Writing a "consistency" test that asserts two independently-maintained files agree, instead of
  making one the actual source of truth. These look safe and become cascading false failures the
  moment only one of the two files changes for an unrelated reason.
- Exposing a raw table or record list and calling it a "dashboard." A management view answers
  what's happening, what needs attention, why, and what to do — not just what's in the database.
- Matching a URL, host, or permission by substring/`in` containment instead of exact scheme+host
  validation. This is a common way trust checks get bypassed; see `references/security-standards.md`.
- Removing a click by removing a check. Friction and security get solved together — better
  defaults, cached consent, step-up checks only when needed — never by cutting the check.
- Reaching for more CPU/RAM/servers before measuring where the actual bottleneck is.
- Presenting an estimate as a measurement, or a prediction as an observation. Say which one it is.
- Declaring "done" without having actually run the tests, re-read the diff, or checked the
  adjacent surfaces (API/UI/DB) your change touches.
- Silently returning nothing when a query or search finds nothing usable, instead of saying so
  plainly and naming the closest miss if there is one. An honest "nothing solid here" is a valid,
  first-class result — a confident-looking answer built on thin evidence is worse than no answer.

## Provenance

Governence's product and UX philosophy is Governence-original. The operating loop's engineering
discipline — evidence-quality vocabulary, the confidence-floor / honest-empty-state pattern,
gate-governance rules, and the "solutions note" convention — was adapted from concepts studied in
`mvanhorn/last30days-skill` (MIT licensed), re-implemented Governence-native rather than copied.
Full breakdown of what was and wasn't taken in `references/adapted-from-last30days.md`.

## Scripts

| Script | Use it to... |
|---|---|
| `scripts/workflow_friction_score.py` | Turn click/screen/field/decision counts into a comparable friction score and a before/after table |
| `scripts/backend_query_audit.py` | AST static analysis of Python backend for N+1 queries, SQL injection risks, unpaginated list endpoints, unprotected routes, and secrets |
| `scripts/run_quality_gate.py` | Execute interactive/automated Phase 4 verification against the 16-point Quality Gate and generate signed-off reports |
| `scripts/validate_skill.py` | Validate a Governence-style skill folder — frontmatter, Python script syntax, dangling references, orphaned files |
| `scripts/test_skill_scripts.py` | Automated unit test suite verifying all skill script tools and AST analyzers |

Run any script with `-h` / `--help` for full usage. `scripts/README.md` has worked examples and is
explicit about what each script does *not* catch — they're a first pass, not a substitute for real
tooling.

## Examples

- `examples/good-workflow.md` — a full worked case applying Phases 1–4 and the quality gate to a
  new workflow
- `examples/bad-workflow.md` — the same workflow built the naive way: what it costs, and exactly
  where the gate would have caught it
- `examples/before-after.md` — a reusable template for documenting a friction-reduction change,
  with honest measured-vs-estimated labeling
