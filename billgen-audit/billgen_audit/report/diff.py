"""§14 — the audit-to-audit diff: resolved, open, new and regressed.

This is what makes the system continuous rather than one-shot (§1). The
comparison is on `Finding.fingerprint`, which excludes the line number on
purpose: a finding that moved down a file because an import was added is the
same finding, and a diff that reports it as resolved-and-new teaches the reader
to ignore the diff.

`REGRESSED` is the category that earns the feature. A finding that was resolved
in an earlier audit and is present again is worse news than a new one — it means
the fix did not hold, or was reverted, and nothing noticed.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

from ..findings import Finding


@dataclass
class Diff:
    baseline_id: str
    current_id: str
    new: list[Finding] = field(default_factory=list)
    still_open: list[Finding] = field(default_factory=list)
    regressed: list[Finding] = field(default_factory=list)
    resolved: list[dict] = field(default_factory=list)

    def summary(self) -> str:
        return (
            f"{self.current_id} vs {self.baseline_id}: "
            f"{len(self.new)} new, {len(self.still_open)} still open, "
            f"{len(self.regressed)} regressed, {len(self.resolved)} resolved"
        )


def load_baseline(audits_dir: Path, audit_id: str) -> list[dict]:
    path = audits_dir / audit_id / "findings.json"
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def previous_audit_id(audits_dir: Path, current: str) -> str | None:
    ids = sorted(
        p.name
        for p in audits_dir.glob("audit-*")
        if p.is_dir() and (p / "findings.json").exists() and p.name != current
    )
    return ids[-1] if ids else None


def compare(
    baseline: list[dict], current: list[Finding], baseline_id: str, current_id: str
) -> Diff:
    diff = Diff(baseline_id=baseline_id, current_id=current_id)
    by_fp = {b["fingerprint"]: b for b in baseline}
    seen = set()

    for finding in current:
        fp = finding.fingerprint
        seen.add(fp)
        prior = by_fp.get(fp)
        if prior is None:
            diff.new.append(finding)
        elif prior.get("status") in ("RESOLVED", "VERIFIED"):
            diff.regressed.append(finding)
        else:
            diff.still_open.append(finding)

    for fp, prior in by_fp.items():
        if fp not in seen and prior.get("status") not in ("RESOLVED", "VERIFIED"):
            diff.resolved.append(prior)
    return diff


def render(diff: Diff) -> str:
    lines = [f"# Audit diff — {diff.current_id} against {diff.baseline_id}", "", diff.summary(), ""]

    def section(title: str, items: list, fmt) -> None:
        lines.append(f"## {title} ({len(items)})")
        lines.append("")
        if not items:
            lines.append("_none_")
        for item in items:
            lines.append(fmt(item))
        lines.append("")

    section(
        "Regressed — resolved before, present again",
        diff.regressed,
        lambda f: f"- `{f.id}` {f.title} ({f.severity.value}, confidence {f.confidence:.2f})",
    )
    section("New", diff.new, lambda f: f"- `{f.id}` {f.title} ({f.severity.value})")
    section("Resolved", diff.resolved, lambda d: f"- `{d['id']}` {d['title']} ({d['severity']})")
    section("Still open", diff.still_open, lambda f: f"- `{f.id}` {f.title} ({f.severity.value})")
    return "\n".join(lines)
