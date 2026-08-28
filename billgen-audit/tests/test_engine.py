"""The audit engine's own tests.

An audit tool that is wrong is worse than no audit tool: its output is trusted
and its mistakes are laundered through a report. So the tests here are mostly
about *refusing to conclude* — the schema rejecting an unsourced legal claim, a
grep match not becoming compliance, an unassessed domain not scoring 100.

Run with: python -m pytest billgen-audit/tests -q
These are not collected by BillGen's suite, whose testpaths is ["tests"].
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from billgen_audit.config import AuditConfig  # noqa: E402
from billgen_audit.correlation import correlate  # noqa: E402
from billgen_audit.evidence import EvidenceStore  # noqa: E402
from billgen_audit.findings import (  # noqa: E402
    Finding,
    Location,
    RequirementType,
    Severity,
)
from billgen_audit.report.diff import compare  # noqa: E402
from billgen_audit.scanners.base import Scanner  # noqa: E402
from billgen_audit.scanners.routes import RouteScanner, _is_public  # noqa: E402
from billgen_audit.scoring import score  # noqa: E402


def make_finding(**overrides) -> Finding:
    base = dict(
        id="T-001",
        agent="architecture",
        severity=Severity.HIGH,
        category="authorization",
        title="A title",
        evidence="Some evidence",
        impact="Some impact",
        recommendation="Do the thing",
    )
    base.update(overrides)
    return Finding(**base)


# -- the schema refuses what it cannot support -------------------------


def test_legal_finding_without_a_source_is_refused():
    """Spec §1 'no hallucinated compliance' is enforced at construction, not by
    review. A legal conclusion with no authoritative source cannot exist."""
    with pytest.raises(ValueError, match="must cite a source"):
        make_finding(requirement_type=RequirementType.LEGAL)


def test_legal_finding_with_a_source_is_allowed():
    f = make_finding(
        requirement_type=RequirementType.LEGAL,
        references=["https://finances.belgium.be/..."],
    )
    assert f.requirement_type is RequirementType.LEGAL


def test_confidence_outside_zero_to_one_is_refused():
    with pytest.raises(ValueError, match="confidence"):
        make_finding(confidence=1.4)


def test_fingerprint_ignores_the_line_number():
    """A finding that moved because code above it grew is the same finding. A
    diff that reports it resolved-and-new is a diff nobody reads twice."""
    a = make_finding(location=Location("api/x.py", 10))
    b = make_finding(location=Location("api/x.py", 99))
    assert a.fingerprint == b.fingerprint


# -- scoring refuses to reward silence ---------------------------------


def test_unassessed_domain_scores_na_not_100():
    scores, _ = score([], ["Belgian VAT / e-invoicing: rule registry is empty"])
    legal = next(s for s in scores if s.domain == "Legal/VAT")
    assert legal.score is None
    assert legal.display == "n/a"


def test_informational_confirmations_do_not_make_an_unassessed_domain_score():
    """The exact bug this guards: 'needs confirmation' findings carry a penalty
    of zero, so a domain full of them scored a clean 100 for an area nobody had
    read."""
    findings = [
        make_finding(
            id=f"C-{n}",
            severity=Severity.INFORMATIONAL,
            category="vat",
            confidence=0.2,
        )
        for n in range(5)
    ]
    scores, _ = score(findings, ["Belgian VAT / e-invoicing: 5 rules unverified"])
    legal = next(s for s in scores if s.domain == "Legal/VAT")
    assert legal.score is None


def test_a_substantive_finding_makes_the_domain_score_again():
    findings = [make_finding(category="vat", severity=Severity.HIGH, confidence=1.0)]
    scores, _ = score(findings, ["Belgian VAT / e-invoicing: unverified"])
    legal = next(s for s in scores if s.domain == "Legal/VAT")
    assert legal.score is not None and legal.score < 100


def test_confidence_discounts_the_penalty():
    sure = score([make_finding(category="secrets", severity=Severity.CRITICAL,
                               confidence=1.0)], [])[0]
    unsure = score([make_finding(category="secrets", severity=Severity.CRITICAL,
                                 confidence=0.3)], [])[0]
    a = next(s for s in sure if s.domain == "Security").score
    b = next(s for s in unsure if s.domain == "Security").score
    assert a is not None and b is not None and a < b


def test_never_green_while_a_domain_is_unassessed():
    _, overall = score([], ["Performance: not run"])
    assert overall != "GREEN"


def test_high_confidence_critical_is_red():
    _, overall = score(
        [make_finding(severity=Severity.CRITICAL, category="secrets", confidence=0.9)], []
    )
    assert overall == "RED"


def test_low_confidence_critical_alone_is_not_red():
    """A lead is not a fact. A 0.35-confidence CRITICAL is something to verify."""
    _, overall = score(
        [make_finding(severity=Severity.CRITICAL, category="secrets", confidence=0.35)], []
    )
    assert overall != "RED"


# -- correlation -------------------------------------------------------


def test_two_agents_on_one_mechanism_produce_a_systemic_finding():
    findings = [
        make_finding(id="A", agent="accounting", category="document_integrity"),
        make_finding(id="B", agent="architecture", category="auditability"),
    ]
    systemic, _ = correlate(findings)
    assert len(systemic) == 1
    assert systemic[0].severity is Severity.CRITICAL  # escalated from HIGH


def test_one_agent_alone_is_not_systemic():
    findings = [
        make_finding(id="A", agent="accounting", category="document_integrity"),
        make_finding(id="B", agent="accounting", category="auditability"),
    ]
    systemic, _ = correlate(findings)
    assert systemic == []


def test_informational_questions_do_not_corroborate_a_systemic_finding():
    """A 'needs confirmation' entry is an open question. Counted as evidence it
    inflates the agent count and drags the cluster's confidence to its own 0.2,
    producing a CRITICAL nobody believes."""
    findings = [
        make_finding(id="A", agent="accounting", category="document_integrity"),
        make_finding(
            id="Q", agent="legal-vat", category="auditability",
            severity=Severity.INFORMATIONAL, confidence=0.2,
        ),
    ]
    systemic, _ = correlate(findings)
    assert systemic == []


def test_systemic_confidence_cannot_exceed_its_evidence():
    findings = [
        make_finding(id="A", agent="accounting", category="document_integrity",
                     confidence=0.9),
        make_finding(id="B", agent="architecture", category="auditability",
                     confidence=0.35),
    ]
    systemic, _ = correlate(findings)
    assert systemic[0].confidence == 0.35


# -- diff --------------------------------------------------------------


def test_a_resolved_finding_that_returns_is_regressed():
    current = make_finding()
    baseline = [{**current.to_dict(), "status": "RESOLVED"}]
    diff = compare(baseline, [current], "audit-001", "audit-002")
    assert len(diff.regressed) == 1
    assert diff.new == []


def test_a_finding_that_disappears_is_resolved():
    gone = make_finding()
    diff = compare([gone.to_dict()], [], "audit-001", "audit-002")
    assert len(diff.resolved) == 1


# -- the grep helper ---------------------------------------------------


def test_grep_anchors_to_lines_not_to_the_file(tmp_path):
    """The bug this guards silently dropped every `^`-anchored pattern, which
    made a check that never ran look like a check that passed."""
    (tmp_path / "sample.py").write_text(
        "import os\n\n\ndef build_invoice_ubl(x):\n    return x\n", encoding="utf-8"
    )
    config = AuditConfig(target=tmp_path, audits_dir=tmp_path / "audits")
    scanner = Scanner(config, EvidenceStore(tmp_path / "audits" / "evidence"))
    hits = scanner.grep(r"^\s*def\s+build_", ".py")
    assert len(hits) == 1
    assert hits[0][1] == 4


# -- the enforcement model changes what routes may claim ---------------


def test_public_prefix_matching():
    allowlist = ("/auth/", "/healthz")
    assert _is_public("/auth/login", allowlist)
    assert _is_public("/healthz", allowlist)
    assert not _is_public("/invoices", allowlist)
    assert not _is_public("/authorised", allowlist)


def test_global_middleware_suppresses_per_route_auth_findings(tmp_path):
    """The false-positive engine this guards against: under a global auth
    middleware every handler looks unauthenticated, and reporting all of them
    buries the four findings that matter."""
    routers = tmp_path / "api" / "routers"
    routers.mkdir(parents=True)
    (routers / "things.py").write_text(
        'from fastapi import APIRouter\n'
        'router = APIRouter(prefix="/things")\n'
        '\n'
        '@router.get("/{thing_id}")\n'
        'def get_thing(thing_id: str):\n'
        '    return thing_id\n',
        encoding="utf-8",
    )
    config = AuditConfig(target=tmp_path, audits_dir=tmp_path / "audits")
    evidence = EvidenceStore(tmp_path / "audits" / "evidence")

    per_route = RouteScanner(config, evidence).run({"enforcement": {"auth_model": "per_route"}})
    assert any(f.category == "authentication" for f in per_route.findings)

    global_mw = RouteScanner(config, evidence).run(
        {
            "enforcement": {
                "auth_model": "global_middleware",
                "tenant_model": "context_var",
                "public_allowlist": ["/auth/"],
            }
        }
    )
    assert not any(f.category == "authentication" for f in global_mw.findings)


def test_context_var_tenancy_suppresses_signature_based_tenant_findings(tmp_path):
    routers = tmp_path / "api" / "routers"
    routers.mkdir(parents=True)
    (routers / "things.py").write_text(
        'from fastapi import APIRouter\n'
        'router = APIRouter(prefix="/things")\n'
        '\n'
        '@router.get("/{thing_id}")\n'
        'def get_thing(thing_id: str, user=Depends(current_user_id)):\n'
        '    return thing_id\n',
        encoding="utf-8",
    )
    config = AuditConfig(target=tmp_path, audits_dir=tmp_path / "audits")
    evidence = EvidenceStore(tmp_path / "audits" / "evidence")

    scoped = RouteScanner(config, evidence).run(
        {"enforcement": {"auth_model": "global_middleware", "tenant_model": "context_var",
                         "public_allowlist": []}}
    )
    assert not any(f.category == "tenant_isolation" for f in scoped.findings)

    unscoped = RouteScanner(config, evidence).run(
        {"enforcement": {"auth_model": "global_middleware", "tenant_model": "none",
                         "public_allowlist": []}}
    )
    assert any(f.category == "tenant_isolation" for f in unscoped.findings)


# -- the engine does not audit itself ----------------------------------


def test_the_auditor_is_excluded_from_the_target():
    config = AuditConfig.load()
    assert config.is_excluded(Path("billgen-audit/billgen_audit/cli.py"))
    assert config.is_excluded(Path(".claude/worktrees/stale/api/main.py"))
    assert not config.is_excluded(Path("api/main.py"))
