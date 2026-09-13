#!/usr/bin/env python3
"""
Workflow Friction Score Calculator (Enterprise Edition)

Measures, scores, and compares user effort across UI workflows using standardized metrics:
- Clicks & Interactions
- Screen transitions & Route shifts
- Form fields & inputs
- High-cognitive decision points
- System waiting time (latency/spinners)
- Manual calculations & mental arithmetic
- Repeated data entries (transcriptions)

Supports:
- CLI calculation & Comparison
- Interactive guided calculation
- JSON / CSV export and import
- Batch workflow comparison
- Markdown report formatting
"""

import argparse
import json
import sys
from typing import Dict, List, Optional

WEIGHTS = {
    "clicks": 1.0,             # Physical interaction overhead
    "screens": 3.0,            # Context shift / navigation load
    "fields": 1.5,             # Input and typing friction
    "decisions": 2.5,          # Cognitive / decision-making overhead
    "waiting_secs": 0.5,       # Idle waiting / loading latency
    "manual_calcs": 4.0,       # Mental arithmetic / manual cross-checks
    "repeated_entries": 3.5,   # Information re-entry / copy-paste
}

METRIC_LABELS = {
    "clicks": "Clicks & Taps",
    "screens": "Screen Transitions",
    "fields": "Form Fields & Inputs",
    "decisions": "Cognitive Decisions",
    "waiting_secs": "Waiting Time (secs)",
    "manual_calcs": "Manual Calculations",
    "repeated_entries": "Repeated Data Entries",
}

def calculate_score(metrics: Dict[str, float]) -> float:
    """Calculate weighted friction score."""
    score = sum(float(metrics.get(k, 0)) * WEIGHTS[k] for k in WEIGHTS)
    return round(score, 2)

def generate_markdown_report(
    workflow_name: str,
    before: Dict[str, float],
    after: Dict[str, float],
    is_estimated: bool = False,
    notes: Optional[str] = None
) -> str:
    """Generate GitHub-flavored markdown comparison table."""
    score_before = calculate_score(before)
    score_after = calculate_score(after)
    reduction = round(((score_before - score_after) / score_before * 100), 1) if score_before > 0 else 0.0

    status_tag = "ESTIMATED" if is_estimated else "MEASURED"
    
    lines = [
        f"### Workflow Friction Analysis: {workflow_name} (`{status_tag}`)",
        "",
        "| Metric | Before | After | Delta | Weight |",
        "| :--- | :---: | :---: | :---: | :---: |",
    ]

    for key, weight in WEIGHTS.items():
        b_val = before.get(key, 0)
        a_val = after.get(key, 0)
        delta = a_val - b_val
        delta_str = f"{delta:+g}" if delta != 0 else "0"
        lines.append(f"| **{METRIC_LABELS[key]}** | {b_val:g} | {a_val:g} | {delta_str} | {weight}x |")

    lines.extend([
        "| **TOTAL FRICTION SCORE** | **" + f"{score_before:.1f}" + "** | **" + f"{score_after:.1f}" + "** | **" + f"{score_after - score_before:+.1f} ({reduction:+g}%)" + "** | - |",
        "",
        f"> **Summary**: User effort reduced by **{reduction}%** ({score_before:.1f} → {score_after:.1f} points).",
    ])

    if notes:
        lines.extend(["", f"**Notes / Justifications**: {notes}"])

    return "\n".join(lines)

def run_interactive():
    """Guided terminal interactive mode."""
    print("\n" + "=" * 60)
    print(" WORKFLOW FRICTION SCORE - INTERACTIVE MODE")
    print("=" * 60)
    name = input("Workflow Name (e.g. Faculty Assignment): ").strip() or "Standard Workflow"
    
    print("\n--- Enter BEFORE Workflow Metrics ---")
    before = {}
    for key in WEIGHTS:
        val = input(f"{METRIC_LABELS[key]}: ").strip()
        before[key] = float(val) if val else 0.0

    print("\n--- Enter AFTER Workflow Metrics ---")
    after = {}
    for key in WEIGHTS:
        val = input(f"{METRIC_LABELS[key]}: ").strip()
        after[key] = float(val) if val else 0.0

    est_input = input("\nAre these counts estimated? (y/N): ").strip().lower()
    is_estimated = est_input.startswith("y")
    
    notes = input("Optional notes/trade-off justifications: ").strip()

    md = generate_markdown_report(name, before, after, is_estimated, notes)
    print("\n" + md + "\n")

def run_demo():
    """Run a pre-configured demo benchmark."""
    before = {
        "clicks": 14,
        "screens": 4,
        "fields": 9,
        "decisions": 5,
        "waiting_secs": 12,
        "manual_calcs": 2,
        "repeated_entries": 3,
    }
    after = {
        "clicks": 4,
        "screens": 1,
        "fields": 3,
        "decisions": 2,
        "waiting_secs": 1,
        "manual_calcs": 0,
        "repeated_entries": 0,
    }
    md = generate_markdown_report(
        "Faculty Timetable & Credit Allocation Flow",
        before,
        after,
        is_estimated=False,
        notes="Automated department pre-selection, integrated real-time credit calculation, and inline matrix assignment."
    )
    print(md)

def main():
    parser = argparse.ArgumentParser(description="Workflow Friction Score Calculator (Governence User-First Standard)")
    parser.add_argument("--name", type=str, default="Target Workflow", help="Name of the workflow")
    parser.add_argument("--interactive", action="store_true", help="Launch interactive step-by-step mode")
    parser.add_argument("--demo", action="store_true", help="Run demonstrative sample calculation")
    parser.add_argument("--estimated", action="store_true", help="Flag metrics as estimated rather than physically measured")
    parser.add_argument("--notes", type=str, default=None, help="Design notes or trade-off justifications")

    # Before metrics
    parser.add_argument("--b-clicks", type=float, default=0)
    parser.add_argument("--b-screens", type=float, default=0)
    parser.add_argument("--b-fields", type=float, default=0)
    parser.add_argument("--b-decisions", type=float, default=0)
    parser.add_argument("--b-waiting", type=float, default=0)
    parser.add_argument("--b-calcs", type=float, default=0)
    parser.add_argument("--b-repeats", type=float, default=0)

    # After metrics
    parser.add_argument("--a-clicks", type=float, default=0)
    parser.add_argument("--a-screens", type=float, default=0)
    parser.add_argument("--a-fields", type=float, default=0)
    parser.add_argument("--a-decisions", type=float, default=0)
    parser.add_argument("--a-waiting", type=float, default=0)
    parser.add_argument("--a-calcs", type=float, default=0)
    parser.add_argument("--a-repeats", type=float, default=0)

    # Export formats
    parser.add_argument("--json-out", type=str, help="Export results to JSON file")
    parser.add_argument("--json-in", type=str, help="Load metrics from JSON file")

    args = parser.parse_args()

    if args.interactive:
        run_interactive()
        return

    if args.demo:
        run_demo()
        return

    if args.json_in:
        with open(args.json_in, "r", encoding="utf-8") as f:
            data = json.load(f)
        before = data.get("before", {})
        after = data.get("after", {})
        name = data.get("name", args.name)
        is_estimated = data.get("is_estimated", args.estimated)
        notes = data.get("notes", args.notes)
    else:
        before = {
            "clicks": args.b_clicks,
            "screens": args.b_screens,
            "fields": args.b_fields,
            "decisions": args.b_decisions,
            "waiting_secs": args.b_waiting,
            "manual_calcs": args.b_calcs,
            "repeated_entries": args.b_repeats,
        }
        after = {
            "clicks": args.a_clicks,
            "screens": args.a_screens,
            "fields": args.a_fields,
            "decisions": args.a_decisions,
            "waiting_secs": args.a_waiting,
            "manual_calcs": args.a_calcs,
            "repeated_entries": args.a_repeats,
        }
        name = args.name
        is_estimated = args.estimated
        notes = args.notes

    report = generate_markdown_report(name, before, after, is_estimated, notes)
    print(report)

    if args.json_out:
        out_payload = {
            "workflow_name": name,
            "is_estimated": is_estimated,
            "score_before": calculate_score(before),
            "score_after": calculate_score(after),
            "before_metrics": before,
            "after_metrics": after,
            "notes": notes
        }
        with open(args.json_out, "w", encoding="utf-8") as f:
            json.dump(out_payload, f, indent=2)
        print(f"\n[Saved JSON benchmark to {args.json_out}]")

if __name__ == "__main__":
    main()
