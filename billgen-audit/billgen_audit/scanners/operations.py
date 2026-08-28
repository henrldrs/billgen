"""Agent 4's remaining deterministic half — dependencies, resilience, observability.

Three of the specification's sections that a static reading can genuinely serve:

  §8.3  dependency and technology lifecycle
  §8.5  availability, RTO/RPO and disaster recovery
  §8.8  monitoring and observability

§8.5 carries an instruction the rest of the file obeys: *do not prescribe
multi-region or high-availability infrastructure without demonstrating the
business requirement*. So nothing here recommends replication. It reports
whether backups exist, whether restore has been exercised, and whether the RTO
and RPO are written down anywhere — because an undocumented RTO is the finding,
not the absence of a standby cluster.
"""

from __future__ import annotations

import json
import re
import tomllib

from ..findings import Finding, Location, RequirementType, Severity
from .base import Scanner, ScanResult

#  §8.3 support status. Kept as data with an as-of date rather than as
#  judgement in code, because it goes out of date on a schedule.
RUNTIME_EOL = {
    "as_of": "2026-08-28",
    "python": {"3.9": "2025-10", "3.10": "2026-10", "3.11": "2027-10",
               "3.12": "2028-10", "3.13": "2029-10", "3.14": "2030-10"},
    "node": {"18": "2025-04", "20": "2026-04", "22": "2027-04", "24": "2028-04"},
}


class DependencyScanner(Scanner):
    """§8.3 — what this runs on, and how long that remains supported."""

    name = "dependencies"
    phase = 2
    agent = "architecture"

    def run(self, prior: dict) -> ScanResult:
        res = ScanResult()
        deps: list[dict] = []
        seq = 0

        pyproject = self.config.read("pyproject.toml")
        if pyproject:
            try:
                data = tomllib.loads(pyproject)
            except tomllib.TOMLDecodeError:
                data = {}
            project = data.get("project", {})
            requires = project.get("requires-python", "")
            for spec in project.get("dependencies", []):
                deps.append({"name": spec, "ecosystem": "python", "direct": True})
            for group in data.get("dependency-groups", {}).values():
                for spec in group:
                    deps.append({"name": spec, "ecosystem": "python", "direct": False})
            res.observations["requires_python"] = requires

        pkg = self.config.read("package.json")
        if pkg:
            try:
                data = json.loads(pkg)
            except json.JSONDecodeError:
                data = {}
            for section, direct in (("dependencies", True), ("devDependencies", False)):
                for name, version in (data.get(section) or {}).items():
                    deps.append(
                        {"name": f"{name}{version}", "ecosystem": "node", "direct": direct}
                    )

        res.observations["dependencies"] = deps
        res.observations["dependency_count"] = len(deps)
        res.observations["runtime_eol_reference"] = RUNTIME_EOL["as_of"]
        self.evidence.record("dependencies", deps)

        # -- unpinned direct dependencies --------------------------------
        unpinned = [
            d["name"]
            for d in deps
            if d["direct"] and not re.search(r"[=~^><]\s*\d", d["name"])
        ]
        if unpinned:
            seq += 1
            res.findings.append(
                Finding(
                    id=f"DEP-{seq:03d}",
                    agent="architecture",
                    severity=Severity.MEDIUM,
                    category="dependency_management",
                    title=(
                        f"{len(unpinned)} direct dependency declaration(s) carry no "
                        f"version bound"
                    ),
                    location=Location("pyproject.toml"),
                    evidence="Unbounded: " + ", ".join(unpinned[:15]),
                    impact=(
                        "§8.3 asks for versions and upgrade risk. An unbounded "
                        "dependency means two installs of the same commit are not the "
                        "same software, and a production incident cannot be "
                        "reproduced locally."
                    ),
                    requirement_type=RequirementType.RECOMMENDATION,
                    recommendation=(
                        "Bound direct dependencies and rely on the lockfile for the "
                        "exact set."
                    ),
                    confidence=0.8,
                    verification_test="Re-run; unbounded count should be zero.",
                )
            )

        # -- lockfile integrity ------------------------------------------
        locks = [
            name
            for name in ("uv.lock", "poetry.lock", "requirements.txt",
                         "package-lock.json", "yarn.lock", "pnpm-lock.yaml")
            if self.exists(name)
        ]
        res.observations["lockfiles"] = locks
        if not locks:
            seq += 1
            res.findings.append(
                Finding(
                    id=f"DEP-{seq:03d}",
                    agent="architecture",
                    severity=Severity.HIGH,
                    category="dependency_management",
                    title="No lockfile in the repository",
                    location=Location("."),
                    evidence="None of the usual lockfiles were found.",
                    impact="A deployment cannot be reproduced from source control (§8.1).",
                    requirement_type=RequirementType.RECOMMENDATION,
                    recommendation="Commit the lockfile and install from it in CI and production.",
                    confidence=0.9,
                    verification_test=(
                        "Build twice from a clean cache; expect identical "
                        "resolutions."
                    ),
                )
            )

        res.not_assessed.append(
            "Known vulnerabilities (§8.3): this engine performs no network lookup, "
            "so no advisory database was consulted. Run the ecosystem's own "
            "advisory scanner and attach its output as evidence."
        )
        return res


class ResilienceScanner(Scanner):
    """§8.5 — backups, restore, RTO and RPO."""

    name = "resilience"
    phase = 2
    agent = "architecture"

    def run(self, prior: dict) -> ScanResult:
        res = ScanResult()
        seq = 0
        observed: dict = {}

        backup_code = self.grep(r"(?i)\bbackup\b", ".py", under="core")
        restore_code = self.grep(r"(?i)\brestore\b", ".py", under="core")
        restore_test = self.grep(r"(?i)\brestore\b", ".py", under="tests")
        observed["backup_code"] = bool(backup_code)
        observed["restore_code"] = bool(restore_code)
        observed["restore_tested"] = bool(restore_test)

        if backup_code and not restore_code:
            seq += 1
            res.findings.append(
                Finding(
                    id=f"RES-{seq:03d}",
                    agent="architecture",
                    severity=Severity.HIGH,
                    category="disaster_recovery",
                    title="Backup exists with no restore path",
                    location=Location("core"),
                    evidence="Backup code found; no restore code found.",
                    impact=(
                        "§8.5 asks whether restoration has actually been tested. A "
                        "backup that has never been restored is an assumption, not a "
                        "recovery capability."
                    ),
                    requirement_type=RequirementType.RECOMMENDATION,
                    recommendation="Implement and exercise restore; measure how long it takes.",
                    confidence=0.85,
                    verification_test=(
                        "Restore a backup into a scratch database and diff row "
                        "counts."
                    ),
                )
            )
        elif restore_code and not restore_test:
            seq += 1
            res.findings.append(
                Finding(
                    id=f"RES-{seq:03d}",
                    agent="architecture",
                    severity=Severity.MEDIUM,
                    category="disaster_recovery",
                    title="Restore is implemented but no test exercises it",
                    location=Location("core"),
                    evidence="Restore code found; no restore test found under tests/.",
                    impact=(
                        "§8.5: 'has restoration actually been tested?' is a question "
                        "the repository currently answers with silence."
                    ),
                    requirement_type=RequirementType.RECOMMENDATION,
                    recommendation="Add a restore test that asserts the restored data matches.",
                    confidence=0.7,
                    verification_test="Run the restore test in CI.",
                )
            )

        # -- RTO / RPO written down anywhere -----------------------------
        objectives = self.grep(
            r"\bRTO\b|\bRPO\b|recovery (time|point) objective",
            ".md", ".txt", ".yml",
        )
        observed["rto_rpo_documented"] = bool(objectives)
        if not objectives:
            seq += 1
            res.findings.append(
                Finding(
                    id=f"RES-{seq:03d}",
                    agent="architecture",
                    severity=Severity.MEDIUM,
                    category="disaster_recovery",
                    title="No recovery time or recovery point objective is documented",
                    location=Location("docs"),
                    evidence="No RTO/RPO statement was found in any document in the tree.",
                    impact=(
                        "§8.5 requires the objectives to be established first and the "
                        "architecture compared against them. Without a stated RTO, no "
                        "resilience investment can be shown to be sufficient — or "
                        "shown to be excessive, which for an early-stage product is "
                        "the more common and more expensive error."
                    ),
                    requirement_type=RequirementType.RECOMMENDATION,
                    recommendation=(
                        "State the acceptable downtime and acceptable data loss, then "
                        "compare backup frequency against the RPO. Do not add "
                        "replication until the RTO demands it."
                    ),
                    confidence=0.9,
                    verification_test="Point to the document stating RTO and RPO.",
                )
            )

        self.evidence.record("resilience", observed)
        res.observations["resilience"] = observed
        return res


class ObservabilityScanner(Scanner):
    """§8.8 — can a failure be detected before a customer reports it."""

    name = "observability"
    phase = 2
    agent = "architecture"

    def run(self, prior: dict) -> ScanResult:
        res = ScanResult()
        observed = {
            "structured_logging": bool(
                self.grep(r"structlog|json.*[Ff]ormatter|logging_config", ".py")
            ),
            "correlation_id": bool(
                self.grep(r"(?i)correlation[_-]?id|request[_-]?id|trace[_-]?id", ".py")
            ),
            "health_endpoint": bool(
                re.search(r"/health|/healthz|/readyz",
                          " ".join(r["path"] for r in (prior.get("routes") or [])))
            ),
            "error_tracking": bool(
                self.grep(r"(?i)sentry|rollbar|bugsnag|opentelemetry", ".py", ".ts", ".tsx")
            ),
            "metrics": bool(self.grep(r"(?i)prometheus|statsd|opentelemetry|metrics", ".py")),
        }
        res.observations["observability"] = observed
        self.evidence.record("observability", observed)

        if not observed["correlation_id"]:
            res.findings.append(
                Finding(
                    id="OBS-001",
                    agent="architecture",
                    severity=Severity.MEDIUM,
                    category="observability",
                    title="No request or correlation identifier is threaded through logs",
                    location=Location("api"),
                    evidence="No correlation/request/trace id marker was found.",
                    impact=(
                        "§8.8 asks whether the team can distinguish a customer-specific "
                        "failure from a global outage. Without a per-request id, one "
                        "user's failing invoice cannot be traced across the API, the "
                        "PDF renderer and the delivery attempt."
                    ),
                    requirement_type=RequirementType.RECOMMENDATION,
                    recommendation="Generate an id per request and log it at every layer.",
                    confidence=0.75,
                    verification_test=(
                        "Trigger one failure and retrieve every log line for it by "
                        "id."
                    ),
                )
            )

        if not observed["error_tracking"]:
            res.not_assessed.append(
                "Error detection (§8.8): no error-tracking integration was found in "
                "the tree. If one is configured at the platform level instead, "
                "attach that configuration as evidence."
            )
        return res
