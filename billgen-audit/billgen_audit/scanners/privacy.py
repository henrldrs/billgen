"""Agent 3's deterministic half — GDPR and secrets (spec §7, §13).

§7.2 is the section that makes this scanner worth running: *code-vs-policy
consistency*. A privacy policy is a claim about behaviour, and the only way to
audit it is to read both. Where a policy document does not exist at all, that is
reported as a gap rather than as compliance — §1's "absence of evidence is not
evidence of compliance" is aimed exactly here.
"""

from __future__ import annotations

import re

from ..findings import Finding, Location, RequirementType, Severity
from .base import Scanner, ScanResult

#  Documents §7 expects to exist. Missing ones are findings, not omissions.
POLICY_DOCS = {
    "privacy_policy": ("PRIVACY.md", "docs/PRIVACY.md", "docs/privacy-policy.md"),
    "cookie_policy": ("COOKIES.md", "docs/COOKIES.md", "docs/cookie-policy.md"),
    "dpa": ("DPA.md", "docs/DPA.md"),
    "subprocessors": ("SUBPROCESSORS.md", "docs/SUBPROCESSORS.md"),
    "retention_policy": ("docs/RETENTION.md", "docs/retention-policy.md"),
    "incident_response": ("docs/INCIDENT_RESPONSE.md", "docs/incident-response.md"),
    "security_policy": ("SECURITY.md", "docs/SECURITY.md"),
}

#  §7.1: user rights that need an endpoint before they can be exercised.
DSR_ROUTES = {
    "export": r"(?i)(data[_-]?export|privacy/export|/export.*personal)",
    "deletion": r"(?i)(delete[_-]?account|privacy/delete|erasure|right[_-]?to[_-]?be)",
}

SECRET_PATTERNS = {
    "private_key": r"-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----",
    "aws_access_key": r"\bAKIA[0-9A-Z]{16}\b",
    "generic_api_key": (
        r"(?i)\b(api[_-]?key|secret[_-]?key|access[_-]?token)\b"
        r"\s*[:=]\s*['\"][A-Za-z0-9/+_-]{24,}['\"]"
    ),
    "password_literal": r"(?i)\bpassword\s*[:=]\s*['\"][^'\"]{8,}['\"]",
}

#  A repository is full of strings that look like secrets and are not: test
#  fixtures, examples, and the dev defaults a config guard already refuses.
SECRET_ALLOW = re.compile(
    r"(?i)(example|sample|dummy|placeholder|changeme|your[_-]|xxx|test|fixture|dev-only|\.env\.example)"
)


class PrivacyScanner(Scanner):
    name = "privacy"
    phase = 2
    agent = "gdpr"

    def run(self, prior: dict) -> ScanResult:
        res = ScanResult()
        seq = 0
        observed: dict = {}

        # -- §7 policy documents -----------------------------------------
        present, missing = {}, []
        for label, candidates in POLICY_DOCS.items():
            found = self.exists(*candidates)
            present[label] = found
            if not found:
                missing.append(label)
        observed["policy_documents"] = present

        if missing:
            seq += 1
            res.findings.append(
                Finding(
                    id=f"GDPR-{seq:03d}",
                    agent="gdpr",
                    severity=Severity.HIGH if "privacy_policy" in missing else Severity.MEDIUM,
                    category="documentation",
                    title=(
                        f"{len(missing)} required privacy document(s) not present in "
                        f"the repository"
                    ),
                    location=Location("docs"),
                    evidence="Not found: " + ", ".join(sorted(missing)),
                    impact=(
                        "§7 expects a controller to be able to show its processing "
                        "record, retention periods, subprocessors and breach "
                        "procedure. None of these can be audited from code alone, "
                        "and their absence here is a gap in the audit, not a pass."
                    ),
                    requirement_type=RequirementType.RECOMMENDATION,
                    recommendation=(
                        "Keep these in the repository beside the code they describe, "
                        "so §7.2's code-vs-policy comparison has two sides to compare."
                    ),
                    confidence=0.95,
                    verification_test="Re-run; the missing list should shrink.",
                    references=[
                        "Spec §7.1 data inventory questions",
                        "Spec §7.2 code-vs-policy consistency",
                    ],
                )
            )

        # -- §7.1 data-subject rights need endpoints ---------------------
        routes = prior.get("routes") or []
        route_blob = " ".join(f"{r['method']} {r['path']} {r['handler']}" for r in routes)
        for right, pattern in DSR_ROUTES.items():
            has_route = bool(re.search(pattern, route_blob))
            observed[f"dsr_{right}"] = has_route
            if has_route:
                continue
            seq += 1
            res.findings.append(
                Finding(
                    id=f"GDPR-{seq:03d}",
                    agent="gdpr",
                    severity=Severity.HIGH,
                    category="data_subject_rights",
                    title=f"No endpoint implements data-subject {right}",
                    location=Location("api/routers"),
                    evidence=(
                        f"No registered route matched the {right} pattern across "
                        f"{len(routes)} endpoints."
                    ),
                    impact=(
                        "A data-subject request must be satisfiable within a "
                        "statutory deadline. Without an endpoint it is a manual "
                        "database operation, which does not scale and is not logged."
                    ),
                    requirement_type=RequirementType.RECOMMENDATION,
                    recommendation=f"Implement {right} as an audited, tenant-scoped operation.",
                    confidence=0.75,
                    verification_test=f"Exercise the {right} flow end to end for one user.",
                )
            )

        # -- §7.1 personal data in logs ----------------------------------
        pii_logs = self.grep(
            r"(?i)log(?:ger)?\.\w+\([^)]*\b(email|password|vat_number|iban|address|phone)\b",
            ".py",
        )
        observed["pii_in_logs"] = [f"{f}:{n}" for f, n, _ in pii_logs]
        for path, line, text in pii_logs[:5]:
            seq += 1
            res.findings.append(
                Finding(
                    id=f"GDPR-{seq:03d}",
                    agent="gdpr",
                    severity=Severity.MEDIUM,
                    category="data_minimisation",
                    title="A log statement appears to include personal data",
                    location=Location(path, line),
                    evidence=text[:160],
                    impact=(
                        "Logs are usually retained longer than the data they "
                        "describe, replicated to third parties, and outside the "
                        "reach of a deletion request (§7.1)."
                    ),
                    requirement_type=RequirementType.RECOMMENDATION,
                    recommendation="Log identifiers, not personal data.",
                    confidence=0.5,
                    verification_test="Grep a production log sample for the field.",
                )
            )

        # -- §7.1 analytics and third parties ----------------------------
        trackers = self.grep(
            r"(?i)(google-analytics|gtag\(|googletagmanager|segment\.com|mixpanel|hotjar|sentry)",
            ".ts", ".tsx", ".js", ".html",
        )
        observed["trackers"] = sorted({f for f, _, _ in trackers})
        if trackers and not present.get("cookie_policy"):
            seq += 1
            res.findings.append(
                Finding(
                    id=f"GDPR-{seq:03d}",
                    agent="gdpr",
                    severity=Severity.HIGH,
                    category="consent",
                    title="Third-party tracking is present with no cookie policy in the repository",
                    location=Location(sorted({f for f, _, _ in trackers})[0]),
                    evidence=(
                        "Tracking or telemetry references found in: "
                        + ", ".join(sorted({f for f, _, _ in trackers})[:8])
                    ),
                    impact=(
                        "§7.2: non-essential tracking must be gated on consent, and "
                        "the policy must describe it. Neither could be verified."
                    ),
                    requirement_type=RequirementType.RECOMMENDATION,
                    recommendation="Gate non-essential tags behind consent and document them.",
                    confidence=0.6,
                    verification_test=(
                        "Load the app with no consent given; assert no tracker "
                        "request fires."
                    ),
                )
            )

        self.evidence.record("privacy", observed)
        res.observations["privacy"] = observed
        return res


class SecretsScanner(Scanner):
    """§13 security — secrets that should never have been committed."""

    name = "secrets"
    phase = 2
    agent = "gdpr"

    def run(self, prior: dict) -> ScanResult:
        res = ScanResult()
        hits: list[dict] = []
        seq = 0

        for label, pattern in SECRET_PATTERNS.items():
            for path, line, text in self.grep(pattern, ".py", ".ts", ".tsx", ".json",
                                              ".yml", ".yaml", ".toml", ".env", ".cfg"):
                if SECRET_ALLOW.search(text) or SECRET_ALLOW.search(path):
                    continue
                hits.append({"kind": label, "file": path, "line": line})
                seq += 1
                res.findings.append(
                    Finding(
                        id=f"SEC-{seq:03d}",
                        agent="gdpr",
                        severity=Severity.CRITICAL,
                        category="secrets",
                        title=f"A committed {label.replace('_', ' ')} was found",
                        location=Location(path, line),
                        #  Never quote the match. An audit report is itself a
                        #  document that gets shared, and copying the secret into
                        #  it widens the exposure the finding is about.
                        evidence=(
                            f"A value matching the {label} pattern is present at this "
                            f"location. The value is deliberately not reproduced here."
                        ),
                        impact=(
                            "A secret in version control is exposed to everyone with "
                            "repository access and to every fork and backup of it, "
                            "and rotating it is the only remedy."
                        ),
                        requirement_type=RequirementType.SECURITY,
                        recommendation=(
                            "Rotate the credential first, then remove it from history. "
                            "Deleting the line alone leaves it in every earlier commit."
                        ),
                        confidence=0.7,
                        verification_test="Re-run after rotation; expect no match.",
                    )
                )

        res.observations["secrets"] = {"hits": hits, "patterns_checked": sorted(SECRET_PATTERNS)}
        self.evidence.record("secrets", res.observations["secrets"])

        if not self.exists(".gitignore"):
            res.not_assessed.append(
                "Secret hygiene: no .gitignore, so whether secret files are "
                "excluded from commits could not be assessed."
            )
        return res
