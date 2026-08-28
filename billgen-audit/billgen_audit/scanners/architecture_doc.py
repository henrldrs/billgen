"""Documentation drift — `docs/ARCHITECTURE/system-architecture.html` vs. the tree.

The specification's §1 says evidence first and §14 asks for a current-state
architecture. A hand-maintained architecture document is the most confident
liar in any repository: it was true when written, nothing re-reads it, and every
later decision is taken against a picture that has quietly stopped matching the
code.

So this scanner treats the architecture document as a set of *claims* and the
repository as the evidence, and reports only where they disagree. It is
deliberately narrow. It compares the two things the document states precisely
enough to be checkable:

  1. the endpoint inventory  -- every "GET /x" the document names
  2. the repo map            -- every directory the document says exists

Prose is not checked. A claim like "the gap is transmission, not validation"
cannot be falsified by a regex, and pretending otherwise would put the tool's
worst output next to its best.

Both directions matter, and they fail differently:

  documented but absent   the document describes an endpoint nobody can call.
                          Anyone planning against it plans against fiction.
  present but undocumented  the surface has outgrown its own map. Lower
                          severity, because shipping ahead of the docs is
                          normal, but it is how a document stops being read.
"""

from __future__ import annotations

import html
import re

from ..findings import Finding, Location, RequirementType, Severity
from ..report import architecture as archsync
from .base import Scanner, ScanResult

_TAG = re.compile(r"<[^>]+>")
_ENDPOINT = re.compile(
    r"\b(GET|POST|PUT|PATCH|DELETE)\s+(/[A-Za-z0-9{}/_.-]*)"
)
#  Paths in the document are written for humans: /invoices/{id}. The router
#  writes /invoices/{invoice_id}. Comparing them literally would report every
#  parameterised route as drift, so both sides are normalised to /invoices/{}.
_PARAM = re.compile(r"\{[^}]*\}")


def _normalise(path: str) -> str:
    path = _PARAM.sub("{}", path.rstrip("/") or "/")
    return path


class ArchitectureDocScanner(Scanner):
    name = "architecture_doc"
    phase = 5
    agent = "architecture"

    def run(self, prior: dict) -> ScanResult:
        res = ScanResult()
        doc = self.config.architecture_doc

        if doc is None or not doc.exists():
            res.not_assessed.append(
                "Architecture document: none found at "
                "docs/ARCHITECTURE/system-architecture.html, so no current-state "
                "documentation could be checked against the tree (14)."
            )
            return res

        rel = self.config.rel(doc)
        text = doc.read_text(encoding="utf-8", errors="replace")
        plain = html.unescape(_TAG.sub(" ", text))

        claimed = self._claimed_endpoints(plain)
        actual = self._actual_endpoints(prior)

        if not actual:
            res.not_assessed.append(
                "Architecture document: the route scanner found no endpoints, so "
                "the document's endpoint inventory could not be compared."
            )
            return res

        documented_absent = sorted(claimed - actual)
        undocumented = sorted(actual - claimed)

        summary = {
            "document": rel,
            "claimed_endpoints": sorted(claimed),
            "actual_endpoints": sorted(actual),
            "documented_but_absent": documented_absent,
            "present_but_undocumented": undocumented,
            "claimed_directories": [],
            "missing_directories": [],
        }

        seq = 0

        #  Once the document carries generator markers, the generated block is
        #  the authoritative statement of what exists, and the two findings
        #  below change meaning:
        #
        #    - every real route is in the block, so "present but undocumented"
        #      is structurally impossible and reporting it would be noise.
        #    - an endpoint named only in the prose is usually a *deliberate gap
        #      mention* ("no POST /email/test yet"), not a false claim. It drops
        #      to INFORMATIONAL: worth a human eye, not worth a MEDIUM.
        #
        #  What replaces them is a real check — whether the generated block is
        #  still in sync with the tree.
        generated = archsync.markers_present(doc)
        if generated:
            in_sync, notes = archsync.sync(self.config, check=True)
            summary["generated_block_in_sync"] = in_sync
            if not in_sync:
                seq += 1
                res.findings.append(
                    Finding(
                        id=f"ARCH-DOC-{seq:03d}",
                        agent="architecture",
                        severity=Severity.MEDIUM,
                        category="documentation_drift",
                        title="The document's generated blocks are stale",
                        location=Location(rel),
                        evidence="; ".join(notes),
                        impact=(
                            "The endpoint inventory and the file counts are "
                            "generated precisely so they cannot drift. Stale means "
                            "someone edited the tree and did not re-run the "
                            "generator, so the document is lying again in exactly "
                            "the place this mechanism was built to prevent."
                        ),
                        requirement_type=RequirementType.RECOMMENDATION,
                        recommendation=(
                            "Run `python -m billgen_audit sync-architecture`, and "
                            "consider running it in the same hook that runs the "
                            "tests."
                        ),
                        confidence=1.0,
                        verification_test=(
                            "`python -m billgen_audit sync-architecture --check` "
                            "exits 0."
                        ),
                    )
                )

        if documented_absent:
            seq += 1
            res.findings.append(
                Finding(
                    id=f"ARCH-DOC-{seq:03d}",
                    agent="architecture",
                    severity=(
                        Severity.INFORMATIONAL if generated else Severity.MEDIUM
                    ),
                    category="documentation_drift",
                    title=(
                        f"{len(documented_absent)} endpoint(s) documented in "
                        f"system-architecture.html do not exist in the router tree"
                    ),
                    location=Location(rel),
                    evidence=(
                        "The document names these, and no registered route matches "
                        "after parameter normalisation: "
                        + ", ".join(documented_absent[:20])
                        + ("..." if len(documented_absent) > 20 else "")
                    ),
                    impact=(
                        (
                            "These appear only in prose, not in the generated "
                            "inventory, so most will be deliberate gap mentions "
                            "rather than false claims. Each still deserves one "
                            "human glance: a route named with the wrong path reads "
                            "exactly the same as a route that does not exist yet."
                        )
                        if generated
                        else (
                            "The architecture document is the stated source of truth "
                            "for planning. Endpoints it describes that nobody can "
                            "call turn into roadmap items believed to be done, and "
                            "into frontend work written against a contract that was "
                            "never shipped."
                        )
                    ),
                    requirement_type=RequirementType.RECOMMENDATION,
                    recommendation=(
                        "Either mark each as planned rather than built, or delete it. "
                        "A document that mixes both without saying which is which "
                        "cannot be used for either purpose."
                    ),
                    confidence=0.3 if generated else 0.75,
                    verification_test=(
                        "Re-run this audit; documented_but_absent should be empty or "
                        "explicitly annotated as planned."
                    ),
                )
            )

        #  Suppressed once the inventory is generated: every registered route is
        #  in the block by construction, so this can only fire as a false alarm.
        if undocumented and not generated:
            seq += 1
            res.findings.append(
                Finding(
                    id=f"ARCH-DOC-{seq:03d}",
                    agent="architecture",
                    severity=Severity.LOW,
                    category="documentation_drift",
                    title=(
                        f"{len(undocumented)} registered endpoint(s) appear nowhere "
                        f"in system-architecture.html"
                    ),
                    location=Location(rel),
                    evidence=(
                        "Registered and undocumented: "
                        + ", ".join(undocumented[:20])
                        + ("..." if len(undocumented) > 20 else "")
                    ),
                    impact=(
                        "The document's endpoint inventory is presented as complete. "
                        "Where it is not, a reader cannot tell absence-from-the-doc "
                        "from absence-from-the-product, which is the property that "
                        "made it worth maintaining."
                    ),
                    requirement_type=RequirementType.RECOMMENDATION,
                    recommendation=(
                        "Generate the inventory section from the router tree instead "
                        "of maintaining it by hand. This scanner already produces the "
                        "list; the document can consume it."
                    ),
                    confidence=0.8,
                    verification_test="Re-run; present_but_undocumented should shrink.",
                )
            )

        # -- repo map -------------------------------------------------
        claimed_dirs = self._claimed_directories(plain)
        missing = sorted(
            d for d in claimed_dirs if not (self.config.target / d).exists()
        )
        summary["claimed_directories"] = sorted(claimed_dirs)
        summary["missing_directories"] = missing
        if missing:
            seq += 1
            res.findings.append(
                Finding(
                    id=f"ARCH-DOC-{seq:03d}",
                    agent="architecture",
                    severity=Severity.LOW,
                    category="documentation_drift",
                    title=(
                        f"The repo map names {len(missing)} director(ies) that are "
                        f"not in the tree"
                    ),
                    location=Location(rel),
                    evidence="Named in the document, absent on disk: " + ", ".join(missing),
                    impact=(
                        "The repo map is the section a newcomer reads first. Entries "
                        "that no longer exist send them looking for code that was "
                        "moved or deleted."
                    ),
                    requirement_type=RequirementType.RECOMMENDATION,
                    recommendation="Remove or re-point the stale entries.",
                    confidence=0.7,
                    verification_test="Re-run; missing_directories should be empty.",
                )
            )

        self.evidence.record("architecture-doc-drift", summary)
        res.observations["architecture_doc"] = {
            k: v
            for k, v in summary.items()
            if k.startswith(("document", "documented", "present", "missing"))
        }
        return res

    # ------------------------------------------------------------------

    @staticmethod
    def _claimed_endpoints(plain: str) -> set[str]:
        out = set()
        for method, path in _ENDPOINT.findall(plain):
            #  "/" alone and bare doc anchors are not endpoint claims.
            if path in ("/", ""):
                continue
            out.add(f"{method} {_normalise(path)}")
        return out

    def _actual_endpoints(self, prior: dict) -> set[str]:
        routes = prior.get("routes") or []
        return {f"{r['method']} {_normalise(r['path'])}" for r in routes}

    def _claimed_directories(self, plain: str) -> set[str]:
        """Repo-path tokens the document names, e.g. `core/pdf/`.

        Two restrictions, both learned from false positives:

        * at least one separator *inside* the token. A repo map rendered as a
          tree prints leaf names alone (`pdf/`, `routers/`) with the parent
          implied by indentation that survives no HTML-to-text conversion.
          Resolving those against the repo root reports every nested package as
          missing, which is the scanner being wrong, not the document.
        * no path segment that only exists in prose. `http://` and version
          strings both match a naive path pattern.
        """
        out = set()
        for token in re.findall(r"\b([a-z][a-z0-9_.-]*(?:/[a-z0-9_.-]+)+)/(?=[\s<]|$)", plain):
            if token.count("/") > 3 or token.startswith(("http", "www")):
                continue
            if any(part in self.config.excluded for part in token.split("/")):
                continue
            out.add(token)
        return out
