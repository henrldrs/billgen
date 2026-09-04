# ADR-0006 — Invoice conformity: four layers, and one dead column

Status: **accepted** (2026-09-04) · Owner: Henri · Track: legal conformity

> **Not legal advice.** The enumeration below rests on AR n° 1 du 29 décembre
> 1992, art. 5 and art. 39bis / 51 §2 CTVA. A licensed Belgian accountant should
> sign off before public launch — the caveat already carried by
> `core/services/invoice_compliance.py` and `core/rules/belgian_legal.py`.

## Context

`themed/BillGen_Belgian_Legal_Audit_Blueprint.md` proposes a research/audit
system for Belgian invoice conformity: specialist agents, a versioned knowledge
base with evidence, contradiction detection, human validation.

Most of that is a **different product** — a legal-research system with a
curriculum manager and an evidence judge. BillGen does not need to build it to
issue lawful invoices, and this ADR does not adopt it.

What the blueprint contributes to *this* codebase is two things the existing
compliance work does not have, and both are structural:

1. A **priority ordering** for conformity checks, which BillGen has implicitly
   and has never written down.
2. A **reproducibility requirement** on issued invoices, which BillGen has a
   database column for and no code behind.

## Decision

### 1. Conformity is checked in four layers, in this order

The ordering is the load-bearing part. A check at a lower priority must not be
allowed to block issuance, and a check at a higher one must not be deferred to
a later stage of the pipeline.

**P0 — Semantic validity. Blocks issue.**

Identity (seller, buyer, VAT identification, invoice number), dates (invoice
date, supply date where required, due date), financial integrity (quantities,
unit prices, discounts, taxable amounts, rates, VAT amounts, totals, currency,
arithmetic consistency).

Critically: **the VAT scenario is determined before any requirement is judged.**
B2B / B2C, domestic / EU / export, reverse charge, exempt, credit note, special
regime. A requirement must not be evaluated without knowing its applicability —
demanding a customer VAT number on a B2C domestic invoice is a false blocker,
and a false blocker walls a paying customer in.

**Status: ✅ largely built.** `core/services/invoice_compliance.py` runs before
`InvoiceService.issue` and refuses the transition on a blocking finding. Its
severity split is exactly this principle: *blocking* means the document would
not be a valid VAT invoice; *advisory* means it is legally fine and practically
worse (nobody can pay it). Advisories never refuse anything, "because a rule we
got wrong must not be able to wall someone in".

**P1 — Structured / Peppol validity. Independent of the PDF.**

Required BIS elements, identifiers, VAT categories and calculations, totals,
code lists, line structure, participant identifiers.

**Status: ⚠️ built but mis-timed.** `core/services/peppol_validation.py` exists
and validates BIS 3.0 — but it fires at **XML export**, which is long after the
invoice exists, and never runs at all for a PDF-only customer. The check is
correct; its position in the lifecycle is not. P1 findings should be computed at
issue and *recorded*, even where they are advisory for a customer who will never
transmit.

**P2 — Cross-representation consistency.**

Compare PDF ↔ invoice domain object ↔ UBL ↔ database. Look for: different
totals, different VAT, missing customer information, mismatched invoice number,
different currency, template omissions, information present in one
representation and absent from another.

**Status: ❌ absent.** Nothing compares representations. This is the layer that
catches the failure mode neither P0 nor P1 can see — an invoice that is
individually valid in every representation and inconsistent between them. It is
also the layer that makes P3 safe to defer.

**P3 — Presentation. Only after semantic correctness.**

Readability, logo, layout, footer, payment information, page breaks,
accessibility, localisation, print quality.

**Status: ⚠️** — and deliberately last.

> A beautiful invoice that is semantically wrong is still wrong.

### 2. An issued invoice must be reproducible independently of the current template

The requirement:

```
Invoice
  ├── invoice data snapshot
  ├── template identity
  ├── template version
  └── rendered representation
```

Without it, the system can render an issued invoice through the user's
*current* template while implying that the result is the historical document.
For a fiscal record under a seven-year retention obligation, that is not a
cosmetic bug — it is the system misrepresenting what was sent.

**The finding: BillGen has the column and not the code.**

`db/models/invoice.py:74` declares `template_snapshot`, added by migration
`70355c684846`. Its comment states the reasoning correctly — storing the
template *id* "would resolve to whatever the template says today, which is the
exact failure this prevents."

A grep across `core/` and `api/` finds **no writer**. The only other references
are the migration that added it and a comment in `scripts/dev_desktop_api.py`.
The column is null on every row and always has been. The defence was designed,
declared, migrated — and never wired.

This is why stack item **C2** (migrations and schema lifecycle) is ⚠️ rather
than ✅: a schema that grows columns nothing fills is drifting from its own code,
and the drift is invisible because nothing fails.

**Decision:** `InvoiceService.issue` writes `template_snapshot` in the same
transaction that consumes the gapless number and freezes the lines. It belongs
there and nowhere else — issuance is already the one irreversible, atomic
moment in the lifecycle (ADR-0002), and a snapshot written anywhere else can
disagree with the document that was actually issued.

**Consequence for the roadmap:** the historical template-driven record view
must not be built before this. Building it first produces a feature that is
confidently wrong about every invoice already issued, and no later fix can
recover snapshots that were never taken.

### 3. What is not adopted

The blueprint's Agents A–G (Researcher, Belgian Accounting Specialist, Peppol
Specialist, Invoice Auditor, Contradiction Detector, Evidence Judge, Curriculum
Manager), the versioned legal knowledge base with evidence trails, and the
offline self-updating documentation modes are **a separate product**, not a
BillGen subsystem.

Two reasons, and the second is the real one:

1. BillGen's legal rules are a small, stable, hand-verified enumeration in
   `core/rules/`. A research system that maintains them automatically is
   machinery an order of magnitude larger than the thing it maintains.
2. **The blueprint's own golden rule forbids it**: the research system "should
   not silently rewrite production legal rules". A rule that decides whether an
   invoice may be issued is a rule a Belgian accountant signed off on. Automated
   revision of that enumeration is not a feature — it is the removal of the
   sign-off.

If the research system is built, it is built as henriOutAI tooling that produces
a **pull request against `core/rules/` for a human to accept**, never a runtime
dependency of the issuing path.

## Consequences

Work this creates, in order:

1. **Wire `template_snapshot` at issue.** Blocks the historical record view.
   Small; the column and the reasoning already exist.
2. **Move P1 to issue time**, recording Peppol findings as advisory for
   PDF-only customers rather than skipping them.
3. **Build P2** as a check comparing the four representations, once P1 findings
   are recorded at issue and there is something to compare against.

## References

- `themed/BillGen_Belgian_Legal_Audit_Blueprint.md` — §6 (P0–P3), §7 (snapshot), §12 (golden rule)
- `core/services/invoice_compliance.py` — P0, built
- `core/services/peppol_validation.py` — P1, built at the wrong point in the lifecycle
- [ADR-0002](ADR-0002-invoice-lifecycle.md) — why issuance is the atomic moment
- [MINIMAL_STACK.md](../MINIMAL_STACK.md) — items C2 and B4
