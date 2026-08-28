---
description: Run the parallel BillGen audit engine over the repo and its architecture document
---

Run the BillGen professional audit. `$ARGUMENTS` may contain `--authorize-dynamic`
(permits phase 4 load/restore testing — only with the user's explicit say-so) or
`--target <path>` to audit a different checkout.

The engine is a parallel project at `billgen-audit/`. It never imports BillGen
and BillGen never imports it; it reads the repository as text. Its deterministic
layer is read-only against the target — the only writes are into
`billgen-audit/audits/`.

## 1. Run the deterministic layer

```bash
cd billgen-audit && python -m billgen_audit run $ARGUMENTS
```

This performs spec phases 0–3 and 5–7: intake, discovery, the enforcement model,
scanners, correlation, scoring and both reports. It exits 1 when a
high-confidence CRITICAL is present.

Report the scorecard and the headline findings to the user. Then read
`audits/<id>/report.md` and the evidence pack before going further.

## 2. Run the specialist agents

The scanners deliberately stop short of every conclusion that needs judgement,
and they mark those areas unassessed rather than passing them. Closing them is
this step.

Read `audits/<id>/audit.json` → `not_assessed`. For each area still open, follow
the matching agent brief and work from the evidence pack, not from a fresh scan:

| Area still open | Brief |
|---|---|
| Belgian VAT, e-invoicing, document lifecycle | `agents/legal-vat/SKILL.md` |
| Invariants, numbering, immutability, audit trail | `agents/accounting/SKILL.md` |
| Personal data, policy-vs-code, retention, consent | `agents/gdpr/SKILL.md` |
| Tenancy, dependencies, resilience, performance | `agents/architecture/SKILL.md` |

Only spawn subagents for this if the user asks for it. Otherwise work through
the briefs yourself, in the order above.

**The rule that governs every conclusion you add:** a pattern match is not
compliance. `evidence/legal-rules.json` marks rules `NEEDS_CONFIRMATION`
specifically because the scanner found code on the topic and refused to call it
met. Close each one by reading the implementation against the rule's
`source_url`, and record what you read. A `legal_requirement` finding without a
source is rejected by the schema, not by convention.

## 3. Report

Give the user:

- the overall verdict and the nine domain scores, saying plainly which are `n/a`
  and why — an unassessed domain is not a passing one;
- the P0 list, with the distinction between *fix this* and *verify this first*
  intact (a low-confidence CRITICAL is a verification task, not a fix);
- the architecture-document drift, both directions;
- the diff against the previous audit if one exists, leading with anything
  REGRESSED — a finding that came back means a fix did not hold.

Do not raise the confidence of a scanner finding because it seems right to you.
If you verified it, say what you read and record the finding as CONFIRMED;
that is a different claim from the scanner's, and the difference is the point.
