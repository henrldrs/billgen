"""Render `system-architecture.html` as plain text for pasting into an IDE or a chat.

`system-architecture.html.txt` used to be a byte-for-byte copy of the HTML with
a different extension. Two things were wrong with that, and both bit:

1. **Nothing regenerated it**, so it sat eleven commits stale while looking
   current — and a downstream analysis read it and reported defects that had
   already been fixed.
2. **A `.txt` cannot honour `<meta charset>`.** Editors open it as the system
   codepage, so every em-dash and box-drawing character in the repo map arrived
   as mojibake even when the file was current.

It also carried ~150 KB of CSS and JavaScript that nobody pasting an
architecture summary into a chat window wants to pay for.

This renders the *content*: headings, paragraphs, list items and tables, with
entities decoded and `<style>`/`<script>` dropped. The result is roughly a
third of the size and is actually readable as text.

    python scripts/architecture_to_text.py
    python scripts/architecture_to_text.py --check
"""

from __future__ import annotations

import argparse
import html
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "docs" / "ARCHITECTURE" / "system-architecture.html"
OUT = ROOT / "docs" / "ARCHITECTURE" / "system-architecture.html.txt"

_DROP = re.compile(r"<(script|style|svg)\b.*?</\1>", re.S | re.I)
_COMMENT = re.compile(r"<!--.*?-->", re.S)
_TAG = re.compile(r"<[^>]+>")
_WS = re.compile(r"[ \t]+")
_BLANKS = re.compile(r"\n{3,}")


def _text(fragment: str) -> str:
    """Tags out, entities in, whitespace collapsed — but newlines preserved."""
    #  <br> and </p> are the only tags that carry layout meaning in this
    #  document; everything else is styling.
    fragment = re.sub(r"<br\s*/?>", "\n", fragment, flags=re.I)
    txt = html.unescape(_TAG.sub("", fragment))
    return _WS.sub(" ", txt).strip()


def _render_table(block: str) -> str:
    rows: list[list[str]] = []
    for tr in re.findall(r"<tr\b[^>]*>(.*?)</tr>", block, re.S | re.I):
        cells = [_text(c) for c in re.findall(r"<t[dh]\b[^>]*>(.*?)</t[dh]>", tr, re.S | re.I)]
        if any(cells):
            rows.append(cells)
    if not rows:
        return ""

    width = max(len(r) for r in rows)
    rows = [r + [""] * (width - len(r)) for r in rows]
    natural = [max(len(r[i]) for r in rows) for i in range(width)]

    #  A grid only works while the columns are short. The evidence columns in
    #  §10 and §22 are whole sentences, and truncating them would throw away
    #  exactly the part worth pasting — the reason a status is what it is.
    #  So a prose-heavy table becomes records instead of losing content.
    if sum(natural) + 2 * width <= 100:

        def line(cells: list[str]) -> str:
            return "  ".join(c.ljust(natural[i]) for i, c in enumerate(cells)).rstrip()

        return "\n".join(
            [line(rows[0]), "  ".join("-" * c for c in natural)] + [line(r) for r in rows[1:]]
        )

    head, body = rows[0], rows[1:]
    out: list[str] = []
    for r in body:
        lead = " · ".join(c for c in r[:2] if c) or "—"
        out.append(lead)
        labels = head[2:] + [""] * max(0, len(r) - len(head))
        for label, cell in zip(labels, r[2:], strict=False):
            if cell:
                out += ["    " + ln for ln in _wrap(f"{label}: {cell}" if label else cell, 88)]
        out.append("")
    return "\n".join(out).rstrip()


def _wrap(text: str, width: int) -> list[str]:
    words, lines, cur = text.split(), [], ""
    for w in words:
        if cur and len(cur) + 1 + len(w) > width:
            lines.append(cur)
            cur = w
        else:
            cur = f"{cur} {w}".strip()
    if cur:
        lines.append(cur)
    return lines or [""]


def render() -> str:
    raw = SRC.read_text(encoding="utf-8")
    raw = _COMMENT.sub("", _DROP.sub("", raw))

    parts: list[str] = [
        "BillGen — System Architecture (plain-text rendering)",
        "=" * 62,
        "",
        f"Generated from {SRC.name} by scripts/architecture_to_text.py.",
        "Do not edit: regenerate. The HTML is the source of truth.",
        "",
    ]

    #  Walk the document in order, emitting only the elements that carry
    #  content. Tables are handled whole so their structure survives.
    pattern = re.compile(
        r"<table\b.*?</table>|<h([1-4])\b[^>]*>(.*?)</h\1>|<li\b[^>]*>(.*?)</li>"
        r"|<p\b[^>]*>(.*?)</p>|<pre\b[^>]*>(.*?)</pre>",
        re.S | re.I,
    )
    for m in pattern.finditer(raw):
        chunk = m.group(0)
        if chunk.lower().startswith("<table"):
            table = _render_table(chunk)
            if table:
                parts += ["", table, ""]
        elif m.group(1):
            level, body = int(m.group(1)), _text(m.group(2))
            if not body:
                continue
            rule = {1: "=", 2: "-"}.get(level)
            parts += ["", body] + ([rule * min(len(body), 62)] if rule else [])
        elif m.group(3) is not None:
            body = _text(m.group(3))
            if body:
                parts.append(f"  - {body}")
        elif m.group(4) is not None:
            body = _text(m.group(4))
            if body:
                parts += ["", body]
        elif m.group(5) is not None:
            #  <pre> is the repo map. Keep its own line breaks verbatim.
            block = html.unescape(_TAG.sub("", m.group(5))).strip("\n")
            if block.strip():
                parts += ["", block, ""]

    return _BLANKS.sub("\n\n", "\n".join(parts)).strip() + "\n"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()

    if not SRC.exists():
        print(f"missing {SRC}", file=sys.stderr)
        return 1

    body = render()
    if args.check:
        if not OUT.exists() or OUT.read_text(encoding="utf-8") != body:
            print(f"{OUT.name} is STALE — run scripts/architecture_to_text.py")
            return 1
        print(f"{OUT.name} is in sync.")
        return 0

    before = OUT.stat().st_size if OUT.exists() else 0
    OUT.write_text(body, encoding="utf-8")
    print(f"Wrote {OUT.name}: {before:,} -> {len(body.encode('utf-8')):,} bytes")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
