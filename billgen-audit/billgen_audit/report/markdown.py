"""Phase 7 — the human report, in the §15 format.

Two rules the layout enforces rather than requests:

* every finding prints its confidence next to its severity. §4 separates them
  and a report that shows only severity re-merges them in the reader's head.
* the "not assessed" section is above the findings, not in an appendix. A
  reader who skips it will read nine domain scores as coverage.
"""

from __future__ import annotations

from ..correlation import Cluster
from ..findings import Finding, Severity
from ..orchestrator import Audit

_BAR = 28


def render(audit: Audit) -> str:
    lines: list[str] = []
    add = lines.append
    intake = audit.observations.get("intake", {})

    add(f"# BillGen Professional Audit — {audit.audit_id}")
    add("")
    add(f"**Overall risk: {audit.overall}**")
    add("")
    add(f"- Target: `{intake.get('target_name')}` at `{intake.get('commit', '?')}`"
        f"{' (working tree dirty)' if intake.get('dirty') else ''}")
    add(f"- Branch: `{intake.get('branch')}`")
    add(f"- Run: {audit.started} → {audit.finished}")
    add(f"- Findings: {len(audit.findings)}")
    add("")

    # -- scorecard ------------------------------------------------------
    add("## Scorecard")
    add("")
    add("| Domain | Score | Findings |")
    add("|---|---|---|")
    for s in audit.scores:
        bar = "—" if s.score is None else "█" * round(s.score / 100 * 10)
        add(f"| {s.domain} | {s.display} {bar} | {s.findings} |")
    add("")
    for s in audit.scores:
        if s.score is None and s.reason:
            add(f"> **{s.domain} — n/a.** {s.reason}")
            add("")

    # -- what was not looked at -----------------------------------------
    if audit.not_assessed:
        add("## Not assessed")
        add("")
        add("Absence of evidence is not evidence of compliance (§1). Nothing below "
            "was checked, and none of it is scored as passing.")
        add("")
        for item in audit.not_assessed:
            add(f"- {item}")
        add("")

    # -- systemic -------------------------------------------------------
    systemic = [f for f in audit.findings if f.agent == "orchestrator"]
    if systemic:
        add("## Systemic findings (§9)")
        add("")
        for f in systemic:
            add(f"### [{f.id}] {f.title}")
            add("")
            add(f"**{f.severity.value}** · confidence {f.confidence:.2f}")
            add("")
            add("```")
            add(f.evidence)
            add("```")
            add("")
            add(f"{f.impact}")
            add("")
            add(f"*Recommendation:* {f.recommendation}")
            add("")

    # -- findings by severity -------------------------------------------
    add("## Findings")
    add("")
    ordinary = [f for f in audit.findings if f.agent != "orchestrator"]
    if not ordinary:
        add("_No deterministic finding was raised. Read the 'Not assessed' "
            "section before treating that as a clean result._")
        add("")
    for severity in Severity:
        bucket = [f for f in ordinary if f.severity is severity]
        if not bucket:
            continue
        add(f"### {severity.value} ({len(bucket)})")
        add("")
        for f in sorted(bucket, key=lambda f: -f.confidence):
            add(_finding(f))
        add("")

    # -- roadmap --------------------------------------------------------
    add("## Roadmap (§15)")
    add("")
    plan = audit.roadmap
    captions = {
        "P0": "must fix — high-confidence critical",
        "P1": "before professional launch",
        "P2": "premium / scale improvements",
    }
    for tier, items in plan.items():
        add(f"**{tier} — {captions[tier]}** ({len(items)})")
        add("")
        if not items:
            add("- _nothing in this tier_")
        for f in items[:12]:
            add(f"- `{f.id}` {f.title} — {f.severity.value}, confidence {f.confidence:.2f}")
        if len(items) > 12:
            add(f"- _…and {len(items) - 12} more_")
        add("")

    add("---")
    add("")
    add("Machine-readable findings: `findings.json`. Evidence: `evidence/`. "
        "Re-run to produce a diff against this audit as a baseline.")
    return "\n".join(lines)


def _finding(f: Finding) -> str:
    parts = [
        f"#### `{f.id}` {f.title}",
        "",
        f"- **Severity** {f.severity.value} · **Confidence** {f.confidence:.2f} "
        f"· **Type** {f.requirement_type.value} · **Agent** {f.agent}",
        f"- **Location** `{f.location}`",
        "",
        f"**Evidence.** {f.evidence}",
        "",
        f"**Impact.** {f.impact}",
        "",
        f"**Recommendation.** {f.recommendation}",
    ]
    if f.verification_test:
        parts += ["", f"**Verify.** {f.verification_test}"]
    if f.references:
        parts += ["", "**Sources.** " + " · ".join(f.references)]
    parts.append("")
    return "\n".join(parts)


def render_clusters(clusters: list[Cluster]) -> str:
    out = []
    for c in clusters:
        out.append(f"{c.theme}: {len(c.members)} findings from {sorted(c.agents)}")
    return "\n".join(out)
