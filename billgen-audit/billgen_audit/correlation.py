"""Phase 5 — cross-agent correlation (spec §9).

The specification's worked example is the whole idea: legal says a finalized
invoice must not be silently altered, accounting says issued invoices are
editable, architecture says PUT /invoice/:id permits it, and GDPR says nothing
records who changed it. Four findings, one systemic failure — and the systemic
one is more severe than any of its parts, because each part alone looks like a
manageable defect.

Correlation here is deliberately conservative. It groups on evidence that two
findings describe the same mechanism, never on topic similarity: a heuristic
that merges findings because both mention "invoice" produces a cluster nobody
can act on and hides the individual findings that were actionable.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .findings import Finding, Location, RequirementType, Severity

#  Categories that describe one mechanism from different professional angles.
#  Two findings in the same theme, raised by different agents, are the signal
#  §9 is looking for.
THEMES: dict[str, tuple[str, ...]] = {
    "document_integrity": (
        "document_integrity",
        "document_numbering",
        "auditability",
        "financial_correctness",
    ),
    "tenant_isolation": ("tenant_isolation", "authorization", "authentication"),
    "e_invoicing": ("e_invoicing_transmission", "structured_b2b_e_invoicing", "document_engine"),
    "data_lifecycle": ("data_subject_rights", "record_retention", "disaster_recovery"),
}

THEME_TITLES = {
    "document_integrity": "Document integrity and auditability",
    "tenant_isolation": "Access control across tenants",
    "e_invoicing": "Structured e-invoicing end to end",
    "data_lifecycle": "Data lifecycle — retention, erasure and recovery",
}


@dataclass
class Cluster:
    theme: str
    members: list[Finding] = field(default_factory=list)

    @property
    def agents(self) -> set[str]:
        return {f.agent for f in self.members}


def correlate(findings: list[Finding]) -> tuple[list[Finding], list[Cluster]]:
    """Return (systemic findings, clusters).

    Member findings are *not* removed. §9 merges findings into a systemic
    conclusion, but the individual evidence is what makes the systemic
    conclusion checkable, and a report that shows only the synthesis cannot be
    verified by the engineer who has to fix it.
    """
    #  INFORMATIONAL findings are open questions, not defects -- the legal
    #  scanner's "needs confirmation" entries are the main source of them. Left
    #  in, they inflate the agent count until an unanswered question becomes a
    #  systemic failure, and they drag the cluster's confidence down to their
    #  own 0.2, which then reads as a CRITICAL nobody believes. A question does
    #  not corroborate a defect.
    substantive = [f for f in findings if f.severity is not Severity.INFORMATIONAL]

    clusters: list[Cluster] = []
    for theme, categories in THEMES.items():
        members = [f for f in substantive if f.category in categories]
        if members:
            clusters.append(Cluster(theme=theme, members=members))

    systemic: list[Finding] = []
    for cluster in clusters:
        #  One agent noticing one thing is a finding, not a systemic issue.
        #  Two independent professional views of the same mechanism is the bar.
        if len(cluster.agents) < 2:
            continue

        worst = min(cluster.members, key=lambda f: f.severity.rank).severity
        escalated = _escalate(worst)
        by_agent = ", ".join(sorted(cluster.agents))

        systemic.append(
            Finding(
                id=f"SYS-{cluster.theme.upper().replace('_', '-')}",
                agent="orchestrator",
                severity=escalated,
                category=f"systemic:{cluster.theme}",
                title=(
                    f"{THEME_TITLES[cluster.theme]} — {len(cluster.members)} findings "
                    f"from {len(cluster.agents)} agents describe one mechanism"
                ),
                location=Location(),
                evidence=(
                    f"Raised independently by {by_agent}:\n"
                    + "\n".join(
                        f"  - [{f.id}] {f.title} ({f.severity.value})"
                        for f in cluster.members
                    )
                ),
                impact=(
                    "Each finding is individually survivable; together they describe "
                    "a mechanism with no compensating control. §9: the correlated "
                    "severity is higher than any single part, because a fix to one "
                    "part leaves the failure mode intact."
                ),
                requirement_type=RequirementType.RECOMMENDATION,
                recommendation=(
                    "Treat as one piece of work with one owner. Fixing these "
                    "separately across agents' recommendations tends to produce "
                    "partial coverage that reads as done."
                ),
                #  The confidence of a synthesis cannot exceed the confidence of
                #  the evidence it rests on.
                confidence=round(min(f.confidence for f in cluster.members), 2),
                verification_test=(
                    "Re-run the audit; the systemic finding clears only when every "
                    "member finding clears."
                ),
            )
        )
    return systemic, clusters


def _escalate(severity: Severity) -> Severity:
    order = [
        Severity.INFORMATIONAL, Severity.LOW, Severity.MEDIUM,
        Severity.HIGH, Severity.CRITICAL,
    ]
    idx = order.index(severity)
    return order[min(idx + 1, len(order) - 1)]
