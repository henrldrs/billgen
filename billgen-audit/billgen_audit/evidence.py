"""The evidence store (§1 'evidence first', §18).

A finding whose evidence was a string in a log line cannot be re-verified six
months later. Everything a scanner observed is written to
`audits/audit-NNN/evidence/` as a file, and findings point at it.
"""

from __future__ import annotations

import json
from pathlib import Path


class EvidenceStore:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)
        self._index: dict[str, str] = {}

    def record(self, name: str, content: str | dict | list) -> str:
        """Persist one artifact and return the audit-relative path to cite."""
        if isinstance(content, str):
            path = self.root / f"{name}.txt"
            path.write_text(content, encoding="utf-8")
        else:
            path = self.root / f"{name}.json"
            path.write_text(json.dumps(content, indent=2, ensure_ascii=False), encoding="utf-8")
        rel = f"evidence/{path.name}"
        self._index[name] = rel
        return rel

    def get(self, name: str) -> str | None:
        return self._index.get(name)

    def manifest(self) -> dict[str, str]:
        return dict(self._index)
