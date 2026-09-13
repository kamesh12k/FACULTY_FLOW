#!/usr/bin/env python3
"""
Automated Unit Test Suite for Governence Skill Scripts

Validates:
- workflow_friction_score.py calculation logic and formatting
- backend_query_audit.py AST parser, N+1 detection, SQL injection scanner, and auth checks
- validate_skill.py link integrity and frontmatter checks
- run_quality_gate.py report generation
"""

import ast
import json
import os
import subprocess
import sys
import unittest
from pathlib import Path

# Add scripts directory to sys.path
SCRIPTS_DIR = Path(__file__).resolve().parent
SKILL_ROOT = SCRIPTS_DIR.parent
sys.path.insert(0, str(SCRIPTS_DIR))

import backend_query_audit
import run_quality_gate
import validate_skill
import workflow_friction_score

class TestWorkflowFrictionScore(unittest.TestCase):
    def test_friction_calculation(self):
        metrics = {
            "clicks": 10,
            "screens": 2,
            "fields": 4,
            "decisions": 1,
            "waiting_secs": 4,
            "manual_calcs": 1,
            "repeated_entries": 0
        }
        # 10*1.0 + 2*3.0 + 4*1.5 + 1*2.5 + 4*0.5 + 1*4.0 + 0*3.5 = 10 + 6 + 6 + 2.5 + 2.0 + 4.0 = 30.5
        score = workflow_friction_score.calculate_score(metrics)
        self.assertEqual(score, 30.5)

    def test_markdown_report_generation(self):
        before = {"clicks": 8, "screens": 3, "fields": 6}
        after = {"clicks": 2, "screens": 1, "fields": 2}
        report = workflow_friction_score.generate_markdown_report("Test Flow", before, after, False)
        self.assertIn("Workflow Friction Analysis: Test Flow", report)
        self.assertIn("Clicks & Taps", report)
        self.assertIn("MEASURED", report)


class TestBackendQueryAudit(unittest.TestCase):
    def test_n_plus_one_detection(self):
        code = """
def fetch_allocations(sections):
    results = []
    for s in sections:
        faculty = db.query(Faculty).filter(Faculty.id == s.faculty_id).first()
        results.append((s, faculty))
    return results
"""
        tree = ast.parse(code)
        auditor = backend_query_audit.CodeASTAuditor(Path("dummy.py"), code)
        auditor.visit(tree)
        
        n_plus_one_findings = [f for f in auditor.findings if f["type"] == "PERFORMANCE_N_PLUS_ONE"]
        self.assertGreaterEqual(len(n_plus_one_findings), 1)

    def test_sql_injection_detection(self):
        code = """
def search_courses(user_query):
    query_str = f"SELECT * FROM courses WHERE name = '{user_query}'"
    return db.engine.execute(query_str)
"""
        tree = ast.parse(code)
        auditor = backend_query_audit.CodeASTAuditor(Path("dummy.py"), code)
        auditor.visit(tree)
        
        sqli_findings = [f for f in auditor.findings if f["type"] == "SECURITY_SQL_INJECTION"]
        self.assertGreaterEqual(len(sqli_findings), 1)

    def test_unprotected_route_detection(self):
        code = """
@router.get("/api/v1/sensitive-data")
def get_sensitive_data():
    return db.query(SecretModel).all()
"""
        tree = ast.parse(code)
        auditor = backend_query_audit.CodeASTAuditor(Path("dummy.py"), code)
        auditor.visit(tree)
        
        unprot = [f for f in auditor.findings if f["type"] == "SECURITY_UNPROTECTED_ROUTE"]
        self.assertGreaterEqual(len(unprot), 1)

    def test_secret_entropy_and_regex(self):
        code = "api_key = 'abcdef1234567890abcdef1234567890'"
        findings = backend_query_audit.scan_text_for_secrets(Path("dummy.py"), code)
        self.assertGreaterEqual(len(findings), 1)


class TestValidateSkill(unittest.TestCase):
    def test_validate_current_skill(self):
        errors, warnings = validate_skill.validate_skill_directory(SKILL_ROOT)
        self.assertEqual(len(errors), 0, f"Validation errors found: {errors}")


class TestQualityGateRunner(unittest.TestCase):
    def test_gate_report_structure(self):
        checked = {k: True for k, _ in run_quality_gate.GATE_ITEMS}
        evidence = {k: "Verified in test" for k, _ in run_quality_gate.GATE_ITEMS}
        report = run_quality_gate.generate_gate_report("Test PR", "Test Author", "minor", "Value statement", checked, evidence, "Pytest passed")
        self.assertIn("Quality Gate Verification Report: Test PR", report)
        self.assertIn("Phase 4 Quality Gate Checklist", report)
        self.assertIn("✅ PASS", report)

if __name__ == "__main__":
    unittest.main()
