"""The command surface.

    python -m billgen_audit run              audit the target, write the reports
    python -m billgen_audit run --open       ...and open the HTML report
    python -m billgen_audit list             every audit held, newest last
    python -m billgen_audit show <id>        one audit's summary in the terminal
    python -m billgen_audit diff <a> <b>     baseline comparison (§14)
    python -m billgen_audit evidence <id>    what was collected, for the agents

`run` is deliberately read-only against the target. Nothing in the deterministic
layer writes to, starts, or connects to the audited system; the only writes are
into `audits/`. That is what makes it safe to bind to a slash command.
"""

from __future__ import annotations

import argparse
import json
import sys
import webbrowser

from .config import AuditConfig
from .findings import Severity
from .orchestrator import Audit, run_audit
from .report import diff as diffmod
from .report import html as htmlreport
from .report import markdown as mdreport


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="billgen-audit",
        description="Evidence-driven audit engine for BillGen (and its architecture document).",
    )
    parser.add_argument("--target", help="repository to audit (default: the parent repo)")
    parser.add_argument("--audits-dir", help="where audits are stored")
    sub = parser.add_subparsers(dest="command", required=True)

    run_cmd = sub.add_parser("run", help="run a full audit")
    run_cmd.add_argument("--open", action="store_true", help="open the HTML report when done")
    run_cmd.add_argument(
        "--authorize-dynamic",
        action="store_true",
        help=(
            "permit phase 4 dynamic testing (§8.6). Off by default: these tests "
            "load and mutate a running system."
        ),
    )
    run_cmd.add_argument("--no-diff", action="store_true", help="skip the baseline comparison")

    sub.add_parser("list", help="list stored audits")
    show = sub.add_parser("show", help="print one audit's summary")
    show.add_argument("audit_id")
    ev = sub.add_parser("evidence", help="list an audit's evidence artifacts")
    ev.add_argument("audit_id")
    d = sub.add_parser("diff", help="compare two audits")
    d.add_argument("baseline")
    d.add_argument("current")

    args = parser.parse_args(argv)
    config = AuditConfig.load(args.target, args.audits_dir)

    if args.command == "run":
        config.authorize_dynamic = args.authorize_dynamic
        return _run(config, open_report=args.open, want_diff=not args.no_diff)
    if args.command == "list":
        return _list(config)
    if args.command == "show":
        return _show(config, args.audit_id)
    if args.command == "evidence":
        return _evidence(config, args.audit_id)
    if args.command == "diff":
        return _diff(config, args.baseline, args.current)
    return 2


# ----------------------------------------------------------------------


def _run(config: AuditConfig, *, open_report: bool, want_diff: bool) -> int:
    print(f"Auditing {config.target}")
    if config.architecture_doc:
        print(f"Architecture document: {config.rel(config.architecture_doc)}")
    else:
        print("Architecture document: not found — drift check will be skipped")
    print()

    audit = run_audit(config)

    (audit.directory / "report.md").write_text(mdreport.render(audit), encoding="utf-8")
    html_path = audit.directory / "report.html"
    html_path.write_text(htmlreport.render(audit), encoding="utf-8")

    _print_summary(audit)

    if want_diff:
        previous = diffmod.previous_audit_id(config.audits_dir, audit.audit_id)
        if previous:
            baseline = diffmod.load_baseline(config.audits_dir, previous)
            comparison = diffmod.compare(baseline, audit.findings, previous, audit.audit_id)
            (audit.directory / "diff.md").write_text(
                diffmod.render(comparison), encoding="utf-8"
            )
            print()
            print(f"  Baseline: {comparison.summary()}")
            if comparison.regressed:
                print(f"  REGRESSED: {len(comparison.regressed)} finding(s) came back")
        else:
            print()
            print("  No earlier audit to compare against — this one is the baseline.")

    print()
    print(f"  Reports  {audit.directory / 'report.md'}")
    print(f"           {html_path}")
    print(f"  Findings {audit.directory / 'findings.json'}")
    print(f"  Evidence {audit.directory / 'evidence'}")

    if open_report:
        webbrowser.open(html_path.as_uri())

    #  Exit code carries the verdict so a pipeline can gate on it. A
    #  high-confidence CRITICAL fails the run; everything else passes.
    critical = [
        f for f in audit.findings
        if f.severity is Severity.CRITICAL and f.confidence >= 0.6
    ]
    return 1 if critical else 0


def _print_summary(audit: Audit) -> None:
    print(f"  {audit.audit_id} — overall risk {audit.overall}")
    print()
    for s in audit.scores:
        label = s.domain.ljust(20)
        if s.score is None:
            print(f"    {label} n/a   (not assessed)")
        else:
            bar = "#" * round(s.score / 10)
            print(f"    {label} {str(s.score).rjust(3)}/100 {bar}")
    print()
    counts = {sev: 0 for sev in Severity}
    for f in audit.findings:
        counts[f.severity] += 1
    print("    " + "  ".join(
        f"{sev.value}: {counts[sev]}" for sev in Severity if counts[sev]
    ) or "    no findings")
    if audit.not_assessed:
        print()
        print(f"    {len(audit.not_assessed)} area(s) not assessed — see the report")


def _list(config: AuditConfig) -> int:
    audits = sorted(p for p in config.audits_dir.glob("audit-*") if p.is_dir())
    if not audits:
        print("No audits yet. Run: python -m billgen_audit run")
        return 0
    for path in audits:
        meta_path = path / "audit.json"
        if not meta_path.exists():
            print(f"{path.name}  (incomplete)")
            continue
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        findings = len(json.loads((path / "findings.json").read_text(encoding="utf-8")))
        commit = (meta.get("intake", {}).get("commit") or "?")[:8]
        print(f"{path.name}  {meta['overall']:<6} {findings:>3} findings  "
              f"{meta['finished']}  {commit}")
    return 0


def _show(config: AuditConfig, audit_id: str) -> int:
    path = config.audits_dir / audit_id / "report.md"
    if not path.exists():
        print(f"No report for {audit_id}", file=sys.stderr)
        return 1
    print(path.read_text(encoding="utf-8"))
    return 0


def _evidence(config: AuditConfig, audit_id: str) -> int:
    directory = config.audits_dir / audit_id / "evidence"
    if not directory.exists():
        print(f"No evidence for {audit_id}", file=sys.stderr)
        return 1
    for item in sorted(directory.iterdir()):
        print(f"{item.stat().st_size:>9,}  {item.name}")
    return 0


def _diff(config: AuditConfig, baseline_id: str, current_id: str) -> int:
    baseline = diffmod.load_baseline(config.audits_dir, baseline_id)
    current_raw = diffmod.load_baseline(config.audits_dir, current_id)
    if not current_raw:
        print(f"No findings for {current_id}", file=sys.stderr)
        return 1

    #  `compare` wants Finding objects for the current side so the diff can
    #  print severity and confidence. Rehydrating a stored audit into the live
    #  dataclass would fail on any schema change, which is why only the shape
    #  the diff actually reads is reconstructed.
    class _Shim:
        def __init__(self, d: dict) -> None:
            self.id = d["id"]
            self.title = d["title"]
            self.fingerprint = d["fingerprint"]
            self.confidence = d.get("confidence", 0.0)
            self.severity = type("S", (), {"value": d["severity"]})()

    shims = [_Shim(d) for d in current_raw]
    comparison = diffmod.compare(baseline, shims, baseline_id, current_id)  # type: ignore[arg-type]
    print(diffmod.render(comparison))
    return 0
