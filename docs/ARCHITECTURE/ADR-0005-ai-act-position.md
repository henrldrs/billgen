# ADR-0005 — BillGen's position under the EU AI Act

Status: **accepted** (2026-09-04) · Owner: Henri · Track: compliance, launch-blocking

> **Not legal advice.** This is an engineering reading of Regulation (EU)
> 2024/1689 applied to this product. Classification carries legal consequences
> and depends on facts a Belgian lawyer should confirm. It is the input to a
> conversation with counsel, not a substitute for one — the same caveat that
> already sits on top of `core/rules/belgian_legal.py`, for the same reason.

## Context

`core/trust/ai_transparency.py` already existed before this ADR. It is a good
module: it names which surfaces produce machine output, records the confidence
field each one carries, and — unusually — names *per surface* the specific way
that surface could drift into Annex III. It was written from Henri's compliance
note and it says so, in a comment that asks explicitly for the date to be
checked against the published text before it is quoted to a customer.

`themed/ai-act-blueprint.md` is that check. It is a consolidation of the
Regulation, the Digital Omnibus agreement, and four academic sources, and it
contradicts the module on the one fact the module flagged as unverified.

This ADR records what the check found, and the position the product now takes.

## Decision

### 1. Henri is a **provider**, not merely a deployer

The Act's first question is not what the AI does but what you are.

| Activity | Role | Reasoning |
|---|---|---|
| Shipping AI features to paying customers under the BillGen name | **Provider** | An AI system placed on the market under his own trademark. This holds even when the underlying model is third-party. |
| Calling third-party GPAI models for classification or extraction | **Deployer** of GPAI | Downstream user; supplier-governance obligations applicable since 2 Aug 2025. |

**The consequential finding:** provider status is not avoided by the fact that
Henri did not train the model. It follows the name on the product, and it
carries a materially heavier obligation set than deployer status — at high
risk, conformity assessment and Article 49 EU-database registration.

This is the reason section 2 matters so much.

### 2. Every AI surface stays on the "classify a transaction" side of the line

BillGen's entire current and planned AI surface sits at **minimal-to-limited**
risk. That is a genuine competitive advantage: it means shipping without a
6–12 month conformity assessment. The features that would destroy it are all in
one family — *scoring a person*.

Classified per surface (the registry is `core/trust/ai_transparency.SURFACES`;
this table is its reasoning):

| Surface | Function | Tier | Reasoning |
|---|---|---|---|
| TVA recovery suggestion | Proposes a VAT treatment and deductible % for an expense | **Limited** | Fiscal classification of a business's own transaction, not an evaluation of a person. Limited rather than minimal because the output is machine-generated text a human reads and acts on — Art. 50 marking attaches. **Caveat:** for a sole trader the business and the natural person coincide; the output still concerns a *transaction*, so the classification holds — this is the point to confirm with counsel. |
| Document field extraction | Reads supplier, dates, amounts, VAT off a scan | **Limited** | Extraction, not evaluation. Per-field confidence already exists. |
| Template / Bill Studio assistance | AI-assisted invoice layout, styling, content blocks | **Limited** | Layout and styling alone do not engage Art. 50. Where AI-generated **text reaches the invoice recipient**, it does — and that recipient is a third party who never agreed to anything. |
| Agenda → auto-generated bill | Derives an invoice from confirmed appointments | **Minimal** | Deterministic derivation from confirmed records; the AI component is extraction. |
| Budgeting / explanatory guidance | Plain-language explanation of a figure already computed | **Minimal** | Minimal *by framing, not by accident* — see the red line below. |
| Marketing readiness quiz | Scores a visitor's profile, recommends features | **Limited**, or out of scope | If rule-based, the Act does not engage at all. If model-driven, Art. 50 disclosure attaches. **Decide this deliberately** — it is cheaper to keep it rule-based than to disclose. |

**Red lines.** These are not features. They are named so a future roadmap
decision is made knowingly rather than by accident:

| Prospective feature | Becomes | Why |
|---|---|---|
| Scoring a client's creditworthiness or payment risk, where that client is a natural person | **High risk — Annex III** | Annex III covers evaluating the creditworthiness of natural persons. A "will this customer pay?" score on a sole trader is squarely inside it. |
| Any recruitment, CV-screening or candidate-ranking feature | **High risk — Annex III** | The most heavily regulated Annex III employment category. |
| Performance monitoring of a customer's employees — e.g. billable-hours scoring in the agenda module | **High risk — Annex III** | Workplace performance monitoring is explicitly listed. **This one is reachable from a feature BillGen already has.** |
| Any emotion recognition in a workplace context | **Prohibited** | Banned outright since 2 Feb 2025. €35M / 7% tier. No grace period, no grandfathering. |
| Risk scoring of natural persons for invoice fraud detection | Likely **high risk** | Depends on construction; needs counsel. |

The third row is the dangerous one, because it is not a new product — it is one
sprint away from the agenda module, and it would arrive framed as a reporting
feature.

### 3. The transparency obligation is **already live**, and BillGen has no grace period

This corrects `TRANSPARENCY_OBLIGATION_DATE = date(2026, 12, 2)` in
`core/trust/ai_transparency.py`.

- Article 50 transparency has applied since **2 August 2026**.
- The grace period to 2 December 2026 applies **only to watermarking on systems
  already on the market before 2 August 2026**.
- BillGen was not on the market before that date. **The grace period does not
  apply to it at all.**

The module planned against a date roughly three months out. There is no runway:
the transparency layer must be present in the **first shipped version** of the
pre-sale beta. This is a launch blocker, not a backlog item — and it is the
reason the constant is now expressed as two dates with the applicability spelled
out, rather than one date that reads as a deadline.

### 4. Article 4 (AI literacy) is live, cheap, and currently unmet

Enforcement began **2 August 2026**. It applies **regardless of risk tier** —
minimal-risk surfaces do not exempt it. A one-person operation is not exempt
either; the evidence set is the same:

| Artefact | Content |
|---|---|
| **AI system inventory** | Every AI system used *or shipped* — including every third-party SaaS with embedded AI features |
| **Role map** | Which person interacts with which system, in what capacity |
| **Literacy record** | What training was done, when, by whom |
| **Proportionality note** | One paragraph per system on why the literacy level matches the risk |

`ai_transparency.SURFACES` is **not** this inventory. It is a product-feature
registry: it does not record model, version, provider, where inference runs,
what data crosses the boundary, or who was trained on what. The gap is recorded
as **I4** in [MINIMAL_STACK.md](../MINIMAL_STACK.md).

The cost of closing it is a few hours. The cost of not having it is that its
absence becomes an **aggravating factor in any other enforcement action** — a
cheap obligation that multiplies expensive ones. That asymmetry is why it sits
at the top of the must-do list rather than in section I with its neighbours.

### 5. What does *not* apply, and why that is itself the artefact

Annex III conformity assessment, Article 49 EU-database registration,
notified-body involvement and post-market monitoring **do not currently apply**.
Documenting *why* they do not apply is the compliance artefact. An empty file is
not evidence; a reasoned classification is. Section 2 of this ADR is that file.

### 6. GPAI supplier governance (live since 2 Aug 2025)

For each model provider, a documented supplier-governance process. Minimum
viable: one row per model recording provider, **pinned version**, licence terms,
where inference runs (local vs cloud), what data leaves the boundary, and the
date the terms were last reviewed.

This is the compliance face of stack item **I1**. "No `:latest` in production"
is not an ops preference here — a floating tag means the pinned-version column
is a lie, and the column is the obligation.

## Consequences

Where the Regulation touches the codebase:

| Obligation | Architectural requirement | Stack item |
|---|---|---|
| Art. 4 inventory | A **queryable register**, not a document | C1 / I4 |
| Art. 50 disclosure | A disclosure component in the UI shell, applied **by default** rather than per page | A1 / I3 |
| Art. 50 marking | Provenance metadata attached **at generation time** and **preserved through caching** | B1, E4, I3 |
| GPAI governance | Model version pinning; no floating tags | D7, I1 |
| Classification reasoning | Persisted, versioned classification records with author and date | C1 |
| Evidentiary trail | Immutable audit log of AI-influenced outputs | F1, G4 |
| Data residency | EU-hosted inference and storage | D7 |

**Two decisions already made that pay off here.** Neither was made for
compliance reasons, which is the pleasant part:

1. **Local-first / self-hosted.** Local inference means classification data
   never crosses a boundary — removing an entire GDPR transfer analysis and
   simplifying the Art. 10 data-governance story.
2. **The API / Core / Repository split (ADR-0001).** A repository layer is
   where provenance metadata and audit logging attach *once* rather than in
   fifteen call sites. It is what makes the Art. 50 hooks cheap.

**The E4 consequence is easy to miss:** caching is no longer purely a
performance decision. A cache that drops provenance metadata turns a compliant
generation path into a non-compliant delivery path, and it will do it silently.
Whatever cache arrives must be tested by pulling a generated artefact *out of
the cache* and checking the marking survived.

### The e-invoicing boundary

The Belgian Peppol / UBL structured e-invoicing mandate is **not** an AI Act
matter. It has its own dates, its own penalties and its own regulator. Keep the
two tracks separate in code and in any corpus — conflating "the 2026 mandate"
across both regimes produces confidently wrong answers to the single most
commercially important question BillGen's customers ask.

The marketing readiness quiz sits exactly on this seam. It should be scoped to
the **e-invoicing mandate** and must not market itself as an AI Act readiness
check.

### What is deliberately *not* adopted from the source

`themed/schema.sql` is a Postgres + pgvector schema for a regulatory **RAG
corpus** — a henriOutAI product, not BillGen. Its `corpus.*` and `rag.*` schemas
have no place in an invoicing application, and pulling pgvector into this
database would be adding a dependency to serve a different product.

What BillGen takes from it is the **shape of the `registry.*` half**: an
`ai_systems` table with role, hosting mode and pinned version; obligations with
deadlines; evidence with a status. That is the Art. 4 inventory from §4 above,
and it is perhaps forty lines of Alembic — not a vector database.

## References

- `themed/ai-act-blueprint.md` — the source consolidation (Parts I–II)
- `core/trust/ai_transparency.py` — the registry this ADR corrects and extends
- [MINIMAL_STACK.md](../MINIMAL_STACK.md) §I — I1–I4 with evidence
- [ADR-0001](ADR-0001-three-layer.md) — the repository split that makes the hooks cheap
