#!/usr/bin/env python3
"""Collect metrics from dafny-replay for paper tables.

Generates LaTeX tables for:
1. Lines of Code (verified vs integration boundary)
2. Kernel Reuse (kernel vs domain LOC)
3. Proof Overhead (spec vs proof constructs)
4. Verification Time
5. Kernel Usage Matrix
"""

import argparse
import subprocess
import re
import time
from pathlib import Path
from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Optional

# Configuration
REPO_ROOT = Path(__file__).parent.parent
PAPER_DIR = REPO_ROOT.parent / "dafny-replay-paper"
KERNELS_DIR = REPO_ROOT / "kernels"

# Application configuration: name -> (directory, kernels_used)
APPS = {
    "Counter": ("counter", ["Replay"]),
    "Canon": ("canon", ["Replay"]),
    "ColorWheel": ("colorwheel", ["Replay"]),
    "DelegationAuth": ("delegation-auth", ["Replay"]),
    "CounterAuthority": ("counter-authority", ["Authority"]),
    "Kanban": ("kanban", ["Replay", "MultiCollaboration", "EffectStateMachine"]),
    "ClearSplit": ("clear-split", ["MultiCollaboration", "EffectStateMachine"]),
    "CollabTodo": ("collab-todo", ["CrossProject", "EffectStateMachine"]),
}

# Kernel files
KERNEL_FILES = [
    "Replay.dfy",
    "Authority.dfy",
    "MultiCollaboration.dfy",
    "EffectStateMachine.dfy",
    "MultiProject.dfy",
    "EffectSystemProperties.dfy",
    "MultiEffectSystemProperties.dfy",
    "MultiProjectEffectStateMachine.dfy",
    "RealtimeCollaboration.dfy",
]

# All kernel names for the usage matrix (display names for paper)
ALL_KERNELS = ["Replay", "Authority", "MultiCollaboration", "EffectStateMachine", "CrossProject"]

# Map display names to actual file names (when they differ)
KERNEL_NAME_TO_FILE = {
    "CrossProject": "MultiProject.dfy",
}


@dataclass
class DafnyMetrics:
    """Metrics for a single Dafny file."""
    total_lines: int = 0
    spec_lines: int = 0
    proof_lines: int = 0


@dataclass
class AppMetrics:
    """Metrics for an application."""
    name: str
    directory: str
    kernels_used: List[str]

    # LOC metrics
    dafny_total: int = 0
    dafny_spec: int = 0
    dafny_proof: int = 0
    js_handwritten: int = 0  # Hand-written integration code
    js_generated: int = 0    # Generated from Dafny compilation

    # Kernel LOC (from kernels/ that this app uses)
    kernel_loc: int = 0
    domain_loc: int = 0

    # Verification time (seconds)
    verify_time: float = 0.0

    # Per-file breakdown
    dafny_files: Dict[str, DafnyMetrics] = field(default_factory=dict)


def count_lines(filepath: Path) -> int:
    """Count all physical lines in a file."""
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            return sum(1 for _ in f)
    except Exception as e:
        print(f"Warning: Could not read {filepath}: {e}")
        return 0


def parse_dafny_constructs(filepath: Path) -> DafnyMetrics:
    """Parse Dafny file and categorize lines as spec vs proof.

    Spec constructs:
    - datatype, type, newtype, function, method, predicate declarations
    - lemma signatures (the statement of what's being proved)
    - requires, ensures, invariant, decreases, modifies, reads clauses
    - module declarations and imports

    Proof constructs:
    - lemma bodies (the actual proof steps inside { })
    - calc blocks
    - assert statements (proof hints)
    - ghost variables used in proofs
    """
    metrics = DafnyMetrics()

    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            lines = content.split('\n')
    except Exception as e:
        print(f"Warning: Could not read {filepath}: {e}")
        return metrics

    metrics.total_lines = len(lines)

    # Track context for multi-line constructs
    in_lemma_body = False  # Inside the { } of a lemma
    in_lemma_sig = False   # In lemma signature (before the body)
    in_calc = False
    brace_depth = 0
    lemma_brace_depth = 0

    # Patterns
    lemma_pattern = re.compile(r'^\s*(ghost\s+)?lemma\s+')
    calc_pattern = re.compile(r'^\s*calc\s*\{')
    assert_pattern = re.compile(r'^\s*assert\s+')
    ghost_var_pattern = re.compile(r'^\s*ghost\s+(var|const)\s+')
    spec_clause_pattern = re.compile(r'^\s*(requires|ensures|invariant|decreases|modifies|reads)\s+')

    for line in lines:
        stripped = line.strip()

        # Count braces for tracking bodies
        open_braces = line.count('{')
        close_braces = line.count('}')

        # Check if entering lemma signature
        if lemma_pattern.match(stripped) and not in_lemma_body:
            in_lemma_sig = True
            lemma_brace_depth = brace_depth
            # Lemma signature line is spec
            metrics.spec_lines += 1
            # Check if body starts on same line
            if '{' in stripped:
                in_lemma_sig = False
                in_lemma_body = True
            brace_depth += open_braces - close_braces
            continue

        # In lemma signature (before body), these are spec
        if in_lemma_sig:
            metrics.spec_lines += 1
            if '{' in stripped:
                in_lemma_sig = False
                in_lemma_body = True
            brace_depth += open_braces - close_braces
            continue

        # Check if entering calc block (always proof)
        if calc_pattern.match(stripped):
            in_calc = True
            metrics.proof_lines += 1
            brace_depth += open_braces - close_braces
            continue

        brace_depth += open_braces - close_braces

        # Check if exiting lemma body
        if in_lemma_body and brace_depth <= lemma_brace_depth and close_braces > 0:
            in_lemma_body = False
            metrics.proof_lines += 1
            continue

        # Check if exiting calc
        if in_calc and '}' in stripped and '{' not in stripped:
            in_calc = False
            metrics.proof_lines += 1
            continue

        # Inside lemma body or calc - these are proof
        if in_lemma_body or in_calc:
            metrics.proof_lines += 1
            continue

        # Standalone assert is proof
        if assert_pattern.match(stripped):
            metrics.proof_lines += 1
            continue

        # Ghost variables outside lemmas are proof helpers
        if ghost_var_pattern.match(stripped):
            metrics.proof_lines += 1
            continue

        # requires/ensures/invariant outside lemma body are spec
        if spec_clause_pattern.match(stripped):
            metrics.spec_lines += 1
            continue

        # Everything else is spec
        metrics.spec_lines += 1

    return metrics


def get_dafny_files(directory: Path) -> List[Path]:
    """Get all .dfy files in directory (non-recursive for app dirs)."""
    if not directory.exists():
        return []
    return list(directory.glob("*.dfy"))


def get_js_files(directory: Path) -> Tuple[List[Path], List[Path]]:
    """Get JS/TS files, separating hand-written from generated.

    Returns: (hand_written_files, generated_files)

    Generated files (from Dafny compilation):
    - *.cjs files (direct Dafny → JS)
    - app.ts in src/dafny/ (generated by dafny2js)
    - dafny-bundle.ts (generated for Supabase)

    Hand-written integration:
    - app-extras.ts (thin wrapper)
    - All other JS/TS files outside src/dafny/
    """
    if not directory.exists():
        return [], []

    src_dir = directory / "src"
    if not src_dir.exists():
        return [], []

    hand_written = []
    generated = []

    for pattern in ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx", "**/*.cjs"]:
        for f in src_dir.glob(pattern):
            # Check if it's in the dafny/ subdirectory
            is_in_dafny_dir = "dafny/" in str(f.relative_to(src_dir)) or str(f.relative_to(src_dir)).startswith("dafny")

            if is_in_dafny_dir:
                if f.name == "app-extras.ts":
                    # Hand-written thin wrapper
                    hand_written.append(f)
                else:
                    # Generated: .cjs, app.ts, dafny-bundle.ts
                    generated.append(f)
            else:
                # Outside dafny/ - hand-written
                hand_written.append(f)

    # Also check supabase/functions for generated dafny-bundle.ts
    supabase_dir = directory / "supabase" / "functions"
    if supabase_dir.exists():
        for f in supabase_dir.glob("**/dafny-bundle.ts"):
            generated.append(f)

    return hand_written, generated


def run_verification(filepath: Path, timeout: int = 300) -> Optional[float]:
    """Run dafny verify and return timing in seconds."""
    try:
        start = time.time()
        subprocess.run(
            ["dafny", "verify", str(filepath)],
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=filepath.parent
        )
        elapsed = time.time() - start
        return elapsed
    except subprocess.TimeoutExpired:
        print(f"Warning: Verification timed out for {filepath}")
        return None
    except FileNotFoundError:
        print("Warning: dafny not found in PATH, skipping verification timing")
        return None
    except Exception as e:
        print(f"Warning: Verification failed for {filepath}: {e}")
        return None


def collect_kernel_metrics(skip_verify: bool = False) -> Tuple[int, int, int, Dict[str, DafnyMetrics], float]:
    """Collect metrics for all kernel files.

    Returns: (total_loc, spec_loc, proof_loc, per_file_metrics, verify_time)
    """
    total = 0
    spec = 0
    proof = 0
    per_file = {}
    verify_time = 0.0

    for filename in KERNEL_FILES:
        filepath = KERNELS_DIR / filename
        if filepath.exists():
            metrics = parse_dafny_constructs(filepath)
            per_file[filename] = metrics
            total += metrics.total_lines
            spec += metrics.spec_lines
            proof += metrics.proof_lines

            # Run verification
            if not skip_verify:
                vtime = run_verification(filepath)
                if vtime is not None:
                    verify_time += vtime

    return total, spec, proof, per_file, verify_time


def collect_app_metrics(app_name: str, directory: str, kernels_used: List[str],
                        skip_verify: bool = False) -> AppMetrics:
    """Collect all metrics for an application."""
    app = AppMetrics(name=app_name, directory=directory, kernels_used=kernels_used)
    app_path = REPO_ROOT / directory

    # Collect Dafny metrics
    dafny_files = get_dafny_files(app_path)
    for filepath in dafny_files:
        metrics = parse_dafny_constructs(filepath)
        app.dafny_files[filepath.name] = metrics
        app.dafny_total += metrics.total_lines
        app.dafny_spec += metrics.spec_lines
        app.dafny_proof += metrics.proof_lines
        app.domain_loc += metrics.total_lines

        # Run verification
        if not skip_verify:
            vtime = run_verification(filepath)
            if vtime is not None:
                app.verify_time += vtime

    # Collect JS/TS metrics (hand-written vs generated)
    hand_written, generated = get_js_files(app_path)
    for filepath in hand_written:
        app.js_handwritten += count_lines(filepath)
    for filepath in generated:
        app.js_generated += count_lines(filepath)

    # Calculate kernel LOC (sum of kernels this app uses)
    for kernel in kernels_used:
        # Map display name to file name if needed
        kernel_file = KERNEL_NAME_TO_FILE.get(kernel, f"{kernel}.dfy")
        if kernel_file in KERNEL_FILES:
            filepath = KERNELS_DIR / kernel_file
            if filepath.exists():
                app.kernel_loc += count_lines(filepath)

    return app


def generate_loc_table(apps: Dict[str, AppMetrics], kernel_total: int) -> str:
    """Generate LaTeX table for Lines of Code."""
    lines = [
        r"\begin{table}[t]",
        r"\centering",
        r"\caption{Lines of Code by Component}",
        r"\label{tab:loc}",
        r"\begin{tabular}{lrrr}",
        r"\toprule",
        r"Component & Verified (Dafny) & Integration & Generated JS \\",
        r"\midrule",
        f"Kernels (shared) & {kernel_total:,} & --- & --- \\\\",
        r"\midrule",
    ]

    for name, app in sorted(apps.items()):
        hw_str = f"{app.js_handwritten:,}" if app.js_handwritten > 0 else "---"
        gen_str = f"{app.js_generated:,}" if app.js_generated > 0 else "---"
        lines.append(f"{name} & {app.dafny_total:,} & {hw_str} & {gen_str} \\\\")

    lines.extend([
        r"\bottomrule",
        r"\end{tabular}",
        r"\end{table}",
    ])

    return "\n".join(lines)


def generate_kernel_reuse_table(apps: Dict[str, AppMetrics]) -> str:
    """Generate LaTeX table for kernel reuse metrics."""
    lines = [
        r"\begin{table}[t]",
        r"\centering",
        r"\caption{Kernel Reuse: Generic vs Domain-Specific Code}",
        r"\label{tab:reuse}",
        r"\begin{tabular}{lrrr}",
        r"\toprule",
        r"Application & Kernel LOC & Domain LOC & Reuse \% \\",
        r"\midrule",
    ]

    for name, app in sorted(apps.items()):
        total = app.kernel_loc + app.domain_loc
        if total > 0:
            reuse_pct = (app.kernel_loc / total) * 100
            lines.append(f"{name} & {app.kernel_loc:,} & {app.domain_loc:,} & {reuse_pct:.1f}\\% \\\\")
        else:
            lines.append(f"{name} & {app.kernel_loc:,} & {app.domain_loc:,} & --- \\\\")

    lines.extend([
        r"\bottomrule",
        r"\end{tabular}",
        r"\end{table}",
    ])

    return "\n".join(lines)


def generate_proof_overhead_table(apps: Dict[str, AppMetrics], kernel_spec: int, kernel_proof: int) -> str:
    """Generate LaTeX table for proof overhead metrics."""
    lines = [
        r"\begin{table}[t]",
        r"\centering",
        r"\caption{Proof Overhead: Spec vs Proof Constructs}",
        r"\label{tab:proof}",
        r"\begin{tabular}{lrrrr}",
        r"\toprule",
        r"Component & Spec LOC & Proof LOC & Total & Proof/Spec \\",
        r"\midrule",
    ]

    # Kernels row
    kernel_total = kernel_spec + kernel_proof
    if kernel_spec > 0:
        kernel_ratio = kernel_proof / kernel_spec
        lines.append(f"Kernels & {kernel_spec:,} & {kernel_proof:,} & {kernel_total:,} & {kernel_ratio:.2f} \\\\")
    else:
        lines.append(f"Kernels & {kernel_spec:,} & {kernel_proof:,} & {kernel_total:,} & --- \\\\")

    lines.append(r"\midrule")

    for name, app in sorted(apps.items()):
        total = app.dafny_spec + app.dafny_proof
        if app.dafny_spec > 0:
            ratio = app.dafny_proof / app.dafny_spec
            lines.append(f"{name} & {app.dafny_spec:,} & {app.dafny_proof:,} & {total:,} & {ratio:.2f} \\\\")
        else:
            lines.append(f"{name} & {app.dafny_spec:,} & {app.dafny_proof:,} & {total:,} & --- \\\\")

    lines.extend([
        r"\bottomrule",
        r"\end{tabular}",
        r"\end{table}",
    ])

    return "\n".join(lines)


def generate_timing_table(apps: Dict[str, AppMetrics], kernel_time: float) -> str:
    """Generate LaTeX table for verification time."""
    lines = [
        r"\begin{table}[t]",
        r"\centering",
        r"\caption{Verification Time}",
        r"\label{tab:timing}",
        r"\begin{tabular}{lr}",
        r"\toprule",
        r"Component & Time (s) \\",
        r"\midrule",
        f"Kernels & {kernel_time:.1f} \\\\",
        r"\midrule",
    ]

    for name, app in sorted(apps.items()):
        lines.append(f"{name} & {app.verify_time:.1f} \\\\")

    # Total
    total_time = kernel_time + sum(app.verify_time for app in apps.values())
    lines.extend([
        r"\midrule",
        f"\\textbf{{Total}} & \\textbf{{{total_time:.1f}}} \\\\",
        r"\bottomrule",
        r"\end{tabular}",
        r"\end{table}",
    ])

    return "\n".join(lines)


def generate_kernel_matrix(apps: Dict[str, AppMetrics]) -> str:
    """Generate LaTeX table for kernel usage matrix."""
    lines = [
        r"\begin{table}[t]",
        r"\centering",
        r"\caption{Kernel Usage by Application}",
        r"\label{tab:kernels}",
        r"\begin{tabular}{l" + "c" * len(ALL_KERNELS) + "}",
        r"\toprule",
        "Application & " + " & ".join(ALL_KERNELS) + r" \\",
        r"\midrule",
    ]

    for name, app in sorted(apps.items()):
        row = [name]
        for kernel in ALL_KERNELS:
            if kernel in app.kernels_used:
                row.append(r"\checkmark")
            else:
                row.append("")
        lines.append(" & ".join(row) + r" \\")

    lines.extend([
        r"\bottomrule",
        r"\end{tabular}",
        r"\end{table}",
    ])

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Collect metrics from dafny-replay")
    parser.add_argument("--skip-verify", action="store_true",
                        help="Skip running dafny verify (faster, but no timing data)")
    args = parser.parse_args()

    print("Collecting metrics from dafny-replay...")
    print(f"Repository root: {REPO_ROOT}")
    print(f"Paper directory: {PAPER_DIR}")
    if args.skip_verify:
        print("Skipping verification timing (--skip-verify)")
    print()

    # Collect kernel metrics
    print("Analyzing kernels...")
    kernel_total, kernel_spec, kernel_proof, _kernel_files, kernel_time = collect_kernel_metrics(
        skip_verify=args.skip_verify
    )
    print(f"  Total: {kernel_total} lines ({kernel_spec} spec, {kernel_proof} proof)")
    if not args.skip_verify:
        print(f"  Verification time: {kernel_time:.1f}s")
    print()

    # Collect app metrics
    apps = {}
    for name, (directory, kernels) in APPS.items():
        print(f"Analyzing {name}...")
        app = collect_app_metrics(name, directory, kernels, skip_verify=args.skip_verify)
        apps[name] = app
        print(f"  Dafny: {app.dafny_total} lines ({app.dafny_spec} spec, {app.dafny_proof} proof)")
        print(f"  Integration: {app.js_handwritten} lines, Generated JS: {app.js_generated} lines")
        if not args.skip_verify:
            print(f"  Verification time: {app.verify_time:.1f}s")
    print()

    # Generate tables
    print("Generating LaTeX tables...")

    tables = {
        "metrics-loc.tex": generate_loc_table(apps, kernel_total),
        "metrics-reuse.tex": generate_kernel_reuse_table(apps),
        "metrics-proof.tex": generate_proof_overhead_table(apps, kernel_spec, kernel_proof),
        "metrics-kernels.tex": generate_kernel_matrix(apps),
    }

    # Only generate timing table if we actually ran verification
    if not args.skip_verify:
        tables["metrics-timing.tex"] = generate_timing_table(apps, kernel_time)

    for filename, content in tables.items():
        output_path = PAPER_DIR / filename
        with open(output_path, 'w') as f:
            f.write(content)
        print(f"  Written: {output_path}")

    if args.skip_verify:
        timing_path = PAPER_DIR / "metrics-timing.tex"
        if timing_path.exists():
            print(f"  Skipped: {timing_path} (use without --skip-verify to update)")
        else:
            print(f"  Skipped: {timing_path} (run without --skip-verify to generate)")

    print()
    print("Done! Tables written to paper directory.")
    print("Add \\input{metrics-*.tex} to paper.tex to include them.")


if __name__ == "__main__":
    main()
