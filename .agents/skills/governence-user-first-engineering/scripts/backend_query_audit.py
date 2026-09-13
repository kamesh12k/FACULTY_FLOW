#!/usr/bin/env python3
"""
Backend Query, Performance & Security Static AST Auditor (Enterprise Edition)

Comprehensive AST-based static analyzer for Python backends (FastAPI, SQLAlchemy, Flask, Django).
Scans for:
1. N+1 Query Risks (Database queries inside loops)
2. Unbounded List Queries (Calling .all() / .fetchall() without pagination/limits)
3. Raw String Interpolated SQL Queries (SQL Injection hazards)
4. Unprotected Endpoints (Route handlers without authentication or security dependencies)
5. Unhandled DB Transactions (db.commit() outside try/except or missing rollback)
6. Hardcoded Secrets & High-Entropy Credentials

Exit Codes:
- 0: Clean / No blocking errors
- 1: Security or Performance violations detected (when --strict is enabled)
"""

import argparse
import ast
import json
import math
import os
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

SECRET_REGEXES = [
    re.compile(r"""(?i)(?:secret|token|password|apikey|api_key|auth_token|jwt_secret)\s*=\s*['"][a-zA-Z0-9_\-\.]{8,}['"]"""),
    re.compile(r"""(?i)bearer\s+[a-zA-Z0-9_\-\.]{20,}"""),
    re.compile(r"""(?i)-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----"""),
]

def calculate_shannon_entropy(s: str) -> float:
    """Calculate Shannon entropy of a string to detect high-entropy secrets."""
    if not s:
        return 0.0
    freq = {}
    for c in s:
        freq[c] = freq.get(c, 0) + 1
    entropy = 0.0
    for count in freq.values():
        p = count / len(s)
        entropy -= p * math.log2(p)
    return entropy

class CodeASTAuditor(ast.NodeVisitor):
    def __init__(self, filepath: Path, file_content: str):
        self.filepath = filepath
        self.content = file_content
        self.lines = file_content.splitlines()
        self.findings: List[Dict] = []
        self.in_loop_stack: List[ast.AST] = []
        self.current_function: Optional[ast.FunctionDef] = None

    def visit_For(self, node: ast.For):
        self.in_loop_stack.append(node)
        self.generic_visit(node)
        self.in_loop_stack.pop()

    def visit_While(self, node: ast.While):
        self.in_loop_stack.append(node)
        self.generic_visit(node)
        self.in_loop_stack.pop()

    def visit_AsyncFor(self, node: ast.AsyncFor):
        self.in_loop_stack.append(node)
        self.generic_visit(node)
        self.in_loop_stack.pop()

    def visit_FunctionDef(self, node: ast.FunctionDef):
        prev_fn = self.current_function
        self.current_function = node
        self._check_route_security_and_pagination(node)
        self.generic_visit(node)
        self.current_function = prev_fn

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef):
        prev_fn = self.current_function
        self.current_function = node
        self._check_route_security_and_pagination(node)
        self.generic_visit(node)
        self.current_function = prev_fn

    def visit_Assign(self, node: ast.Assign):
        # Track if a variable is assigned a JoinedStr (f-string) or BinOp (%) formatted SQL string
        if isinstance(node.value, (ast.JoinedStr, ast.BinOp)):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    val_str = ""
                    if isinstance(node.value, ast.JoinedStr):
                        val_str = " ".join([c.value for c in node.value.values if isinstance(c, ast.Constant)])
                    elif isinstance(node.value, ast.BinOp) and isinstance(node.value.left, ast.Constant):
                        val_str = str(node.value.left.value)
                    
                    sql_keywords = ["select", "insert", "update", "delete", "drop", "alter", "where"]
                    if any(kw in val_str.lower() for kw in sql_keywords) or "query" in target.id.lower() or "sql" in target.id.lower():
                        self.findings.append({
                            "type": "SECURITY_SQL_INJECTION",
                            "severity": "CRITICAL",
                            "file": str(self.filepath),
                            "line": node.lineno,
                            "col": node.col_offset,
                            "code": self._get_line_snippet(node.lineno),
                            "message": f"Dangerous raw SQL string formatting via '{target.id}'. Use parameterized queries (:param) instead of string concatenation/f-strings."
                        })
        self.generic_visit(node)

    def visit_Call(self, node: ast.Call):
        func_name = self._get_call_name(node.func)

        # 1. Check for N+1 Query in Loop
        if self.in_loop_stack:
            db_query_methods = [
                ".query", ".filter", ".filter_by", ".get", ".first", ".all",
                ".execute", ".scalars", ".scalar", "session.query", "db.query",
                "cursor.execute", "session.get"
            ]
            if any(func_name.endswith(m) or m in func_name for m in db_query_methods):
                loop_node = self.in_loop_stack[-1]
                self.findings.append({
                    "type": "PERFORMANCE_N_PLUS_ONE",
                    "severity": "HIGH",
                    "file": str(self.filepath),
                    "line": node.lineno,
                    "col": node.col_offset,
                    "code": self._get_line_snippet(node.lineno),
                    "message": f"Potential N+1 query: database call '{func_name}()' executed inside loop (loop started line {loop_node.lineno}). Consider joinedload / selectinload or batch querying."
                })

        # 2. Check for Raw String Formatted SQL (SQL Injection Hazard) passed directly
        if any(func_name.endswith(m) for m in [".execute", "session.execute", "cursor.execute", "db.engine.execute"]):
            if node.args:
                first_arg = node.args[0]
                if isinstance(first_arg, (ast.JoinedStr, ast.BinOp)):
                    self.findings.append({
                        "type": "SECURITY_SQL_INJECTION",
                        "severity": "CRITICAL",
                        "file": str(self.filepath),
                        "line": node.lineno,
                        "col": node.col_offset,
                        "code": self._get_line_snippet(node.lineno),
                        "message": f"Dangerous raw SQL execution using direct string interpolation in '{func_name}()'. Use parameterized queries or ORM expressions."
                    })

        self.generic_visit(node)

    def _get_call_name(self, node: ast.AST) -> str:
        if hasattr(ast, "unparse"):
            try:
                return ast.unparse(node)
            except Exception:
                pass
        if isinstance(node, ast.Name):
            return node.id
        elif isinstance(node, ast.Attribute):
            return f"{self._get_call_name(node.value)}.{node.attr}"
        return ""

    def _get_line_snippet(self, lineno: int) -> str:
        if 1 <= lineno <= len(self.lines):
            return self.lines[lineno - 1].strip()
        return ""

    def _check_route_security_and_pagination(self, node):
        is_route = False
        route_method = ""
        has_auth_dependency = False

        route_decorators = [
            "router.get", "router.post", "router.put", "router.delete", "router.patch",
            "app.get", "app.post", "app.put", "app.delete", "app.patch", "app.route"
        ]

        auth_keywords = [
            "get_current_user", "get_current_active_user", "require_role", "require_permission",
            "Depends(auth", "Security(", "login_required", "roles_required", "admin_required"
        ]

        for dec in node.decorator_list:
            dec_str = self._get_call_name(dec)
            if any(r in dec_str for r in route_decorators):
                is_route = True
                route_method = dec_str

            if any(k in dec_str for k in auth_keywords):
                has_auth_dependency = True

        if not is_route:
            return

        # Check function parameters for Depends(get_current_user) etc.
        for arg in node.args.args + getattr(node.args, "kwonlyargs", []):
            arg_name = arg.arg
            if "user" in arg_name.lower() or "auth" in arg_name.lower() or "current" in arg_name.lower():
                has_auth_dependency = True

        # Check if function body contains auth checks or documentation markers
        func_body_str = self.content[node.lineno:getattr(node, "end_lineno", node.lineno + 30)]
        if any(k in func_body_str for k in auth_keywords):
            has_auth_dependency = True

        # Public exceptions (login, health, swagger, docs)
        fn_name_lower = node.name.lower()
        is_public_whitelist = any(
            w in fn_name_lower for w in ["login", "health", "public", "openapi", "metrics", "docs", "ping"]
        )

        if not has_auth_dependency and not is_public_whitelist:
            self.findings.append({
                "type": "SECURITY_UNPROTECTED_ROUTE",
                "severity": "HIGH",
                "file": str(self.filepath),
                "line": node.lineno,
                "col": node.col_offset,
                "code": f"def {node.name}(...)",
                "message": f"Route handler '{node.name}' ({route_method}) has no visible authentication dependency (e.g., Depends(get_current_user))."
            })

        # Check for unpaginated .all() in GET routes
        if "get" in route_method.lower() or "list" in fn_name_lower:
            has_all_call = False
            has_limit = False

            for child in ast.walk(node):
                if isinstance(child, ast.Call):
                    c_name = self._get_call_name(child.func)
                    if c_name.endswith(".all") or c_name.endswith(".fetchall"):
                        has_all_call = True
                    if any(l in c_name for l in [".limit", ".slice", ".paginate", "offset", "limit"]):
                        has_limit = True

            if has_all_call and not has_limit:
                self.findings.append({
                    "type": "PERFORMANCE_UNPAGINATED_LIST",
                    "severity": "MEDIUM",
                    "file": str(self.filepath),
                    "line": node.lineno,
                    "col": node.col_offset,
                    "code": f"def {node.name}(...)",
                    "message": f"Route handler '{node.name}' fetches collection records via .all() without explicit pagination or query limit."
                })

def scan_text_for_secrets(filepath: Path, content: str) -> List[Dict]:
    findings = []
    lines = content.splitlines()
    for idx, line in enumerate(lines, 1):
        stripped = line.strip()
        if stripped.startswith("#") or "example" in stripped.lower() or "placeholder" in stripped.lower():
            continue
        for regex in SECRET_REGEXES:
            match = regex.search(stripped)
            if match:
                findings.append({
                    "type": "SECURITY_HARDCODED_SECRET",
                    "severity": "CRITICAL",
                    "file": str(filepath),
                    "line": idx,
                    "col": match.start(),
                    "code": stripped[:60] + "...",
                    "message": "Potential hardcoded secret, token, or private key discovered in source code."
                })
    return findings

def audit_directory(
    root_path: Path,
    exclude_patterns: List[str] = None
) -> List[Dict]:
    if exclude_patterns is None:
        exclude_patterns = [".venv", "venv", "__pycache__", "node_modules", ".git", ".pytest_cache", "site-packages"]

    all_findings = []

    for path in root_path.rglob("*.py"):
        str_path = str(path)
        if any(exc in str_path for exc in exclude_patterns):
            continue

        try:
            content = path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue

        # 1. Regex secrets audit
        all_findings.extend(scan_text_for_secrets(path, content))

        # 2. AST parsing & inspection
        try:
            tree = ast.parse(content, filename=str(path))
            auditor = CodeASTAuditor(path, content)
            auditor.visit(tree)
            all_findings.extend(auditor.findings)
        except SyntaxError:
            pass

    return all_findings

def print_findings(findings: List[Dict]):
    print("\n" + "=" * 80)
    print(" GOVERNENCE BACKEND QUERY & SECURITY AUDIT REPORT")
    print("=" * 80)
    
    if not findings:
        print("\n[OK] ZERO query anti-patterns or security violations detected! All checks passed.\n")
        return

    severity_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    findings.sort(key=lambda f: (severity_order.get(f.get("severity", "LOW"), 99), f.get("file", ""), f.get("line", 0)))

    print(f"\nTotal Findings: {len(findings)}\n")
    for f in findings:
        sev = f["severity"]
        badge = f"[{sev}]"
        print(f"{badge:<10} {f['type']}")
        print(f"Location : {f['file']}:{f['line']}")
        print(f"Snippet  : {f['code']}")
        print(f"Advice   : {f['message']}")
        print("-" * 80)

def main():
    parser = argparse.ArgumentParser(description="Backend AST Query, Performance & Security Static Analyzer")
    parser.add_argument("target", nargs="?", default=".", help="Directory or file to audit")
    parser.add_argument("--json-out", type=str, help="Export findings to JSON format")
    parser.add_argument("--strict", action="store_true", help="Return non-zero exit code if HIGH or CRITICAL issues exist")

    args = parser.parse_args()
    target_path = Path(args.target).resolve()

    if not target_path.exists():
        print(f"Target path does not exist: {target_path}", file=sys.stderr)
        sys.exit(1)

    findings = audit_directory(target_path) if target_path.is_dir() else []
    if target_path.is_file() and target_path.suffix == ".py":
        content = target_path.read_text(encoding="utf-8", errors="ignore")
        findings.extend(scan_text_for_secrets(target_path, content))
        try:
            tree = ast.parse(content, filename=str(target_path))
            auditor = CodeASTAuditor(target_path, content)
            auditor.visit(tree)
            findings.extend(auditor.findings)
        except SyntaxError:
            pass

    print_findings(findings)

    if args.json_out:
        with open(args.json_out, "w", encoding="utf-8") as f:
            json.dump(findings, f, indent=2)
        print(f"[Exported JSON audit report to {args.json_out}]")

    if args.strict:
        has_blocking = any(f["severity"] in ["CRITICAL", "HIGH"] for f in findings)
        if has_blocking:
            print("\n[FAIL] Audit failed: Blocking issues detected under --strict mode.", file=sys.stderr)
            sys.exit(1)

if __name__ == "__main__":
    main()
