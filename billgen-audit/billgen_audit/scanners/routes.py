"""API surface, authorization and tenant context (spec 8.2, 12).

This is the scanner the specification cares about most, and it is deliberately
built on `ast` rather than regex. A regex that decides whether an endpoint is
protected will eventually read a permission out of a comment or a docstring and
call an open route safe, which is the single worst failure this tool can have.

What it reconstructs, per route:

  method + path        the real registered surface, router prefix included
  auth                 does it depend on an authenticated identity at all
  permission           does it declare one (8.2, "enforced server-side")
  tenant_context       does it reach organization scope, or only a user id

The specification's 8.2 threat test -- user B fetching user A's invoice by id
-- cannot be *proved* by static analysis. So this scanner never claims
isolation is broken; it reports which routes have no visible ownership path and
hands the list to the architecture agent and to a dynamic test. Confidence is
scored to match: severity is what it would cost, confidence is what we know.
"""

from __future__ import annotations

import ast

from ..findings import Finding, Location, RequirementType, Severity
from .base import Scanner, ScanResult

HTTP_METHODS = {"get", "post", "put", "patch", "delete", "head", "options"}
WRITE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

AUTH_MARKERS = ("current_user", "require_permission", "current_actor", "get_current")
PERMISSION_MARKERS = ("require_permission", "Permission")
TENANT_MARKERS = ("organization", "org_id", "tenant", "company_id")

#  Routes that are unauthenticated by design. Anything not on this list that
#  takes no identity is reported. The allowlist lives here rather than in the
#  target's code, so the target cannot silently grow one.
PUBLIC_BY_DESIGN = {
    ("POST", "/auth/login"),
    ("POST", "/auth/register"),
    ("POST", "/auth/refresh"),
    ("POST", "/auth/token"),
    ("GET", "/health"),
    ("GET", "/health/live"),
    ("GET", "/health/ready"),
    ("GET", "/"),
}


class RouteScanner(Scanner):
    name = "routes"
    phase = 2
    agent = "architecture"

    def run(self, prior: dict) -> ScanResult:
        res = ScanResult()
        routes = self._collect()
        res.observations["routes"] = routes
        res.observations["route_count"] = len(routes)
        res.observations["registered_routers"] = self._registered()

        if not routes:
            res.not_assessed.append(
                "API surface: no routers were parsed, so authorization, tenant "
                "isolation and the endpoint inventory are unassessed (8.2, 12). "
                "This is not a clean result."
            )
            return res

        self.evidence.record("routes", routes)
        seq = _Counter()

        #  What the enforcement scanner found decides which questions are even
        #  meaningful here. Under a global auth middleware, a handler with no
        #  identity in its signature is normal, not a CRITICAL -- and reporting
        #  it as one would bury the findings that matter.
        model = (prior.get("enforcement") or {})
        auth_model = model.get("auth_model", "per_route")
        tenant_model = model.get("tenant_model", "none")
        public = tuple(model.get("public_allowlist", ()))

        res.observations["auth_enforced_by"] = auth_model
        res.observations["public_routes"] = [
            f"{r['method']} {r['path']}" for r in routes if _is_public(r["path"], public)
        ]

        for route in routes:
            if (route["method"], route["path"]) in PUBLIC_BY_DESIGN:
                continue

            if auth_model == "per_route":
                if not route["auth"]:
                    res.findings.append(self._no_auth(route, seq))
                    # No identity makes every question below it moot.
                    continue
            elif _is_public(route["path"], public) and route["method"] in WRITE_METHODS:
                #  Under a global middleware the only unauthenticated routes are
                #  the allowlisted ones. An allowlisted *write* is the finding.
                res.findings.append(self._public_write(route, seq, model))
                continue

            if route["method"] in WRITE_METHODS and not route["permission"]:
                res.findings.append(self._no_permission(route, seq))

            #  Only worth raising where nothing below the router guarantees
            #  scope. With a ContextVar bound by middleware and repositories
            #  filtering on it, a router signature carrying no org id is the
            #  design working, not a gap.
            if (
                tenant_model == "none"
                and route["path_params"]
                and not route["tenant_context"]
            ):
                res.findings.append(self._no_tenant_scope(route, seq))

        return res

    def _public_write(self, route: dict, seq: _Counter, model: dict) -> Finding:
        return Finding(
            id=f"ARCH-PUBWRITE-{seq.next():03d}",
            agent="architecture",
            severity=Severity.HIGH,
            category="authentication",
            title=(
                f"{route['method']} {route['path']} is a write reachable without "
                f"authentication"
            ),
            location=Location(route["file"], route["line"]),
            evidence=(
                f"The auth middleware ({model.get('auth_middleware')}) exempts this "
                f"path via its public allowlist {list(model.get('public_allowlist', []))}, "
                f"and {route['handler']} accepts {route['method']}."
            ),
            impact=(
                "An unauthenticated caller can invoke a state-changing endpoint. "
                "Whether that is intended depends on the endpoint; login and "
                "signup are, most others are not."
            ),
            requirement_type=RequirementType.SECURITY,
            recommendation=(
                "Confirm each allowlisted write is deliberately public, and that "
                "it is rate-limited and does not accept a tenant identifier from "
                "the caller."
            ),
            confidence=0.7,
            verification_test=(
                f"Call {route['method']} {route['path']} with no Authorization "
                f"header and confirm the response is the intended public behaviour."
            ),
        )

    # -- findings ------------------------------------------------------

    def _no_auth(self, route: dict, seq: _Counter) -> Finding:
        deps = ", ".join(route["deps"]) or "no dependencies"
        return Finding(
            id=f"ARCH-AUTH-{seq.next():03d}",
            agent="architecture",
            severity=Severity.CRITICAL,
            category="authentication",
            title=f"{route['method']} {route['path']} takes no authenticated identity",
            location=Location(route["file"], route["line"]),
            evidence=(
                f"The handler {route['handler']} declares no dependency on an "
                f"authenticated caller. Signature and route dependencies resolve "
                f"to: {deps}."
            ),
            impact=(
                "The endpoint is reachable without credentials. If it reads or "
                "writes tenant data, that data is public."
            ),
            requirement_type=RequirementType.SECURITY,
            recommendation=(
                "Add the project's authenticated-identity dependency, or record "
                "the route in PUBLIC_BY_DESIGN with the reason it is public."
            ),
            confidence=0.9,
            verification_test=(
                f"Call {route['method']} {route['path']} with no Authorization "
                f"header; expect 401."
            ),
        )

    def _no_permission(self, route: dict, seq: _Counter) -> Finding:
        return Finding(
            id=f"ARCH-AUTHZ-{seq.next():03d}",
            agent="architecture",
            severity=Severity.HIGH,
            category="authorization",
            title=f"{route['method']} {route['path']} declares no permission",
            location=Location(route["file"], route["line"]),
            evidence=(
                f"{route['handler']} authenticates, but no permission dependency "
                f"appears among {route['deps']}."
            ),
            impact=(
                "Authentication is not authorization. Any signed-in member of any "
                "role can perform this write."
            ),
            requirement_type=RequirementType.SECURITY,
            recommendation=(
                "Declare the permission this write requires, so the role matrix "
                "governs it rather than the absence of a check."
            ),
            confidence=0.85,
            verification_test=(
                f"Authenticate as the lowest-privilege role and call "
                f"{route['method']} {route['path']}; expect 403."
            ),
        )

    def _no_tenant_scope(self, route: dict, seq: _Counter) -> Finding:
        return Finding(
            id=f"ARCH-TENANT-{seq.next():03d}",
            agent="architecture",
            severity=Severity.HIGH,
            category="tenant_isolation",
            title=(
                f"{route['method']} {route['path']} takes an object id with no "
                f"organization scope in its signature"
            ),
            location=Location(route["file"], route["line"]),
            evidence=(
                f"{route['handler']} accepts path parameter(s) "
                f"{route['path_params']} and no organization or tenant dependency "
                f"is visible in its signature. Ownership may still be enforced in "
                f"the service or repository layer; static analysis cannot see that."
            ),
            impact=(
                "If ownership is not enforced below this layer, an authenticated "
                "user can read or mutate another tenant's record by id (8.2)."
            ),
            requirement_type=RequirementType.SECURITY,
            recommendation=(
                "Confirm the repository applies the organization predicate, and "
                "cover it with a cross-tenant test rather than with a review."
            ),
            #  Low on purpose. A signature is weak evidence and the scoping
            #  usually lives one layer down. This finding exists to produce a
            #  list for the dynamic test, not to accuse the code.
            confidence=0.35,
            verification_test=(
                "Create the record as organization A, authenticate as B, request "
                "it by id; expect 403 or 404, never 200."
            ),
        )

    # -- parsing -------------------------------------------------------

    def _registered(self) -> list[str]:
        """Routers actually mounted on the app. A router file nobody includes is
        dead surface, and its routes are not part of the attack surface."""
        out = []
        for _, _, line in self.grep(r"include_router\(", ".py", under="api"):
            head = line.split("include_router(", 1)[1]
            out.append(head.split(")")[0].strip())
        return sorted(set(out))

    def _collect(self) -> list[dict]:
        routes: list[dict] = []
        for path in self.config.walk(".py", under="api/routers"):
            try:
                source = path.read_text(encoding="utf-8", errors="replace")
                tree = ast.parse(source)
            except (OSError, SyntaxError):
                continue
            prefix = self._prefix(tree)
            rel = self.config.rel(path)
            for node in ast.walk(tree):
                if not isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef):
                    continue
                for deco in node.decorator_list:
                    parsed = self._route_from(deco)
                    if parsed is None:
                        continue
                    method, sub = parsed
                    full = (prefix + sub) or "/"
                    if full != "/" and full.endswith("/"):
                        full = full[:-1]
                    deps = self._dependencies(node, deco)
                    blob = " ".join(deps)
                    routes.append(
                        {
                            "method": method,
                            "path": full,
                            "file": rel,
                            "line": node.lineno,
                            "handler": node.name,
                            "deps": deps,
                            "auth": any(m in blob for m in AUTH_MARKERS),
                            "permission": any(m in blob for m in PERMISSION_MARKERS),
                            "tenant_context": any(m in blob for m in TENANT_MARKERS),
                            "path_params": [
                                seg[1:-1]
                                for seg in full.split("/")
                                if seg.startswith("{") and seg.endswith("}")
                            ],
                        }
                    )
        return sorted(routes, key=lambda r: (r["path"], r["method"]))

    @staticmethod
    def _prefix(tree: ast.Module) -> str:
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call):
                continue
            fn = node.func
            if isinstance(fn, ast.Name) and fn.id == "APIRouter":
                for kw in node.keywords:
                    if kw.arg == "prefix" and isinstance(kw.value, ast.Constant):
                        return str(kw.value.value)
        return ""

    @staticmethod
    def _route_from(deco: ast.expr) -> tuple[str, str] | None:
        if not isinstance(deco, ast.Call):
            return None
        fn = deco.func
        if not isinstance(fn, ast.Attribute) or fn.attr not in HTTP_METHODS:
            return None
        if not deco.args or not isinstance(deco.args[0], ast.Constant):
            return None
        return fn.attr.upper(), str(deco.args[0].value)

    @staticmethod
    def _dependencies(
        node: ast.FunctionDef | ast.AsyncFunctionDef, deco: ast.Call
    ) -> list[str]:
        """Every name reachable from the signature defaults and annotations, plus
        the decorator's own `dependencies=[...]` where route-level guards live."""
        found: list[str] = []

        def names(expr: ast.expr | None) -> None:
            if expr is None:
                return
            for sub in ast.walk(expr):
                if isinstance(sub, ast.Name):
                    found.append(sub.id)
                elif isinstance(sub, ast.Attribute):
                    found.append(sub.attr)
                elif isinstance(sub, ast.Constant) and isinstance(sub.value, str):
                    found.append(sub.value)

        for default in list(node.args.defaults) + list(node.args.kw_defaults):
            names(default)
        for arg in list(node.args.args) + list(node.args.kwonlyargs):
            names(arg.annotation)
        for kw in deco.keywords:
            if kw.arg == "dependencies":
                names(kw.value)
        return sorted(set(found))


def _is_public(path: str, allowlist: tuple[str, ...]) -> bool:
    """Mirror of the usual middleware rule: exact match, or prefix match for an
    entry that ends in a separator."""
    for entry in allowlist:
        if entry.endswith("/") and entry != "/":
            if path.startswith(entry):
                return True
        elif path == entry:
            return True
    return False


class _Counter:
    """Findings need stable, unique ids within one scanner run."""

    def __init__(self) -> None:
        self._n = 0

    def next(self) -> int:
        self._n += 1
        return self._n
