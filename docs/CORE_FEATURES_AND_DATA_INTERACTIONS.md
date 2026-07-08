# BillGen CORE — Features & Data Interactions

**Scope note.** This is the inverse of the UI scaffold doc — no navigation, no
buttons, no screens. This is what `core/` (the framework-free domain layer,
per ADR-0001) actually *does*: what it lets you access, modify, or exclude in
the database, and what it produces (PDF/XML) or withholds (delivery, billing).
Everything below is sourced from `ADR-0001-three-layer.md`,
`ADR-0002-invoice-lifecycle.md`, `COMPARISON_demo_vs_new.md`, and
`AUDIT_PROGRESS_vs_demo.md` — nothing invented. Status flags reuse the audit's
own vocabulary: **✔ implemented** / **◑ partial** / **✗ not started** / **❓ not
documented** (exists conceptually but no doc confirms it's wired up).

---

## 1. Access / modify / exclude — the CRUD matrix

"Exclusion" in this system is deliberately not uniform — the whole point of
ADR-0002 §5 is that **deletability is a legal property of the entity**, not a
technical default. This table is the one thing worth internalizing before
building any UI on top of it: a delete button that looks the same on every
row will be wrong on half of them.

| Entity | Create | Read | Update | Delete | Note |
|---|:---:|:---:|:---:|:---:|---|
| **Invoice — draft** | ✔ `create_draft()` | ✔ | ✔ (freely editable) | ✔ `delete_draft()` | No number allocated yet; PDF is watermarked "not a valid invoice" |
| **Invoice — issued** | ✔ via `issue()` transition | ✔ | ✗ **frozen** (lines/totals/date locked at issue) | ✗ **never** — correction goes through a credit note only | The load-bearing legal act; ADR-0002 |
| **Credit note** | ✔ (the only correction mechanism) | ✔ | ❓ not documented | ✗ legal hold, same as issued invoices | ADR-0002 §5 |
| **Payment** | ✔ `PaymentService.record()` (manual only) | ✔ | ❓ not documented | ✗ legal hold | Bank-feed auto-posting (CODA/PSD2) is a later phase, not built |
| **Client** | ✔ | ✔ | ✔ | ✔ **freely deletable** — unless PII is embedded in an issued invoice, in which case that invoice's copy survives independently | ADR-0002 §5 |
| **Product / Service** | ✔ | ✔ | ✔ | ✔ freely deletable | Not a legal document |
| **Company** | ✔ | ✔ | ✔ | ❓ not documented | Likely restricted (tenant boundary), not confirmed |
| **Organization** | ✔ (provisioning) | ✔ | ✔ | ❓ not documented | Sits above Company; probably admin-only, unconfirmed |
| **User** | ✔ | ✔ | ✔ | ◑ **scoped, not immediate** — "close access + stop processing + export, retain fiscal records until the retention period lapses, then purge" | GDPR-erasure vs. 7-year tax retention conflict, resolved in favor of retention |
| **Sequence row** (invoice numbering) | system-only, advanced under row lock inside `issue()` | ❓ | ✗ | ✗ | Never touched directly; a rollback rolls the counter back too |
| **Audit log entry** | ✔ automatic, on every state-changing action | ❓ no read API confirmed | ✗ | ✗ **append-only by design** | |
| **Subscription row** | ✔ (table exists) | ❓ | ✗ no plan-gating logic | ❓ | Phase 10 — schema only, no enforcement |

**Reading this table.** Three tiers of "exclusion," not one: *freely deletable*
(clients, products, drafts — nothing legal depends on them), *scoped/delayed
deletable* (user accounts — deletion is really "quarantine + purge later"),
and *never deletable* (issued invoices, credit notes, payments, audit log —
the legal record). A generic "Delete" button in the component library (see
the other doc) needs at least these three behaviors, not one.

---

## 2. Your named features — status check

### Preview of templates — **◑ partial, not confirmed as a real feature yet**

What's confirmed: 4 PDF templates exist and render (`fr_standard`,
`fr_detailed`, `nl_minimal`, `credit_note` — WeasyPrint + Jinja2,
`COMPARISON_demo_vs_new.md` §9), and `Company.default_pdf_template` lets a
company pick one at the settings level. Separately, a **draft invoice
generates a watermarked PDF** ("not a valid invoice") before issuance — that's
the closest thing to a "preview" that's actually documented, and it *is*
implemented (ADR-0002 Step 1). What is **not** confirmed anywhere: a UI/API
that lets you flip between the 4 templates and see the same invoice re-render
live before choosing. That workflow may not exist yet — it's a genuine gap
between "templates exist" and "template preview is a feature."

### PDF generation — **✔ implemented**

Server-side, WeasyPrint + Jinja2, renders from the same stored `Decimal`
totals used for the legal record (not recomputed at render time — this was a
deliberate improvement over the old client-side jsPDF approach, per
COMPARISON §9). Draft watermarking implemented. No confirmed "managed filing"
(saving PDFs into an `Invoices/YYYY-MM/` folder structure) — audit finding H5,
still open; PDFs are loose downloads today.

### XML (Peppol/UBL) generation — **✔ implemented, ❓ unvalidated**

`core/einvoicing/ubl_builder.py` builds real UBL 2.1 / EN 16931 XML via
ElementTree (not string templates). Per-line VAT categories, multi-rate
`TaxSubtotal` grouping, document-level discounts, exemption reasons — all
implemented and ahead of the old demo on tax modeling. **Two gaps, both
flagged in your own docs, not by me:** it currently emits only vanilla BIS
(no `UBL.BE` Belgian profile the old demo had), and the XML has **not been
run through the official Helger schematron validator** yet on either
codebase (`AUDIT_PROGRESS_vs_demo.md` §5) — so "generates XML" and "generates
*certified* XML" are not the same claim today.

### Peppol delivery (actually sending the XML) — **✗ not started**

This is distinct from generating the XML. `AccessPointGateway` is a defined
*port* in core (ADR-0002 §3) with no adapter behind it yet — no live
transmission to Storecove/Billit/Unifiedpost/e-invoice.be. Today, delivery is
manual (PDF/email). The invoice is still legally official at issue — Belgian
law doesn't require network delivery for legal validity — but "send it via
Peppol" as a product feature doesn't exist yet.

### Dashboard / reporting — **✔ implemented**

`ReportingService` + `GET /reports`; KPI and revenue hooks read real invoice
data (the old demo's mock dashboard data file is gone).

### Settings — **◑ partial**

Company-level settings (template choice, VAT defaults, etc.) exist as model
fields. A dedicated settings *screen/flow* isn't described in any doc I have
access to — this is a UI-layer question your component list should account
for, not something CORE confirms either way.

### DB / persistence — **✔ implemented**

SQLAlchemy 2.x + Alembic migrations; SQLite (desktop, `%APPDATA%\BillGen`) or
Postgres (SaaS) behind the same repository ports — one CORE, two backings.

---

## 3. Everything else CORE proposes (beyond dashboard / preview / db / pdf)

| Feature | Status | Where |
|---|:---:|---|
| Gapless invoice numbering (Belgian legal requirement) | ✔ | `core/rules/numbering.py`, row-locked `SequenceRow` |
| Multi-rate VAT / EN 16931 tax-category engine (domestic / reverse-charge / intra-EU / export) | ✔ | `core/rules/vat.py`, `pick_category()` |
| Line + invoice-level discounts, proportionally allocated | ✔ | `core/rules/discounts.py` |
| `Decimal`-exact money math (banker's rounding) | ✔ | `core/rules/currency_math.py` |
| Draft → Issue legal state machine | ✔ | ADR-0002, Step 1 done |
| Delivery state machine (NOT_SENT → SENDING → DELIVERED → ACCEPTED/REJECTED) | ✗ fields/port planned, no adapter | ADR-0002, Step 2 |
| Derived overdue status (`ISSUED && due_date < today && unpaid`) | ✔ | computed, never stored |
| Manual payment recording | ✔ | `PaymentService.record()` |
| Bank-feed payment reconciliation (CODA / PSD2: Ponto, Isabel, Ibanity) | ✗ | later phase |
| Multi-tenancy isolation (org → company → everything, `ContextVar`) | ✔ tested | `tests/api/test_tenant_isolation.py` |
| Auth: JWT access + rotating refresh, argon2id hashing | ✔ | |
| Desktop auto-bootstrap (singleton local session) | ✔ | `POST /auth/desktop-bootstrap` |
| License verification (Ed25519 signed license file) | ◑ verify exists | no activation flow, no plan gating |
| Legacy data import, with dry-run preview vs. commit | ✔ | `core/imports/legacy_backup.py`, `POST /imports/legacy/{preview,commit}` |
| — historical invoices on import | ✗ **deliberately excluded** | would mint fake gapless numbers; counted and surfaced instead |
| Append-only audit log | ✔ | every state-changing action |
| Retention-aware scoped deletion | ✔ policy implemented in code | full legal write-up (EULA/policy doc) still owed |
| Full-tenant backup / restore | ✗ | ADR-0002 Step 3, not started |
| Subscription / plan entitlement enforcement | ✗ | table exists, no gating logic — Phase 10 |
| CI / automated quality gate | ✗ | ADR-0002 Step 4, not started |
| Automated test coverage | ✔ | 185 Python + 33 frontend tests |
| Agenda / VAT-reminder cadence | ✗ **regression** — existed in the old demo, not ported | flagged as an honest debt, not an oversight |

---

*If you want this cross-referenced against the actual `core/` and `api/`
source instead of the architecture docs, connect that folder and I'll re-run
this pass against real code rather than the ADRs describing it.*
