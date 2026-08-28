"""Phase 1 — discovery (§3).

Reconstructs what the target actually is: deployable components, languages,
frameworks, databases, migrations, CI/CD, environments. Nothing here is a
finding; later phases and all four agents read these observations, so a wrong
answer here is wrong everywhere.
"""

from __future__ import annotations

import json
import re

from .base import Scanner, ScanResult


class DiscoveryScanner(Scanner):
    name = "discovery"
    phase = 1

    def run(self, prior: dict) -> ScanResult:
        res = ScanResult()

        res.observations["components"] = self._components()
        res.observations["languages"] = self._languages()
        res.observations["frameworks"] = self._frameworks()
        res.observations["database"] = self._database()
        res.observations["ci"] = self._ci()
        res.observations["environments"] = self._environments()
        res.observations["container"] = {
            "dockerfile": self.exists("Dockerfile"),
            "compose": self.exists("docker-compose.yml", "docker-compose.yaml"),
            "iac": self.exists("infra", "terraform", "pulumi"),
        }

        self.evidence.record("discovery", res.observations)

        if not res.observations["ci"]["configured"]:
            res.not_assessed.append(
                "CI/CD: no pipeline configuration found, so nothing could be "
                "checked about how this deploys or rolls back (spec 8.1)."
            )
        return res

    # ------------------------------------------------------------------

    def _components(self) -> list[dict]:
        """Separately deployable parts (§8.1)."""
        out = []
        for pkg in self.config.walk(".json"):
            if pkg.name != "package.json":
                continue
            rel = self.config.rel(pkg)
            if rel.count("/") > 1:
                continue
            try:
                data = json.loads(pkg.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                continue
            out.append(
                {
                    "path": rel.rsplit("/", 1)[0] if "/" in rel else ".",
                    "kind": "node",
                    "name": data.get("name", "?"),
                    "scripts": sorted(data.get("scripts", {})),
                }
            )
        for rel, kind in (("api", "python-api"), ("core", "python-domain"),
                          ("desktop", "desktop-shell"), ("db", "python-persistence")):
            if self.exists(rel):
                out.append({"path": rel, "kind": kind, "name": rel})
        return out

    def _languages(self) -> dict[str, int]:
        counts: dict[str, int] = {}
        for path in self.config.walk():
            suffix = path.suffix.lower()
            if suffix in {".py", ".ts", ".tsx", ".js", ".jsx", ".sql", ".html", ".css"}:
                counts[suffix] = counts.get(suffix, 0) + 1
        return dict(sorted(counts.items(), key=lambda kv: -kv[1]))

    def _frameworks(self) -> list[str]:
        found = []
        probes = {
            "fastapi": r"^\s*(from|import)\s+fastapi",
            "sqlalchemy": r"^\s*(from|import)\s+sqlalchemy",
            "pydantic": r"^\s*(from|import)\s+pydantic",
        }
        for label, pattern in probes.items():
            if self.grep(pattern, ".py", flags=re.MULTILINE):
                found.append(label)
        if self.exists("alembic.ini"):
            found.append("alembic")
        pkg = self.config.read("package.json")
        for label in ("react", "vite", "vitest", "typescript", "electron"):
            if pkg and json.dumps(label) in pkg:
                found.append(label)
        return sorted(set(found))

    def _database(self) -> dict:
        migrations = self.config.walk(".py", under="db/migrations/versions")
        models = [self.config.rel(p) for p in self.config.walk(".py", under="db/models")]
        engines = set()
        for _, _, line in self.grep(r"postgresql|sqlite|mysql", ".py", ".toml", ".yml"):
            engines.update(re.findall(r"postgresql|sqlite|mysql", line))
        return {
            "alembic": bool(self.exists("alembic.ini")),
            "migration_count": len(migrations),
            "models": sorted(m.rsplit("/", 1)[-1] for m in models),
            "engines_referenced": sorted(engines),
        }

    def _ci(self) -> dict:
        workflows = [
            self.config.rel(p) for p in self.config.walk(".yml", ".yaml", under=".github")
        ]
        return {"configured": bool(workflows), "workflows": workflows}

    def _environments(self) -> list[str]:
        """§8.1 — which of dev/staging/production this tree actually knows about."""
        seen = set()
        for _, _, line in self.grep(
            r"\b(development|staging|production)\b", ".py", ".yml", ".yaml", ".toml"
        ):
            seen.update(re.findall(r"\b(development|staging|production)\b", line))
        return sorted(seen)
