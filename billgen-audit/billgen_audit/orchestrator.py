"""The Audit Orchestrator — phases 0 to 8 (spec §3, §18).

Each phase produces artifacts the later phases consume, and the ordering is not
cosmetic: the enforcement model (phase 1) decides which route findings are even
legitimate, and the route inventory decides what the architecture document is
compared against. Running a scanner out of order silently changes its verdict,
so the phase number lives on the scanner class rather than in a list here.
"""

from __future__ import annotations

import json
import platform
import subprocess
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path

from .config import AuditConfig
from .correlation import Cluster, correlate
from .evidence import EvidenceStore
from .findings import Finding, dump_findings
from .scanners.accounting import AccountingScanner, DocumentEngineScanner
from .scanners.architecture_doc import ArchitectureDocScanner
from .scanners.discovery import DiscoveryScanner
from .scanners.enforcement import EnforcementScanner
from .scanners.legal import EInvoicingScanner, LegalScanner
from .scanners.operations import (
    DependencyScanner,
    ObservabilityScanner,
    ResilienceScanner,
)
from .scanners.privacy import PrivacyScanner, SecretsScanner
from .scanners.routes import RouteScanner
from .scoring import DomainScore, roadmap, score

SCANNERS = (
    DiscoveryScanner,
    EnforcementScanner,
    RouteScanner,
    AccountingScanner,
    DocumentEngineScanner,
    LegalScanner,
    EInvoicingScanner,
    PrivacyScanner,
    SecretsScanner,
    DependencyScanner,
    ResilienceScanner,
    ObservabilityScanner,
    ArchitectureDocScanner,   # phase 5: needs the route inventory
)


@dataclass
class Audit:
    audit_id: str
    directory: Path
    config: AuditConfig
    findings: list[Finding] = field(default_factory=list)
    observations: dict = field(default_factory=dict)
    not_assessed: list[str] = field(default_factory=list)
    clusters: list[Cluster] = field(default_factory=list)
    scores: list[DomainScore] = field(default_factory=list)
    overall: str = "UNKNOWN"
    started: str = ""
    finished: str = ""

    @property
    def roadmap(self) -> dict[str, list[Finding]]:
        return roadmap(self.findings)


def next_audit_id(audits_dir: Path) -> str:
    audits_dir.mkdir(parents=True, exist_ok=True)
    existing = [
        int(p.name.split("-")[1])
        for p in audits_dir.glob("audit-*")
        if p.is_dir() and p.name.split("-")[-1].isdigit()
    ]
    return f"audit-{max(existing, default=0) + 1:03d}"


def run_audit(config: AuditConfig, audit_id: str | None = None) -> Audit:
    audit_id = audit_id or next_audit_id(config.audits_dir)
    directory = config.audits_dir / audit_id
    directory.mkdir(parents=True, exist_ok=True)

    evidence = EvidenceStore(directory / "evidence")
    audit = Audit(
        audit_id=audit_id,
        directory=directory,
        config=config,
        started=datetime.now(UTC).isoformat(timespec="seconds"),
    )

    # -- Phase 0: intake ------------------------------------------------
    intake = {
        "target": str(config.target),
        "target_name": config.target.name,
        "commit": _git(config.target, "rev-parse", "HEAD"),
        "branch": _git(config.target, "rev-parse", "--abbrev-ref", "HEAD"),
        "dirty": bool(_git(config.target, "status", "--porcelain")),
        "architecture_doc": (
            config.rel(config.architecture_doc) if config.architecture_doc else None
        ),
        "engine_platform": platform.platform(),
        "dynamic_testing_authorized": config.authorize_dynamic,
    }
    evidence.record("intake", intake)
    audit.observations["intake"] = intake

    # -- Phases 1-5: scanners in phase order ----------------------------
    prior: dict = {}
    for cls in sorted(SCANNERS, key=lambda c: c.phase):
        scanner = cls(config, evidence)
        try:
            result = scanner.run(prior)
        except Exception as exc:  # noqa: BLE001
            #  One scanner raising must not lose the other twelve. The failure
            #  becomes an unassessed area, which is the honest outcome: that
            #  part of the audit did not happen.
            audit.not_assessed.append(
                f"{scanner.name}: the scanner failed ({type(exc).__name__}: {exc}). "
                f"Everything it covers is unassessed in this audit."
            )
            continue
        audit.findings.extend(result.findings)
        audit.not_assessed.extend(result.not_assessed)
        audit.observations.update(result.observations)
        prior.update(result.observations)

    # -- Phase 4: dynamic testing ---------------------------------------
    if not config.authorize_dynamic:
        audit.not_assessed.append(
            "Dynamic testing (§8.6 performance, §8.5 restore drill, §8.2 live "
            "cross-tenant probe): not run. These mutate or load a running system "
            "and require --authorize-dynamic against an environment you are "
            "permitted to test. Performance therefore scores n/a, not 100."
        )

    # -- Phase 5: correlation -------------------------------------------
    systemic, clusters = correlate(audit.findings)
    audit.findings.extend(systemic)
    audit.clusters = clusters

    # -- Phase 6: scoring ------------------------------------------------
    audit.scores, audit.overall = score(audit.findings, audit.not_assessed)
    audit.finished = datetime.now(UTC).isoformat(timespec="seconds")

    # -- Phase 7: persist ------------------------------------------------
    (directory / "findings.json").write_text(dump_findings(audit.findings), encoding="utf-8")
    (directory / "audit.json").write_text(
        json.dumps(
            {
                "audit_id": audit.audit_id,
                "started": audit.started,
                "finished": audit.finished,
                "overall": audit.overall,
                "intake": intake,
                "scores": [
                    {"domain": s.domain, "score": s.score, "findings": s.findings,
                     "reason": s.reason}
                    for s in audit.scores
                ],
                "not_assessed": audit.not_assessed,
                "evidence": evidence.manifest(),
                "observations": _summarise(audit.observations),
            },
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    return audit


def _summarise(observations: dict) -> dict:
    """The full observation set includes every route and dependency, which is
    already in evidence/. audit.json keeps the shape without the bulk."""
    out = {}
    for key, value in observations.items():
        if isinstance(value, list) and len(value) > 25:
            out[key] = {"count": len(value), "see": f"evidence/{key}.json"}
        else:
            out[key] = value
    return out


def _git(cwd: Path, *args: str) -> str | None:
    try:
        proc = subprocess.run(
            ["git", *args], cwd=cwd, capture_output=True, text=True, timeout=15, check=False
        )
    except (OSError, subprocess.SubprocessError):
        return None
    return proc.stdout.strip() or None
