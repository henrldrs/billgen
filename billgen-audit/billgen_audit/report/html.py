"""The HTML report (§14, §15).

Self-contained: one file, inline CSS, no network. An audit report that needs a
CDN cannot be opened from a USB stick in a meeting room, and it is exactly the
kind of document that gets opened that way.

Theme-aware, because the target's own architecture document is, and these two
end up open side by side.
"""

from __future__ import annotations

import html as _html

from ..findings import Severity
from ..orchestrator import Audit

_CSS = """
:root {
  --bg: #fbfbfa; --panel: #ffffff; --ink: #1c1c1a; --muted: #6b6b66;
  --line: #e4e4df; --accent: #0f766e;
  --crit: #b42318; --high: #c4320a; --med: #b54708; --low: #667085; --info: #98a2b3;
  --red: #b42318; --amber: #b54708; --green: #067647;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #14140f; --panel: #1c1c18; --ink: #f0efe9; --muted: #9d9d94;
    --line: #2e2e28; --accent: #2dd4bf;
    --crit: #ff8a7a; --high: #ffa06b; --med: #ffc46b; --low: #a5adba; --info: #7d8592;
    --red: #ff8a7a; --amber: #ffc46b; --green: #4ade80;
  }
}
:root[data-theme="dark"] {
  --bg: #14140f; --panel: #1c1c18; --ink: #f0efe9; --muted: #9d9d94;
  --line: #2e2e28; --accent: #2dd4bf;
  --crit: #ff8a7a; --high: #ffa06b; --med: #ffc46b; --low: #a5adba; --info: #7d8592;
  --red: #ff8a7a; --amber: #ffc46b; --green: #4ade80;
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--bg); color: var(--ink);
  font: 15px/1.6 ui-sans-serif, -apple-system, "Segoe UI", system-ui, sans-serif;
}
.wrap { max-width: 60rem; margin: 0 auto; padding: 3rem 1.5rem 6rem; }
h1 { font-size: 1.9rem; letter-spacing: -0.02em; margin: 0 0 .3rem; }
h2 { font-size: 1.15rem; letter-spacing: -0.01em; margin: 3rem 0 1rem;
     padding-bottom: .5rem; border-bottom: 1px solid var(--line); }
h3 { font-size: .95rem; margin: 2rem 0 .75rem; color: var(--muted);
     text-transform: uppercase; letter-spacing: .08em; }
.sub { color: var(--muted); font-size: .9rem; margin-bottom: 2rem; }
.verdict { display: inline-block; padding: .3rem .85rem; border-radius: 999px;
  font-weight: 650; font-size: .85rem; letter-spacing: .04em; }
.RED { background: color-mix(in srgb, var(--red) 15%, transparent); color: var(--red); }
.AMBER { background: color-mix(in srgb, var(--amber) 15%, transparent); color: var(--amber); }
.GREEN { background: color-mix(in srgb, var(--green) 15%, transparent); color: var(--green); }
table { width: 100%; border-collapse: collapse; font-size: .9rem; }
.scroll { overflow-x: auto; }
th, td { text-align: left; padding: .55rem .6rem; border-bottom: 1px solid var(--line); }
th { color: var(--muted); font-weight: 600; font-size: .78rem;
     text-transform: uppercase; letter-spacing: .06em; }
.meter { display: inline-block; height: .5rem; border-radius: 3px;
  background: var(--accent); vertical-align: middle; }
.na { color: var(--muted); font-style: italic; }
.note { background: var(--panel); border: 1px solid var(--line);
  border-left: 3px solid var(--accent); border-radius: 6px;
  padding: .9rem 1.1rem; margin: 1rem 0; font-size: .9rem; }
.f { background: var(--panel); border: 1px solid var(--line); border-radius: 8px;
     padding: 1.1rem 1.25rem; margin: .85rem 0; }
.f header { display: flex; flex-wrap: wrap; gap: .5rem; align-items: baseline;
            margin-bottom: .6rem; }
.f h4 { margin: 0; font-size: 1rem; flex: 1 1 20rem; }
.pill { font-size: .72rem; font-weight: 650; letter-spacing: .05em;
        padding: .12rem .5rem; border-radius: 4px;
        background: color-mix(in srgb, currentColor 13%, transparent); }
.CRITICAL { color: var(--crit); } .HIGH { color: var(--high); }
.MEDIUM { color: var(--med); } .LOW { color: var(--low); } .INFORMATIONAL { color: var(--info); }
.meta { color: var(--muted); font-size: .8rem; font-family: ui-monospace, monospace; }
.f p { margin: .5rem 0; }
.f b { font-weight: 650; }
pre { background: var(--bg); border: 1px solid var(--line); border-radius: 6px;
      padding: .8rem; overflow-x: auto; font-size: .82rem; margin: .6rem 0; }
ul { padding-left: 1.2rem; }
li { margin: .3rem 0; }
footer { margin-top: 4rem; padding-top: 1.5rem; border-top: 1px solid var(--line);
         color: var(--muted); font-size: .82rem; }
"""


def _e(text: object) -> str:
    return _html.escape(str(text))


def render(audit: Audit) -> str:
    intake = audit.observations.get("intake", {})
    out: list[str] = []
    add = out.append

    add("<!doctype html><html lang='en'><head><meta charset='utf-8'>")
    add("<meta name='viewport' content='width=device-width,initial-scale=1'>")
    add(f"<title>BillGen Audit {_e(audit.audit_id)}</title>")
    add(f"<style>{_CSS}</style></head><body><div class='wrap'>")

    add("<h1>BillGen Professional Audit</h1>")
    add(f"<p class='sub'>{_e(audit.audit_id)} · "
        f"<span class='verdict {audit.overall}'>Overall risk: {_e(audit.overall)}</span></p>")
    add("<div class='scroll'><table><tbody>")
    for label, value in (
        ("Target", intake.get("target_name")),
        (
            "Commit",
            (intake.get("commit") or "?")[:12]
            + (" (dirty)" if intake.get("dirty") else ""),
        ),
        ("Branch", intake.get("branch")),
        ("Run", f"{audit.started} → {audit.finished}"),
        ("Findings", len(audit.findings)),
        ("Architecture doc", intake.get("architecture_doc") or "not found"),
    ):
        add(f"<tr><th>{_e(label)}</th><td>{_e(value)}</td></tr>")
    add("</tbody></table></div>")

    # -- scorecard ------------------------------------------------------
    add("<h2>Scorecard</h2><div class='scroll'><table>")
    add("<thead><tr><th>Domain</th><th>Score</th><th></th><th>Findings</th></tr></thead><tbody>")
    for s in audit.scores:
        if s.score is None:
            add(f"<tr><td>{_e(s.domain)}</td><td class='na'>n/a</td><td></td>"
                f"<td>{s.findings}</td></tr>")
        else:
            add(f"<tr><td>{_e(s.domain)}</td><td>{s.score}/100</td>"
                f"<td><span class='meter' style='width:{s.score * 1.4:.0f}px'></span></td>"
                f"<td>{s.findings}</td></tr>")
    add("</tbody></table></div>")
    for s in audit.scores:
        if s.score is None and s.reason:
            add(f"<div class='note'><b>{_e(s.domain)} — n/a.</b> {_e(s.reason)}</div>")

    # -- not assessed ---------------------------------------------------
    if audit.not_assessed:
        add("<h2>Not assessed</h2>")
        add("<div class='note'>Absence of evidence is not evidence of compliance "
            "(spec §1). Nothing below was checked, and none of it is scored as "
            "passing.</div><ul>")
        for item in audit.not_assessed:
            add(f"<li>{_e(item)}</li>")
        add("</ul>")

    # -- systemic -------------------------------------------------------
    systemic = [f for f in audit.findings if f.agent == "orchestrator"]
    if systemic:
        add("<h2>Systemic findings</h2>")
        for f in systemic:
            add(_finding_html(f))

    # -- findings -------------------------------------------------------
    add("<h2>Findings</h2>")
    ordinary = [f for f in audit.findings if f.agent != "orchestrator"]
    if not ordinary:
        add("<div class='note'>No deterministic finding was raised. Read "
            "&ldquo;Not assessed&rdquo; before treating that as clean.</div>")
    for severity in Severity:
        bucket = sorted(
            [f for f in ordinary if f.severity is severity], key=lambda f: -f.confidence
        )
        if not bucket:
            continue
        add(f"<h3>{_e(severity.value)} — {len(bucket)}</h3>")
        for f in bucket:
            add(_finding_html(f))

    # -- roadmap --------------------------------------------------------
    add("<h2>Roadmap</h2>")
    captions = {
        "P0": "must fix — high-confidence critical",
        "P1": "before professional launch",
        "P2": "premium / scale improvements",
    }
    for tier, items in audit.roadmap.items():
        add(f"<h3>{tier} — {_e(captions[tier])} ({len(items)})</h3><ul>")
        if not items:
            add("<li class='na'>nothing in this tier</li>")
        for f in items:
            add(f"<li><span class='meta'>{_e(f.id)}</span> {_e(f.title)} — "
                f"<span class='pill {f.severity.value}'>{_e(f.severity.value)}</span> "
                f"confidence {f.confidence:.2f}</li>")
        add("</ul>")

    add("<footer>Generated by billgen-audit from "
        "docs/BillGen_Professional_Audit_System_Final_Specification.docx. "
        "Machine-readable findings in findings.json; evidence in evidence/.</footer>")
    add("</div></body></html>")
    return "\n".join(out)


def _finding_html(f) -> str:  # noqa: ANN001
    refs = (
        "<p class='meta'>Sources: " + " · ".join(_e(r) for r in f.references) + "</p>"
        if f.references
        else ""
    )
    verify = f"<p><b>Verify.</b> {_e(f.verification_test)}</p>" if f.verification_test else ""
    evidence = _e(f.evidence)
    body = f"<pre>{evidence}</pre>" if "\n" in f.evidence else f"<p><b>Evidence.</b> {evidence}</p>"
    return (
        f"<div class='f'><header>"
        f"<h4>{_e(f.title)}</h4>"
        f"<span class='pill {f.severity.value}'>{_e(f.severity.value)}</span>"
        f"</header>"
        f"<p class='meta'>{_e(f.id)} · {_e(f.agent)} · confidence {f.confidence:.2f} · "
        f"{_e(f.requirement_type.value)} · {_e(f.location)}</p>"
        f"{body}"
        f"<p><b>Impact.</b> {_e(f.impact)}</p>"
        f"<p><b>Recommendation.</b> {_e(f.recommendation)}</p>"
        f"{verify}{refs}</div>"
    )
