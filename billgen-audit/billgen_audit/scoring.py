"""Phase 6 — risk scoring and the §15 scorecard.

The specification's report format opens with nine domain scores out of 100 and
an overall RED/AMBER/GREEN. That shape is useful and also the easiest place in
the whole system to lie, so two properties are built in:

1. **A domain with no assessment does not score.** It reports `n/a`, not 100.
   §1: absence of evidence is not evidence of compliance, and a green score for
   an area nobody looked at is the exact failure that sentence forbids.

2. **Confidence discounts the penalty.** A CRITICAL at 0.35 confidence should
   not crater a score the way a CRITICAL at 0.95 does, because one of them is a
   lead and the other is a fact.
"""

from __future__ import annotations

from dataclasses import dataclass

from .findings import Finding, Severity

#  What one finding costs its domain at full confidence.
_PENALTY = {
    Severity.CRITICAL: 40,
    Severity.HIGH: 18,
    Severity.MEDIUM: 7,
    Severity.LOW: 2,
    Severity.INFORMATIONAL: 0,
}

#  §15's nine domains, mapped to the categories that feed each.
DOMAINS: dict[str, tuple[str, ...]] = {
    "Legal/VAT": ("invoice_mandatory_mentions", "sequential_numbering", "credit_note_linkage",
                  "vat_number_validation", "record_retention", "rule_currency", "vat"),
    "Accounting": ("document_numbering", "document_integrity", "financial_correctness",
                   "auditability"),
    "GDPR": ("documentation", "data_subject_rights", "data_minimisation", "consent"),
    "Architecture": ("documentation_drift", "dependency_management", "observability"),
    "Security": ("authentication", "authorization", "tenant_isolation", "secrets"),
    "Document Engine": ("document_engine",),
    "Peppol Readiness": ("e_invoicing_transmission", "structured_b2b_e_invoicing",
                         "peppol_participant_identifier"),
    "Performance": (),
    "Resilience": ("disaster_recovery",),
}


@dataclass
class DomainScore:
    domain: str
    score: int | None          # None == not assessed
    findings: int
    reason: str = ""

    @property
    def display(self) -> str:
        return "n/a" if self.score is None else f"{self.score}/100"


def score(findings: list[Finding], not_assessed: list[str]) -> tuple[list[DomainScore], str]:
    unassessed_blob = " ".join(not_assessed).lower()
    scores: list[DomainScore] = []

    for domain, categories in DOMAINS.items():
        relevant = [f for f in findings if f.category in categories]

        if not categories:
            scores.append(
                DomainScore(
                    domain, None, 0,
                    "No deterministic scanner covers this domain. Spec §8.6 requires "
                    "an authorized environment and a load generator; running one is a "
                    "human decision, so this scores n/a rather than 100.",
                )
            )
            continue

        #  A domain whose scanner said it could not look does not get a number.
        #
        #  The test is on *substantive* findings, not on any findings at all. A
        #  domain can be simultaneously unassessed and full of INFORMATIONAL
        #  "needs confirmation" entries -- that is precisely what the legal
        #  scanner produces -- and those carry a penalty of zero, so scoring the
        #  domain would print 100/100 for an area nobody has read. That number
        #  is worse than no number.
        substantive = [f for f in relevant if f.severity is not Severity.INFORMATIONAL]
        if _domain_unassessed(domain, unassessed_blob) and not substantive:
            scores.append(
                DomainScore(
                    domain,
                    None,
                    len(relevant),
                    "The scanner reported it could not reach a conclusion here. "
                    "Any findings listed are items to confirm, not defects found.",
                )
            )
            continue

        penalty = sum(_PENALTY[f.severity] * f.confidence for f in relevant)
        scores.append(DomainScore(domain, max(0, round(100 - penalty)), len(relevant)))

    return scores, _overall(findings, scores)


def _domain_unassessed(domain: str, blob: str) -> bool:
    keys = {
        "Legal/VAT": ("belgian vat", "rule registry"),
        "Peppol Readiness": ("e-invoicing", "structured e-invoicing"),
        "Document Engine": ("document engine",),
        "Resilience": ("restore", "backup"),
        "Architecture": ("architecture document",),
    }.get(domain, ())
    return any(k in blob for k in keys)


def _overall(findings: list[Finding], scores: list[DomainScore]) -> str:
    """RED / AMBER / GREEN.

    Driven by findings rather than by the average, because a mean over nine
    domains dilutes a single CRITICAL into a comfortable amber.
    """
    confident = [f for f in findings if f.confidence >= 0.6]
    if any(f.severity is Severity.CRITICAL for f in confident):
        return "RED"
    if sum(1 for f in confident if f.severity is Severity.HIGH) >= 3:
        return "RED"
    if any(f.severity is Severity.HIGH for f in confident):
        return "AMBER"
    numeric = [s.score for s in scores if s.score is not None]
    if numeric and min(numeric) < 70:
        return "AMBER"
    #  Never GREEN while whole domains are unassessed.
    if any(s.score is None for s in scores):
        return "AMBER"
    return "GREEN"


def roadmap(findings: list[Finding]) -> dict[str, list[Finding]]:
    """§15's P0/P1/P2. Confidence gates promotion: a low-confidence CRITICAL is
    something to *verify* first, and that verification is the P0, not the fix."""
    out: dict[str, list[Finding]] = {"P0": [], "P1": [], "P2": []}
    for f in sorted(findings, key=lambda f: (f.severity.rank, -f.confidence)):
        if f.severity is Severity.CRITICAL and f.confidence >= 0.6:
            out["P0"].append(f)
        elif f.severity in (Severity.CRITICAL, Severity.HIGH):
            out["P1"].append(f)
        else:
            out["P2"].append(f)
    return out
