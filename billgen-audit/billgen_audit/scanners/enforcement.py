"""Phase 1.5 — how the target enforces auth, authz and tenancy (spec 8.2).

Every other security check depends on getting this right, and getting it wrong
is the classic way an audit tool becomes noise. A codebase that authenticates in
one global middleware looks, route by route, exactly like a codebase with no
authentication at all. A scanner that does not model the difference emits a
CRITICAL for every endpoint and is switched off within a day.

So this runs before the route scanner and answers three questions:

  auth_model      per_route | global_middleware | none
  tenant_model    per_query | context_var | none
  authz_model     per_route | none

The answers change which findings the route scanner is *allowed* to raise, and
they are written to evidence so a reader can check the inference rather than
trust it.
"""

from __future__ import annotations

import ast
import re

from ..findings import Finding, Location, RequirementType, Severity
from .base import Scanner, ScanResult

#  A middleware that returns 401 and reads an Authorization header is doing
#  authentication, whatever it is called.
_AUTH_SIGNALS = (r"401", r"[Aa]uthorization", r"bearer")
_TENANT_CTX_SIGNALS = (r"ContextVar", r"organization|tenant")


class EnforcementScanner(Scanner):
    name = "enforcement"
    phase = 1
    agent = "architecture"

    def run(self, prior: dict) -> ScanResult:
        res = ScanResult()

        auth = self._auth_model()
        tenant = self._tenant_model()

        model = {
            "auth_model": auth["model"],
            "auth_middleware": auth["file"],
            "public_allowlist": auth["public"],
            "tenant_model": tenant["model"],
            "tenant_source": tenant["file"],
            "tenant_scoped_queries": tenant["scoped_predicates"],
        }
        res.observations["enforcement"] = model
        self.evidence.record("enforcement-model", model)

        if auth["model"] == "none":
            res.not_assessed.append(
                "Authentication model: no global auth middleware was identified. "
                "Route-level checks are assumed to be the only mechanism, which "
                "makes every unprotected route a real finding rather than a "
                "false positive. Confirm this before acting on the route list."
            )
        if tenant["model"] == "none":
            res.not_assessed.append(
                "Tenant isolation model: no context-bound organization and no "
                "per-query organization predicate were found. Isolation is "
                "unassessed, which is not the same as absent (8.2)."
            )

        #  The allowlist is the real attack surface of a global-middleware
        #  design: everything it covers is public, including routes that were
        #  never meant to be. A prefix entry is worth flagging on its own,
        #  because it silently makes every future sibling route public too.
        for entry in auth["public"]:
            if not entry.endswith("/") or entry in ("/",):
                continue
            res.findings.append(
                Finding(
                    id=f"ARCH-PUBLIC-{len(res.findings) + 1:03d}",
                    agent="architecture",
                    severity=Severity.MEDIUM,
                    category="authentication",
                    title=f"Auth middleware exempts the whole {entry!r} prefix",
                    location=Location(auth["file"]),
                    evidence=(
                        f"The public allowlist in {auth['file']} exempts every path "
                        f"beginning {entry!r}, not a fixed set of paths. Any route "
                        f"added under that prefix later is unauthenticated by "
                        f"default, with no code change to review."
                    ),
                    impact=(
                        "A future endpoint under this prefix ships without "
                        "authentication and nothing in the diff says so."
                    ),
                    requirement_type=RequirementType.SECURITY,
                    recommendation=(
                        "Enumerate the public paths exactly, so adding a public "
                        "route is a visible edit to the allowlist."
                    ),
                    confidence=0.8,
                    verification_test=(
                        f"Add a test asserting every registered route under {entry!r} "
                        f"is intentionally public."
                    ),
                )
            )
        return res

    # ------------------------------------------------------------------

    def _auth_model(self) -> dict:
        """Look for a middleware class that rejects unauthenticated requests."""
        for path in self.config.walk(".py", under="api"):
            text = path.read_text(encoding="utf-8", errors="replace")
            if "Middleware" not in text:
                continue
            if not all(re.search(sig, text) for sig in _AUTH_SIGNALS):
                continue
            return {
                "model": "global_middleware",
                "file": self.config.rel(path),
                "public": self._public_allowlist(text),
            }
        #  No middleware: the route layer is all there is.
        return {"model": "per_route", "file": None, "public": []}

    @staticmethod
    def _public_allowlist(text: str) -> list[str]:
        """Every string literal assigned to a name that reads like an allowlist.

        Parsed rather than regexed so a prefix tuple and an exact-match set are
        both collected, and a commented-out entry is not.
        """
        out: list[str] = []
        try:
            tree = ast.parse(text)
        except SyntaxError:
            return out
        for node in ast.walk(tree):
            if not isinstance(node, ast.Assign):
                continue
            names = [t.id for t in node.targets if isinstance(t, ast.Name)]
            if not any(
                re.search(r"public|allow|exempt|whitelist|open", n, re.IGNORECASE)
                for n in names
            ):
                continue
            for sub in ast.walk(node.value):
                if isinstance(sub, ast.Constant) and isinstance(sub.value, str):
                    out.append(sub.value)
        return sorted(set(out))

    def _tenant_model(self) -> dict:
        """A ContextVar-bound organization, or an explicit predicate per query."""
        ctx_file = None
        for path in self.config.walk(".py", under="core"):
            text = path.read_text(encoding="utf-8", errors="replace")
            if all(re.search(sig, text) for sig in _TENANT_CTX_SIGNALS):
                ctx_file = self.config.rel(path)
                break

        predicates = self.grep(
            r"organization_id\s*==\s*current_organization_id\(\)", ".py"
        )
        scoped = sorted({f"{f}:{n}" for f, n, _ in predicates})

        if ctx_file and scoped:
            return {"model": "context_var", "file": ctx_file, "scoped_predicates": scoped}
        if scoped:
            return {"model": "per_query", "file": None, "scoped_predicates": scoped}
        if self.grep(r"organization_id\s*==", ".py"):
            return {"model": "per_query", "file": None, "scoped_predicates": []}
        return {"model": "none", "file": None, "scoped_predicates": []}
