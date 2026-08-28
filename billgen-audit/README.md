# billgen-audit

An evidence-driven audit engine built from
[`docs/BillGen_Professional_Audit_System_Final_Specification.docx`](../docs/BillGen_Professional_Audit_System_Final_Specification.docx).

It audits BillGen and BillGen's own architecture document. It is **a parallel
project**: it does not import BillGen, BillGen does not import it, and nothing
in BillGen's build, test or lint path touches it. The target is a *path read as
text* — which is what lets it audit a checkout it could not even install.

```bash
cd billgen-audit
python -m billgen_audit run --open
```

Or from anywhere in the repo, as a slash command: **`/audit`**.

No dependencies. Standard library only, on the Python already used to run
BillGen's tests.

## What it does, and what it refuses to do

The specification's §1 puts *no hallucinated compliance* and *absence of
evidence is not evidence of compliance* next to each other, and most of the
design here follows from taking both literally:

| Refusal | Where it lives |
|---|---|
| A `legal_requirement` finding with no authoritative source cannot be constructed | `findings.py.__post_init__` |
| A pattern match is never reported as compliance — it becomes `NEEDS_CONFIRMATION` | `scanners/legal.py` |
| An unassessed domain scores `n/a`, never 100 | `scoring.py` |
| The overall verdict is never GREEN while a domain is unassessed | `scoring.py._overall` |
| Confidence is separate from severity, and discounts the score penalty | `findings.py`, `scoring.py` |
| A secret's value is never quoted into the report | `scanners/privacy.py` |
| Dynamic testing is off until a human passes `--authorize-dynamic` | `config.py`, `cli.py` |

The last one matters for a tool bound to a slash command: the deterministic
layer is read-only against the target. The only writes are into `audits/`.

## The layers

```
Orchestrator  (orchestrator.py)  phases 0-8
     |
     +-- Deterministic scanners   scanners/*.py     no model, same answer twice
     +-- Rule registry            rules/*.json      jurisdiction + source + last_reviewed
     +-- Specialist agents        agents/*/SKILL.md judgement, run by /audit step 2
     |
     +-- Evidence store           audits/<id>/evidence/
     +-- Findings                 audits/<id>/findings.json
     +-- Reports                  report.md, report.html, diff.md
     +-- Baseline                 the next run diffs against this one
```

### Why the enforcement scanner runs before everything else

`scanners/enforcement.py` decides how the target enforces auth, authz and
tenancy, and the answer changes which findings the route scanner is *allowed* to
raise.

This is not a refinement. On the first run against BillGen the route scanner
emitted **56 findings, ~50 of them false**, because BillGen authenticates in one
global middleware and every handler therefore looks unauthenticated when read
one at a time. Modelling the enforcement architecture first took it to **4
substantive findings**. A tool with that false-positive rate is switched off in a
day, and the findings it was right about go with it.

### Scanners

| Scanner | Spec | Checks |
|---|---|---|
| `discovery` | §3 ph.1 | components, languages, frameworks, DB, CI, environments |
| `enforcement` | §8.2 | auth model, public allowlist, tenancy model |
| `routes` | §8.2, §12 | the real surface; public writes; writes with no permission |
| `accounting` | §6 | numbering constraints, immutability, audit trail, client-set totals |
| `documents` | §10 | do PDF and structured output share one source of truth |
| `legal` | §5, §17 | the rule registry, rule staleness, unverified rules |
| `einvoicing` | §5.3 | generation, validation and **transmission** as three states |
| `privacy` | §7 | policy documents, DSR endpoints, PII in logs, trackers |
| `secrets` | §13 | committed credentials |
| `dependencies` | §8.3 | inventory, version bounds, lockfile |
| `resilience` | §8.5 | backup, restore, whether restore is tested, RTO/RPO |
| `observability` | §8.8 | correlation ids, health, error tracking, metrics |
| `architecture_doc` | §14 | **drift between `system-architecture.html` and the tree** |

### The architecture-document check

The document is treated as a set of claims and the repository as the evidence.
Only what the document states precisely enough to be falsified is compared —
the endpoint inventory and the repo map. Prose is left alone, because a claim
like *"the gap is transmission, not validation"* cannot be checked by a regex
and pretending otherwise would put the tool's worst output beside its best.

Both directions are reported and they fail differently: an endpoint documented
but absent is fiction someone will plan against; an endpoint present but
undocumented means the map has stopped being complete, which is how a document
stops being read.

### Removing the cause, not just reporting it

Reporting drift every run and expecting a person to fix it by hand is how the
drift happened. So `sync-architecture` writes the computable parts of the
document:

```bash
python -m billgen_audit sync-architecture          # rewrite
python -m billgen_audit sync-architecture --check  # exit 1 if stale
```

It touches exactly two kinds of thing and leaves everything else byte-for-byte
alone:

| Marker | What it holds |
|---|---|
| `<!-- GENERATED:endpoints -->…<!-- /GENERATED:endpoints -->` | the complete registered surface, grouped by router |
| `<span data-fact="endpoint_count">70</span>` | one number, replaced in place wherever it appears |

The split it enforces: **a fact a machine can compute is generated; a judgement
is written by a person.** The endpoint table drifted; the verdicts beside it
("still no UI", "B3 closed") did not, because a verdict does not go stale the
way a route table does.

Once the markers are present the scanner changes what it reports: "present but
undocumented" is suppressed (structurally impossible), "documented but absent"
drops to INFORMATIONAL (those are usually deliberate gap mentions), and a new
MEDIUM fires when the generated blocks are stale — which is the condition that
actually matters.

## Commands

```bash
python -m billgen_audit run                  # audit, write reports, diff the baseline
python -m billgen_audit run --open           # ...and open the HTML report
python -m billgen_audit run --authorize-dynamic   # permit phase 4 (§8.6)
python -m billgen_audit list                 # every audit held
python -m billgen_audit show audit-001       # one audit's report
python -m billgen_audit evidence audit-001   # what was collected
python -m billgen_audit diff audit-001 audit-002
python -m billgen_audit sync-architecture           # regenerate the architecture doc
python -m billgen_audit run --target ../other-checkout
```

`run` exits 1 on a high-confidence CRITICAL, so it can gate a pipeline.

## Rules (§17)

`rules/*.json` — each carries jurisdiction, `effective_from`, classification, an
authoritative `source_url` and `last_reviewed`. A rule not reviewed within 180
days is reported as stale and every conclusion drawn from it is halved in
confidence. §17: the system must never silently treat an outdated rule as
current. **The Belgian B2B e-invoicing rules are the ones most likely to move.**

## Agents

The scanners stop where judgement begins and mark the area unassessed rather
than passing it. `agents/*/SKILL.md` are the four specialist briefs — Belgian
legal/VAT, accounting, GDPR, architecture — and step 2 of `/audit` works through
whichever ones the `not_assessed` list still names.

## Tests

```bash
python -m pytest billgen-audit/tests -q
```

21 tests, mostly about *refusing to conclude*: the schema rejecting an unsourced
legal claim, a grep not becoming compliance, an unassessed domain not scoring
100, a low-confidence CRITICAL not turning the verdict red. An audit tool that
is wrong is worse than none, because its mistakes are laundered through a
report.

They are not collected by BillGen's suite — its `testpaths` is `["tests"]`.
