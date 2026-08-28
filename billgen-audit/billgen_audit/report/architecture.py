"""Keeping the target's architecture document from drifting (spec §14).

The audit's `architecture_doc` scanner reports drift. This module removes the
cause of most of it.

The split it enforces: **a fact a machine can compute is generated; a judgement
is written by a person.** The endpoint inventory and the file counts drifted
because they are facts maintained by hand — 8 endpoints documented that no
longer exist, 50 registered that were never written down. The verdicts beside
them ("still no UI", "B3 closed") did not drift, because judgement does not go
stale the way a route table does.

So this writes two kinds of thing into the document and touches nothing else:

  <!-- GENERATED:endpoints --> ... <!-- /GENERATED:endpoints -->
      a block replaced wholesale

  <span data-fact="endpoint_count">70</span>
      a single number replaced in place, wherever it appears in the prose

Everything outside those markers is left byte-for-byte alone. `--check` reports
staleness without writing, so the audit can fail on it rather than a person
having to notice months later.
"""

from __future__ import annotations

import html
import re
import subprocess
from pathlib import Path

from ..config import AuditConfig
from ..evidence import EvidenceStore
from ..scanners.routes import RouteScanner
from . import structure

_BLOCK = "<!-- GENERATED:{name} -->"
_BLOCK_END = "<!-- /GENERATED:{name} -->"


def collect_facts(config: AuditConfig) -> dict:
    """Every number the document states that a machine can verify."""
    evidence = EvidenceStore(config.audits_dir / "_sync" / "evidence")
    routes = RouteScanner(config, evidence)._collect()

    routers = sorted({r["file"] for r in routes})
    facts = {
        "endpoint_count": len(routes),
        "router_count": len(routers),
        "tracked_files": _tracked(config, "."),
    }
    for directory in (
        "core", "api", "db", "tests", "henrioutai-ui", "frontend-react",
        "frontend-saas", "frontend-electron", "docs", "billgen-audit",
    ):
        facts[f"files_{directory.replace('-', '_')}"] = _tracked(config, directory)
    return facts, routes


def _tracked(config: AuditConfig, path: str) -> int:
    try:
        proc = subprocess.run(
            ["git", "ls-files", path], cwd=config.target,
            capture_output=True, text=True, timeout=30, check=False,
        )
    except (OSError, subprocess.SubprocessError):
        return 0
    return len([line for line in proc.stdout.splitlines() if line.strip()])


def render_endpoints(routes: list[dict]) -> str:
    """The complete registered surface, grouped by the router file that owns it.

    Deliberately *not* the verdict table beside it. This one answers "what can be
    called", exhaustively and without opinion; the human table answers "how good
    is it", which is the part worth writing by hand.
    """
    by_router: dict[str, list[dict]] = {}
    for route in routes:
        by_router.setdefault(route["file"], []).append(route)

    lines = [
        '  <p class="lede">Generated from the router tree by '
        '<code>billgen-audit</code>. Do not edit by hand — run '
        '<code>python -m billgen_audit sync-architecture</code>. '
        'The verdicts in the table above are written by a person and are not '
        'touched by the generator.</p>',
        '  <div class="tw">',
        "    <table>",
        "      <thead><tr><th>Router</th><th class=\"num\">n</th>"
        "<th>Registered endpoints</th></tr></thead>",
        "      <tbody>",
    ]
    for router in sorted(by_router):
        entries = sorted(by_router[router], key=lambda r: (r["path"], r["method"]))
        cells = " · ".join(
            f"<code>{html.escape(r['method'])} {html.escape(r['path'])}</code>"
            for r in entries
        )
        short = router.rsplit("/", 1)[-1].removesuffix(".py")
        lines.append(
            f'        <tr><td><code>{html.escape(short)}</code></td>'
            f'<td class="num">{len(entries)}</td>'
            f'<td class="ev">{cells}</td></tr>'
        )
    lines += ["      </tbody>", "    </table>", "  </div>"]
    return "\n".join(lines)


def apply(text: str, blocks: dict[str, str], facts: dict) -> str:
    """Replace each generated block and each data-fact span. Nothing else."""
    for name, body in blocks.items():
        start, end = _BLOCK.format(name=name), _BLOCK_END.format(name=name)
        pattern = re.compile(
            re.escape(start) + r".*?" + re.escape(end), re.DOTALL
        )
        if not pattern.search(text):
            continue
        #  A callable replacement, bound eagerly: `re.sub` treats backslashes in
        #  a replacement *string* as group references, and generated HTML can
        #  contain them. The default arguments bind this iteration's values
        #  rather than the loop variable's final ones.
        text = pattern.sub(
            lambda _, s=start, b=body, e=end: f"{s}\n{b}\n{e}", text
        )

    def fact(match: re.Match) -> str:
        key = match.group(1)
        if key not in facts:
            return match.group(0)
        return f'<span data-fact="{key}">{facts[key]}</span>'

    return re.sub(r'<span data-fact="([a-z_]+)">[^<]*</span>', fact, text)


def sync(config: AuditConfig, *, check: bool = False) -> tuple[bool, list[str]]:
    """Returns (in_sync, notes). With check=False the document is rewritten."""
    doc = config.architecture_doc
    if doc is None or not doc.exists():
        return True, ["No architecture document configured; nothing to sync."]

    facts, routes = collect_facts(config)
    before = doc.read_text(encoding="utf-8")
    after = apply(
        before,
        {
            "endpoints": render_endpoints(routes),
            "structure": structure.render(config),
        },
        facts,
    )

    notes = [
        f"{facts['endpoint_count']} endpoints across {facts['router_count']} routers",
        f"{facts['tracked_files']} tracked files",
    ]
    if before == after:
        return True, notes + ["Document is in sync."]

    if not check:
        doc.write_text(after, encoding="utf-8")
        notes.append(f"Rewrote {config.rel(doc)}.")
    else:
        notes.append(
            f"{config.rel(doc)} is STALE — its generated blocks or data-fact "
            f"numbers no longer match the tree."
        )
    return False, notes


def markers_present(doc: Path) -> bool:
    """Whether the document has been prepared with generator markers at all."""
    if not doc.exists():
        return False
    text = doc.read_text(encoding="utf-8", errors="replace")
    return _BLOCK.format(name="endpoints") in text
