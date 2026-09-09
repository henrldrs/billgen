# ADR-0002 — Invoice lifecycle: draft → issued → delivered

- **Date:** 2026-07-07
- **Status:** Accepted. **Step 1 (draft → issue split) implemented** — `create_draft()` +
  `issue()` + `delete_draft()`, `POST /invoices/{id}/issue`, `DELETE /invoices/{id}`, UI
  Issue/Delete actions + DRAFT badge, watermarked draft PDF. Steps 2–5 (delivery track,
  backup/restore, CI, external integrations) remain pending.
- **Deciders:** Product owner + Data Architect
- **Supersedes:** the create-time issuance behaviour introduced in phases 4–6

## Context

Today `InvoiceService.create()` does two legally distinct things in one step: it
**allocates the gapless sequential number** and sets `status = ISSUED` the moment an
invoice is created (`core/services/invoice_service.py:75,95`). The `DRAFT` enum value
exists but nothing uses it.

Under the standard Belgian interpretation, a document only becomes a **VAT invoice**
when it is *issued* — numbered, dated, finalized. A draft / proforma has no sequential
number and no VAT force; it can be freely edited or deleted. Creating a PDF is **not**
issuing an invoice.

Two misconceptions this ADR settles:

1. **"An invoice is official once it's on the Peppol network."** No. Peppol is a
   4-corner *delivery* network (sender → sender's AP → receiver's AP → receiver); its
   only central registry (SMP/SML) lists *who can receive*, not *valid invoices*.
   Official status comes from **issuing it in your own books**, not from the network.
2. **"The app must be triggered by network events to make an invoice real."** No.
   Issuance is a local, deliberate, user-driven act; the database is the source of
   truth. Delivery status is a *separate*, asynchronous track.

## Decision

### 1. Two independent state machines

- **Legal state (local, user-driven, DB is source of truth):**
  `DRAFT → ISSUED → (corrected via credit note)`. Never depends on the network.
- **Delivery state (external, best-effort, the Access Point is source of truth):**
  `NOT_SENT → SENDING → DELIVERED → (later) ACCEPTED / REJECTED`.

An invoice may be **ISSUED but NOT_SENT** — a valid, common state. Legal life never
waits on delivery.

### 2. The transition lives in CORE

Split `InvoiceService.create()` into two use-cases in `core/services/invoice_service.py`:

- **`create_draft()`** — no number, `status = DRAFT`, editable, **deletable**, PDF
  watermarked "not a valid invoice".
- **`issue()`** — the load-bearing transition. Assigns the gapless number
  (`allocate_invoice_numbers`, *moved here from create*), freezes issue date + lines +
  totals, sets `status = ISSUED`, writes an audit `issue` entry, commits. Pure core:
  no framework, no I/O beyond the repository ports.

This also removes the audit's "deleting an invoice breaks gaplessness" risk: only
issued invoices have numbers, and issued invoices are never deleted.

Open question for the accountant: **issue == send, or issue then send?** Decision:
**issue is its own local act; send is a separate, retryable delivery** — Belgian law
requires issuance by a deadline regardless of whether the network delivered.

### 3. Delivery (Peppol send) is a separate component, port + adapter

Keep the transition pure and the network out of core:

- **Delivery *state*** (`delivery_status`, `sent_at`, `peppol_transmission_id`) →
  fields on the `Invoice` core model.
- **Transmission *use-case*** → a core `DeliveryService` depending on an **abstract
  `AccessPointGateway` port** (SMP lookup + transmit).
- **Concrete AP client** (HTTP to Storecove / Billit / Unifiedpost / …) → an adapter
  **outside** core (an `integrations/` package or the API/infra layer), injected in —
  same port/adapter inversion as `db/` implements the repository ports.

Async status, per deployment (the app is never "live-triggered"):
- **SaaS/server:** AP → **webhook** to the API updates delivery state.
- **Desktop sidecar:** no public URL → **poll/reconcile on launch or a Refresh
  action**. The AP holds the truth; the app catches up when it runs.
- **No AP yet (today):** delivery is manual (PDF/email/Doccle); the invoice is still
  official at issue. This is the demo's world.

### 4. Payment + status automation

- **Overdue is derived, not stored:** `ISSUED && due_date < today && unpaid`. Correct
  on both server and the not-always-on desktop. Only persist real events
  (`PAID` / `PARTIALLY_PAID`).
- **Paid via reconciliation:** the OGM-VCS structured communication already emitted as
  UBL `PaymentID` is the join key. A later phase pulls bank transactions (CODA / PSD2
  aggregator: Ponto / Isabel / Ibanity) and auto-posts a `Payment`. Today only manual
  `PaymentService.record()` exists.

### 5. Data retention vs. deletion (server migration)

GDPR right-to-erasure **collides with** the ~7-year tax-retention obligation, and
retention wins for fiscal documents. Deletion is therefore *scoped*, not uniform:

- **Freely deletable:** drafts/proformas, clients, products, PII not embedded in an
  issued invoice.
- **Not deletable on request:** issued invoices, credit notes, payments (legal hold).
  "Delete account" = close access + stop processing (+ export to the user), retain the
  fiscal records until the period lapses, then purge.
- **Backups (server):** managed Postgres PITR + scheduled `pg_dump` to EU object
  storage; retention via bucket lifecycle rules (keep N daily / M weekly / …, auto-
  expire). Infra, not app code.

## Consequences

- `create()` is replaced by `create_draft()` + `issue()`; the numbering machinery and
  the `ISSUED`-setting move from create-time to `issue()`. New `POST /invoices/{id}/issue`
  in `api/routers/invoices.py`; UI gains an explicit, confirm-gated "Issue" action.
- New delivery-state fields on `Invoice` (core model) + a migration (`db/`).
- New `AccessPointGateway` port in core; its adapter and the bank-reconciliation
  adapter are external and injected — core stays framework/network-free.
- Overdue becomes a derived read, not a persisted status.
- A documented retention/deletion policy is required (lawyer + accountant sign-off).

## Plan of record (sequencing)

1. **Draft → issue split** (this ADR's core): `create_draft()` + `issue()`, move
   numbering, add legal-state handling, `POST /invoices/{id}/issue`, UI "Issue" action,
   draft PDF watermark. *Pure core + api + ui; no external deps.* ← **DONE.**
   Notes: `Invoice.reference`/`sequence_global` are now nullable (a draft carries no
   number); the gapless number is consumed only in `issue()`; DRAFT invoices are
   hard-deletable (`delete_draft()` + repo `delete()` guarded to drafts) while issued
   invoices stay no-delete; drafts are excluded from KPI/revenue totals; migration
   `b7f2c1a9d3e4` relaxes the two NOT NULLs (unique constraints preserved — NULLs are
   distinct).
2. **Delivery-state track:** model fields + migration + `AccessPointGateway` port
   (no live transmission yet; state settable manually / marked "delivered outside app").
3. **Backup / restore** (foundation item #2): full-tenant export/restore reusing the
   `ImportService` pattern; scoped deletion honouring retention.
4. **CI + quality gate** (foundation item #3).
5. **Later phases (external deps):** real Peppol transmission via an AP adapter;
   bank-feed payment reconciliation; email reminders (Phase 10 provider).

## References

- [ADR-0001](ADR-0001-three-layer.md) — the three-layer split this builds on.
- `core/services/invoice_service.py` (current create-time issuance), `numbering_service.py`.
- Peppol validation outcome + BE→BIS switch: commit `771e903`.
