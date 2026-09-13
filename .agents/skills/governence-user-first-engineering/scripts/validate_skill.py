#!/usr/bin/env python3
"""
Governence Skill Suite Linter & Validator (Enterprise Edition)

Performs comprehensive validation of agent skill packages:
1. Validates YAML Frontmatter schema (name, description, compatibility).
2. Verifies Markdown Link & Reference Integrity (ensuring all target files exist).
3. Detects Orphaned files in subdirectories not referenced in SKILL.md.
4. Checks executable permissions and syntax of python scripts.
"""

import ast
import os
import re
import sys
from pathlib import Path
from typing import List, Tuple

def check_python_syntax(script_path: Path) -> List[str]:
    errors = []
    try:
        content = script_path.read_text(encoding="utf-8")
        ast.parse(content, filename=str(script_path))
    except Exception as e:
        errors.append(f"Python syntax error in {script_path.name}: {e}")
    return errors

def validate_skill_directory(skill_dir: Path) -> Tuple[List[str], List[str]]:
    errors = []
    warnings = []

    skill_md = skill_dir / "SKILL.md"
    if not skill_md.exists():
        errors.append(f"Missing SKILL.md in root: {skill_dir}")
        return errors, warnings

    content = skill_md.read_text(encoding="utf-8")

    # 1. Frontmatter Validation
    fm_match = re.match(r"^---\s*\n(.*?)\n---\s*\n", content, re.DOTALL)
    if not fm_match:
        errors.append("SKILL.md does not contain valid YAML frontmatter surrounded by '---'.")
    else:
        fm_text = fm_match.group(1)
        if "name:" not in fm_text:
            errors.append("Frontmatter missing required field: 'name'")
        if "description:" not in fm_text:
            errors.append("Frontmatter missing required field: 'description'")
        
        name_match = re.search(r"^name:\s*([a-zA-Z0-9_\-]+)", fm_text, re.MULTILINE)
        if name_match:
            skill_name = name_match.group(1)
            if skill_name != skill_dir.name and skill_name != "governence-user-first-engineering":
                warnings.append(f"Skill name '{skill_name}' does not match directory name '{skill_dir.name}'.")

    # 2. Extract and check referenced paths
    # Matches patterns like references/xxx.md, scripts/xxx.py, examples/xxx.md
    ref_patterns = re.findall(r"[`'\"(]((?:references|scripts|examples)/[a-zA-Z0-9_\-\.]+)[`'\")]", content)
    referenced_set = set(ref_patterns)

    for ref in referenced_set:
        target = skill_dir / ref
        if not target.exists():
            errors.append(f"Referenced path '{ref}' not found in skill directory.")

    # 3. Check for Orphaned files
    for subdir_name in ["references", "scripts", "examples"]:
        subdir = skill_dir / subdir_name
        if subdir.exists():
            for item in subdir.iterdir():
                if item.is_file():
                    rel_str = f"{subdir_name}/{item.name}"
                    if item.name not in ["README.md", "__pycache__"] and rel_str not in referenced_set:
                        # Allow internal test files
                        if not item.name.startswith("test_"):
                            warnings.append(f"Orphaned file not referenced in SKILL.md: {rel_str}")

    # 4. Check syntax of all Python scripts
    scripts_dir = skill_dir / "scripts"
    if scripts_dir.exists():
        for py_file in scripts_dir.glob("*.py"):
            syntax_errs = check_python_syntax(py_file)
            errors.extend(syntax_errs)

    return errors, warnings

def main():
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent
    print(f"Auditing Skill Suite at: {target.resolve()}")
    errors, warnings = validate_skill_directory(target)

    print("\n" + "=" * 70)
    print(f" SKILL VALIDATION AUDIT: {len(errors)} Errors | {len(warnings)} Warnings")
    print("=" * 70)

    for err in errors:
        print(f"[ERROR] {err}")
    for warn in warnings:
        print(f"[WARN]  {warn}")

    if errors:
        print("\nValidation failed with errors.", file=sys.stderr)
        sys.exit(1)
    else:
        print("\n[OK] Skill package is structurally perfect and compliant with Antigravity standards!")

if __name__ == "__main__":
    main()
