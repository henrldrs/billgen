"""What every deterministic scanner is.

§1: *deterministic checks before LLM reasoning*. Everything in this package
runs without a model, produces the same output for the same tree, and either
emits a finding with a file behind it or emits nothing. A scanner that wants to
reason about intent is in the wrong layer — that is what `agents/` is for.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from ..config import AuditConfig
from ..evidence import EvidenceStore
from ..findings import Finding


@dataclass
class ScanResult:
    findings: list[Finding] = field(default_factory=list)
    #  Facts for the agent layer and the report: route inventories, dependency
    #  tables, detected frameworks. Not findings — the raw observation.
    observations: dict = field(default_factory=dict)
    #  §1 'absence of evidence is not evidence of compliance'. A scanner that
    #  could not look says so here, and the report prints it rather than
    #  scoring the area as clean.
    not_assessed: list[str] = field(default_factory=list)


class Scanner:
    name: str = "scanner"
    phase: int = 2
    agent: str = "architecture"

    def __init__(self, config: AuditConfig, evidence: EvidenceStore) -> None:
        self.config = config
        self.evidence = evidence

    def run(self, prior: dict) -> ScanResult:  # pragma: no cover - interface
        raise NotImplementedError

    # -- helpers every scanner ends up wanting -----------------------------

    def grep(
        self, pattern: str, *suffixes: str, under: str = "", flags: int = 0
    ) -> list[tuple[str, int, str]]:
        """(relative_path, 1-indexed line, line text) for every match.

        MULTILINE is always on. This helper is line-oriented -- a pattern
        anchored with `^` means "at the start of a line", which is what every
        caller writing `^\\s*def ` intends. Without it the whole-file prefilter
        below anchors to the start of the *file* and silently drops every match,
        which is the worst kind of bug in an audit tool: it reports a clean
        result for a check that never ran.
        """
        rx = re.compile(pattern, flags | re.MULTILINE)
        hits: list[tuple[str, int, str]] = []
        for path in self.config.walk(*suffixes, under=under):
            try:
                text = path.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue
            if not rx.search(text):
                continue
            for n, line in enumerate(text.splitlines(), start=1):
                if rx.search(line):
                    hits.append((self.config.rel(path), n, line.strip()))
        return hits

    def exists(self, *relatives: str) -> str | None:
        for rel in relatives:
            if (self.config.target / rel).exists():
                return rel
        return None
