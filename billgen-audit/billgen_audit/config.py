"""What an audit is pointed at.

The target is a path, never an import. `billgen_audit` does not import BillGen
and BillGen does not import `billgen_audit` — the engine reads the target as
text on disk, which is what lets it audit a checkout it cannot even install.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

# The engine lives at <repo>/billgen-audit/billgen_audit/config.py, so the
# default target is two parents up. Override with --target for a copy elsewhere.
_DEFAULT_TARGET = Path(__file__).resolve().parents[2]


@dataclass
class AuditConfig:
    target: Path
    audits_dir: Path
    architecture_doc: Path | None = None
    #  Directories that are not the product: vendored code, build output and
    #  caches. Scanning them produces findings nobody can act on.
    excluded: tuple[str, ...] = (
        "node_modules", ".git", "__pycache__", ".venv", "venv", "dist", "build",
        ".mypy_cache", ".pytest_cache", ".ruff_cache", "var", "backups",
        "billgen-audit",  # the auditor is not the audited
        #  Agent worktrees are stale copies of the product. Scanning them
        #  double-counts every finding and pins them to paths that will not
        #  exist next week.
        "worktrees",
    )
    #  §8.6 performance testing and §8.5 restore drills mutate a running system.
    #  They stay off until a human passes --authorize-dynamic, because "run the
    #  audit" must never mean "load-test whatever this points at".
    authorize_dynamic: bool = False
    notes: dict = field(default_factory=dict)

    @classmethod
    def load(cls, target: str | None = None, audits_dir: str | None = None) -> AuditConfig:
        root = Path(target).resolve() if target else _DEFAULT_TARGET
        here = Path(__file__).resolve().parents[1]
        cfg = cls(
            target=root,
            audits_dir=Path(audits_dir).resolve() if audits_dir else here / "audits",
        )
        arch = root / "docs" / "ARCHITECTURE" / "system-architecture.html"
        if arch.exists():
            cfg.architecture_doc = arch
        # An optional audit.config.json beside the engine overrides the above.
        override = here / "audit.config.json"
        if override.exists():
            data = json.loads(override.read_text(encoding="utf-8"))
            if "architecture_doc" in data:
                cfg.architecture_doc = root / data["architecture_doc"]
            cfg.notes = data.get("notes", {})
        return cfg

    def rel(self, path: Path) -> str:
        try:
            return path.resolve().relative_to(self.target).as_posix()
        except ValueError:
            return path.as_posix()

    def is_excluded(self, path: Path) -> bool:
        return any(part in self.excluded for part in path.parts)

    def walk(self, *suffixes: str, under: str = "") -> list[Path]:
        """Every source file of the given suffixes, skipping `excluded`."""
        base = self.target / under if under else self.target
        if not base.exists():
            return []
        out: list[Path] = []
        for path in base.rglob("*"):
            if not path.is_file() or self.is_excluded(path.relative_to(self.target)):
                continue
            if suffixes and path.suffix not in suffixes:
                continue
            out.append(path)
        return sorted(out)

    def read(self, relative: str) -> str | None:
        path = self.target / relative
        if not path.exists() or not path.is_file():
            return None
        return path.read_text(encoding="utf-8", errors="replace")
