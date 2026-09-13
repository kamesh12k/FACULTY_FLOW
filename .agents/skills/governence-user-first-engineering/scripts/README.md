# Governence Skill Tooling & Automation Suite

This directory contains standalone Python CLI tools and automated analyzers supporting the **Governence User-First Engineering** lifecycle.

---

## 1. `workflow_friction_score.py`
Calculates and formats before/after metrics for user-facing workflows.

### Capabilities:
- Interactive wizard mode (`--interactive`)
- Built-in demonstration (`--demo`)
- JSON import and export for tracking across PRs (`--json-in`, `--json-out`)
- Generates clean GitHub-flavored markdown comparison matrices.

### Usage:
```bash
# Direct CLI mode
python scripts/workflow_friction_score.py \
  --name "Faculty Section Allocation" \
  --b-clicks 14 --b-screens 4 --b-fields 9 --b-calcs 2 \
  --a-clicks 4  --a-screens 1 --a-fields 3 --a-calcs 0

# Interactive wizard
python scripts/workflow_friction_score.py --interactive
```

---

## 2. `backend_query_audit.py`
High-precision AST-based static analyzer for Python backends (FastAPI, SQLAlchemy, Flask).

### Checks Performed:
- **N+1 Database Queries**: Detects ORM/database queries executed within `for`, `while`, and `async for` loops.
- **SQL Injection Hazards**: Detects string interpolation (`f"..."`, `format()`, `%`) passed to database execution methods.
- **Unprotected Routes**: Flags endpoints lacking authentication dependencies (e.g. `Depends(get_current_user)`).
- **Unbounded List Endpoints**: Identifies collection queries calling `.all()` or `.fetchall()` without pagination/limits.
- **Hardcoded Secrets**: Identifies API keys, private keys, and high-entropy secret assignments.

### Usage:
```bash
python scripts/backend_query_audit.py backend/ --strict --json-out audit_report.json
```

---

## 3. `run_quality_gate.py`
Executes Phase 4 verification against the 16-point Quality Gate checklist.

### Usage:
```bash
# Interactive sign-off wizard
python scripts/run_quality_gate.py

# Automated CI pipeline mode
python scripts/run_quality_gate.py --auto-signoff --title "Feature PR #102" --out QUALITY_GATE_REPORT.md
```

---

## 4. `validate_skill.py`
Audits the skill suite structure, YAML frontmatter, Python script syntax, and markdown cross-links.

### Usage:
```bash
python scripts/validate_skill.py
```

---

## 5. `test_skill_scripts.py`
Unit test suite verifying all tooling logic and AST parsing rules.

### Usage:
```bash
python -m unittest scripts/test_skill_scripts.py
```
