"""The code-structure section of the architecture document, generated.

A hand-drawn architecture diagram is a picture of what someone intended. This
one is a picture of what the imports actually do: the layer arrows carry counts
taken from the AST, and the rule ADR-0001 states — that `core/` imports neither
`api/` nor `db/` — is *checked* here rather than asserted, so the diagram cannot
keep claiming a boundary that has been breached.

The directory table is `git ls-files`, so it counts tracked files and nothing
else. A tree built by walking the filesystem would include `__pycache__`, build
output and whatever a dev server left behind, and the numbers would move without
anyone changing the code.
"""

from __future__ import annotations

import ast
import collections
import html
import subprocess
from pathlib import Path

from ..config import AuditConfig

#  The layers, in dependency order — each may import only from those after it.
#  This is the ADR-0001 model, and the only place it is written down as data.
LAYERS: list[tuple[str, str, str]] = [
    ("frontend", "Frontends", "L3 · L4 — what a person sees"),
    ("api", "api/", "L2 — HTTP boundary, authorization, entitlements"),
    ("db", "db/", "persistence — SQLAlchemy rows and migrations"),
    ("core", "core/", "L1 — domain logic, no framework imports"),
]

PY_LAYERS = ("core", "api", "db")


def tracked_files(config: AuditConfig) -> list[str]:
    try:
        proc = subprocess.run(
            ["git", "ls-files"], cwd=config.target, capture_output=True,
            text=True, timeout=30, check=False,
        )
    except (OSError, subprocess.SubprocessError):
        return []
    return [line for line in proc.stdout.splitlines() if line.strip()]


def cross_layer_imports(config: AuditConfig) -> dict[tuple[str, str], int]:
    """Absolute imports that cross a layer boundary, counted from the AST.

    Relative imports are skipped deliberately: `from ..models import X` inside
    `core/` cannot leave `core/`, so it is not a boundary crossing and counting
    it would drown the real edges.
    """
    edges: collections.Counter[tuple[str, str]] = collections.Counter()
    for layer in PY_LAYERS:
        root = config.target / layer
        if not root.exists():
            continue
        for path in root.rglob("*.py"):
            if config.is_excluded(path.relative_to(config.target)):
                continue
            try:
                tree = ast.parse(path.read_text(encoding="utf-8", errors="replace"))
            except (OSError, SyntaxError):
                continue
            for node in ast.walk(tree):
                modules: list[str] = []
                if isinstance(node, ast.Import):
                    modules = [alias.name for alias in node.names]
                elif isinstance(node, ast.ImportFrom) and node.module and node.level == 0:
                    modules = [node.module]
                for module in modules:
                    top = module.split(".")[0]
                    if top in PY_LAYERS and top != layer:
                        edges[(layer, top)] += 1
    return dict(edges)


def directory_counts(files: list[str]) -> dict[str, int]:
    counts: collections.Counter[str] = collections.Counter()
    for path in files:
        parts = path.split("/")
        if len(parts) == 1:
            counts["(root)"] += 1
        elif len(parts) == 2:
            counts[parts[0]] += 1
        else:
            counts[f"{parts[0]}/{parts[1]}"] += 1
    return dict(counts)


def render(config: AuditConfig) -> str:
    files = tracked_files(config)
    edges = cross_layer_imports(config)
    counts = directory_counts(files)

    violations = [
        (a, b) for (a, b) in edges
        if a == "core" and b in ("api", "db")
    ]

    lines: list[str] = [
        '  <p class="lede">Generated from the tree by <code>billgen-audit</code> — '
        'the directory counts are <code>git ls-files</code>, and the arrows below '
        'are import edges counted from the AST. Regenerate with '
        '<code>python -m billgen_audit sync-architecture</code>.</p>',
    ]

    # -- the layer diagram ------------------------------------------------
    lines.append('  <div class="layerdiagram">')
    for key, label, blurb in LAYERS:
        #  "frontend" is not a directory — it is the three packages that make
        #  up L3/L4 plus the design system they all consume.
        if key == "frontend":
            total = sum(
                n
                for path, n in counts.items()
                if path.startswith(("frontend-", "henrioutai-"))
            )
        else:
            total = sum(
                n for path, n in counts.items() if path.split("/")[0] == key
            )
        lines.append(
            f'    <div class="layerdiagram__row" data-layer="{html.escape(key)}">'
            f'<span class="layerdiagram__name"><code>{html.escape(label)}</code></span>'
            f'<span class="layerdiagram__blurb">{html.escape(blurb)}</span>'
            f'<span class="layerdiagram__n">{total}</span></div>'
        )
        if key != "core":
            lines.append('    <div class="layerdiagram__arrow" aria-hidden="true">↓</div>')
    lines.append("  </div>")

    # -- what the imports actually do -------------------------------------
    lines.append('  <div class="tw"><table>')
    lines.append(
        "    <thead><tr><th>Import edge</th><th class=\"num\">Count</th>"
        "<th>Allowed by ADR-0001</th></tr></thead><tbody>"
    )
    for (source, target) in sorted(edges):
        allowed = source != "core"
        badge = (
            '<span class="chip c-done">yes</span>'
            if allowed
            else '<span class="chip c-gap">NO — boundary breached</span>'
        )
        lines.append(
            f'      <tr><td><code>{source}/</code> &rarr; <code>{target}/</code></td>'
            f'<td class="num">{edges[(source, target)]}</td><td>{badge}</td></tr>'
        )
    for forbidden in (("core", "api"), ("core", "db")):
        if forbidden not in edges:
            lines.append(
                f'      <tr><td><code>{forbidden[0]}/</code> &rarr; '
                f'<code>{forbidden[1]}/</code></td><td class="num">0</td>'
                f'<td><span class="chip c-done">held</span></td></tr>'
            )
    lines.append("    </tbody></table></div>")

    if violations:
        lines.append(
            '  <div class="note note--stop"><p><strong>ADR-0001 is breached.</strong> '
            "<code>core/</code> imports from a layer above it, which means the domain "
            "can no longer be tested, reused or reasoned about without the web "
            "framework it was written to be independent of.</p></div>"
        )
    else:
        lines.append(
            '  <div class="note"><p><strong>The boundary holds.</strong> '
            "<code>core/</code> imports neither <code>api/</code> nor <code>db/</code> — "
            "checked here rather than asserted, so this sentence stops being printed "
            "the day it stops being true.</p></div>"
        )

    # -- the directory table ----------------------------------------------
    lines.append("  <h3>Every tracked directory</h3>")
    lines.append('  <div class="tw"><table>')
    lines.append('    <thead><tr><th>Path</th><th class="num">Files</th></tr></thead><tbody>')
    for path in sorted(counts):
        if path == "(root)":
            continue
        depth = path.count("/")
        indent = "&nbsp;&nbsp;&nbsp;&nbsp;" * depth
        lines.append(
            f'      <tr><td><code>{indent}{html.escape(path.split("/")[-1])}/</code></td>'
            f'<td class="num">{counts[path]}</td></tr>'
        )
    lines.append(
        f'      <tr><td><em>files at the repository root</em></td>'
        f'<td class="num">{counts.get("(root)", 0)}</td></tr>'
    )
    lines.append(
        f'      <tr><td><strong>Total tracked</strong></td>'
        f'<td class="num"><strong>{len(files)}</strong></td></tr>'
    )
    lines.append("    </tbody></table></div>")

    return "\n".join(lines)


def markers_present(doc: Path) -> bool:
    if not doc.exists():
        return False
    return "<!-- GENERATED:structure -->" in doc.read_text(encoding="utf-8", errors="replace")
