"""The common finding schema (spec §4).

Every scanner and every specialist agent emits this shape and nothing else.
That is the whole reason cross-agent correlation (§9) is possible: four
reviewers describing one systemic failure produce four records that can be
matched on `location` and `category` rather than on prose.

Two fields carry most of the spec's intent and are worth reading twice:

`confidence` is **separate from severity** (§4). A CRITICAL finding backed by a
regex match over one file is not proven, and the report must not present it as
though it were. Severity says how bad it would be; confidence says how sure we
are that it is real.

`requirement_type` is the boundary the spec puts in bold in §0: a statutory
requirement and an engineering preference must never be rendered the same way.
A scanner that cannot tell the difference must say `ASSUMPTION`.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from enum import Enum


class Severity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFORMATIONAL = "INFORMATIONAL"

    @property
    def rank(self) -> int:
        return _SEVERITY_RANK[self]


_SEVERITY_RANK = {
    Severity.CRITICAL: 0,
    Severity.HIGH: 1,
    Severity.MEDIUM: 2,
    Severity.LOW: 3,
    Severity.INFORMATIONAL: 4,
}


class RequirementType(str, Enum):
    """§0's boundary. `LEGAL` and `ACCOUNTING` claims must carry a source."""

    LEGAL = "legal_requirement"
    ACCOUNTING = "accounting_requirement"
    SECURITY = "security_best_practice"
    PRODUCT = "product_choice"
    RECOMMENDATION = "recommendation"
    ASSUMPTION = "assumption"


class Status(str, Enum):
    OPEN = "OPEN"
    VERIFIED = "VERIFIED"      # re-checked after a fix, evidence confirms it
    RESOLVED = "RESOLVED"
    REGRESSED = "REGRESSED"    # was RESOLVED in the baseline, is back
    ACCEPTED = "ACCEPTED"      # a human decided to live with it


@dataclass(frozen=True)
class Location:
    file: str | None = None
    line: int | None = None

    def __str__(self) -> str:
        if self.file is None:
            return "(no single location)"
        return f"{self.file}:{self.line}" if self.line else self.file


@dataclass
class Finding:
    id: str
    agent: str
    severity: Severity
    category: str
    title: str
    evidence: str
    impact: str
    recommendation: str
    requirement_type: RequirementType = RequirementType.RECOMMENDATION
    location: Location = field(default_factory=Location)
    confidence: float = 0.7
    status: Status = Status.OPEN
    verification_test: str = ""
    references: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        if not 0.0 <= self.confidence <= 1.0:
            raise ValueError(f"{self.id}: confidence must be 0..1, got {self.confidence}")
        # §17: a legal conclusion without an authoritative source is exactly the
        # "hallucinated compliance" the spec forbids in §1. Refuse it at
        # construction rather than letting it reach a report.
        if self.requirement_type is RequirementType.LEGAL and not self.references:
            raise ValueError(
                f"{self.id}: a legal_requirement finding must cite a source "
                f"(spec §1 'no hallucinated compliance', §17 source registry)"
            )

    @property
    def fingerprint(self) -> str:
        """Identity across audits, for the baseline diff (§14).

        Deliberately excludes the line number: a finding that moved because
        code above it grew is the *same* finding, and a diff that reports it as
        resolved-and-new is a diff nobody will read twice.
        """
        return f"{self.agent}|{self.category}|{self.location.file}|{self.title}"

    def to_dict(self) -> dict:
        d = asdict(self)
        d["severity"] = self.severity.value
        d["requirement_type"] = self.requirement_type.value
        d["status"] = self.status.value
        d["fingerprint"] = self.fingerprint
        return d


def dump_findings(findings: list[Finding]) -> str:
    ordered = sorted(findings, key=lambda f: (f.severity.rank, f.agent, f.id))
    return json.dumps([f.to_dict() for f in ordered], indent=2, ensure_ascii=False)


def load_findings(raw: str) -> list[dict]:
    """Baselines are read as plain dicts. An old audit was written by an older
    schema, and rehydrating it into today's dataclass would fail on exactly the
    audits worth comparing against."""
    return json.loads(raw)
