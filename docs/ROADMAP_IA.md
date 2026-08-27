# BillGen — Information Architecture & Product Roadmap

The complete product surface, every area's backend status, and what it would
take to finish each one.

**This document is derived, not hand-maintained.** The source of truth is
[`frontend-react/src/scaffold/ia.ts`](../frontend-react/src/scaffold/ia.ts) —
a typed tree that drives the navigation, the route table, the status badges in
the UI, and the numbers below. Regenerate the tables with:

```bash
npx vitest run --root frontend-react src/scaffold/report.test.ts
```

Invariants (unique keys, unique paths, every unwired node naming what it lacks)
are enforced by `src/scaffold/ia.test.ts`, so the tree cannot rot silently.

---

## 0. How to read this

Every area carries one of three backend states. They describe the **server**,
never the design:

| State | Meaning | In the UI |
|---|---|---|
| **wired** | A real endpoint exists and the screen consumes it | Normal design-system screen |
| **partial** | An endpoint exists but cannot carry the whole screen — read-only where writes are needed, no filter, wrong shape | Real screen where possible, amber marker, scaffold for the missing half |
| **none** | Nothing on the server answers this | Full scaffold page: Times New Roman, square black borders, dead controls |

The scaffold layer is deliberately ugly. A screen with no backend renders in
1999 styling with an inert Win95 button and a yellow banner listing the exact
endpoints it lacks. That is the whole point: **unbuilt surface must never be
mistaken for finished work**, in a demo, a screenshot, or your own memory two
months from now. When `frontend-react/src/scaffold/` can be deleted, the
product is complete.

Nav links and command-palette entries carry the same signal — a small square
marker, amber for partial, red for unwired.

---

## 1. Where the product actually stands

Measured over **114 leaf areas**:

| | Count | Share |
|---|---:|---:|
| Fully wired | 22 | **19%** |
| Partial | 33 | 29% |
| No backend | 59 | 52% |

**166 distinct backend capabilities** are missing. That number is not a
criticism — it is the honest size of "a real SaaS platform" versus "a working
invoicing core", and the core is genuinely done.

### By section

| Section | Wired | Partial | None | Total |
|---|---:|---:|---:|---:|
| Dashboard | 6 | 0 | 1 | 7 |
| Sales | 7 | 1 | 6 | 14 |
| Clients | 2 | 2 | 3 | 7 |
| Catalog | 1 | 6 | 0 | 7 |
| Reports | 3 | 4 | 2 | 9 |
| Company | 0 | 6 | 3 | 9 |
| Billing | 2 | 0 | 6 | 8 |
| Documents | 0 | 0 | 7 | 7 |
| Explore | 0 | 2 | 3 | 5 |
| Activity | 1 | 1 | 3 | 5 |
| Settings | 2 | 6 | 7 | 15 |
| Help & support | 0 | 1 | 6 | 7 |
| Legal | 0 | 0 | 8 | 8 |
| Onboarding | 0 | 1 | 0 | 1 |
| Desktop (Windows) | 0 | 3 | 2 | 5 |

**Company is still 0 wired, 6 partial, 3 none — but the reason changed.** Until
2026-08-26 every field was reachable exactly once, at creation, because there
was no `PATCH /companies/{id}`; a typo in a VAT number was permanent. The
endpoint now exists and every model field except `logo_key` is editable, and
`GET /companies/{id}/validation` will tell a form which identifier is wrong.
All six partials are now waiting on an edit form, not on the server.

**The two movements on 2026-08-26 are both none → partial**, never → wired:
Client history and the Payments report each got the endpoint they were
missing and neither got a screen. That is the shape of the whole backend
track right now — the server is ahead of the UI by six endpoints.

### By layer

| Layer | Wired | Partial | None | Total |
|---|---:|---:|---:|---:|
| **L1 — Core** | 15 | 6 | 0 | 21 |
| **L2 — Business** | 5 | 13 | 22 | 40 |
| **L3 — SaaS** | 0 | 2 | 18 | 20 |
| **L4 — Trust** | 0 | 2 | 12 | 14 |
| **L5 — Platform** | 1 | 7 | 4 | 12 |
| **L6 — Experience** | 1 | 3 | 3 | 7 |

L1 has **zero** unwired areas. The invoicing core is finished. Everything past
it is the SaaS wrapper, and L3 and L4 are entirely untouched — which matches
the audit's finding that the engineering half closed and the commercial half
did not.

---

## 2. The six layers

**L1 — Core.** Dashboard, clients, products, invoices, company. *Done, except
company editing.*

**L2 — Business.** Quotes, credit notes, recurring invoices, payments,
reports, documents, client 360, invoice lifecycle. *Credit notes done; the rest
is the bulk of remaining product work.*

**L3 — SaaS.** Account, subscription, billing, usage, notifications,
onboarding, support. *Nothing started. Blocks charging money.*

**L4 — Trust.** Security centre, GDPR, privacy centre, cookies, audit logs,
backups, export/delete, legal documents. *Audit log and backup exist; the rest
is nothing. Blocks selling to any business with a DPO.*

**L5 — Platform.** Integrations, Peppol transport, API, webhooks,
import/export, offline/Windows, sync. *Peppol XML generation is done and
unshipped — nothing transmits it.*

**L6 — Experience.** Mobile, accessibility, localization, responsive design,
empty states, error states, search, keyboard navigation. *The design system is
strong; its application is not. See §7.*

---

## 3. The four hard blockers

Most of the 166 missing capabilities are ordinary CRUD. Four are
infrastructure that many other features sit on top of, and nothing downstream
of them can start until they exist.

### B1 — No email transport
Nothing in the stack can send a message. This alone blocks: payment reminders,
"send invoice", team invitations, email verification, password reset, support
tickets, notification emails, and every dunning workflow. **It is the single
highest-fanout gap in the product.**

### B2 — No blob storage
No object store, no `Document` model. Blocks: the entire Documents section (7
areas), company branding and logo upload, invoice attachments, client
documents, and the document search in Explore. `Company.logo_key` is already a
dangling reference to storage that does not exist.

### B3 — No `PATCH /companies/{id}` — **closed 2026-08-26**
Blocked 6 partial Company areas at once. `GET /companies/{id}` and
`PATCH /companies/{id}` now ship: legal name, VAT, registration number,
IBAN/BIC, numbering prefix, default template, language and currency are all
editable. The router re-validates the merged model rather than using
`model_copy(update=...)`, so an explicit null on a non-nullable field is a 422
instead of silent corruption, and an unknown `default_pdf_template` is rejected
against `core/pdf/registry.TEMPLATES`. `logo_key` stays out — it belongs to B2.
What remains is frontend: no screen writes to it yet.

### B4 — No subscription/plan model — **closed 2026-08-26**
The entitlement layer ships: four tiers as data, derived usage, atomic quota
guards and one uniform 402 body. Plan and Usage are wired, and free-tier PDF
branding is now a real paid-tier removal (`pdf_remove_branding`) rather than a
hardcoded flag. Two things it deliberately did NOT do, both still open:

- **No checkout.** A payment provider is a Merchant-of-Record adapter that
  writes `SubscriptionRow`; `resolve_tier()` already prefers it over
  `Organization.plan_tier`, so nothing else changes when it lands. Until then
  the six remaining Billing areas have nothing to show.
- **Graded features are declared, not enforced.** Meters and boolean features
  are guarded server-side; the graded ones (`vat_report`, `dashboard`,
  `search`, `pdf_customization`, `import_legacy`, `accountant_export`) are
  read by the UI to pick a variant and are refused by no endpoint. The VAT
  screen hides its per-rate breakdown below "full" on that basis, which is UX
  and not a rule — decide whether it should become one.

---

## 4. Recommended order

Sequenced by dependency and value, not by section order.

**Sprint 1 — Close the embarrassing gaps — DONE (backend), 2026-08-26**
1. ~~`PATCH /companies/{id}` + `GET /companies/{id}`~~ → B3 closed, 6 areas.
2. ~~`GET /invoices?client_id` and `GET /activity?target_id`~~ → Client 360 and
   the per-invoice timeline no longer fetch everything and filter in the
   browser.
3. ~~`GET /products?status` and `?billing_type`~~ → Catalog's Services and
   Archived views are unblocked.
4. ~~`GET /vat-rates` and `GET /pdf-templates`~~ → the Python constants
   (`core/rules/vat.py`, `core/pdf/registry.TEMPLATES`) are exposed. The
   frontend can stop hardcoding `21/12/6/0`; it has not yet.

Every one of the four is backend-complete and screen-incomplete. The remaining
Sprint 1 work is frontend.

**Sprint 2 — The VAT report — backend DONE, 2026-08-26**
`GET /reports/vat?period`, where `period` is `YYYY`, `YYYY-Qn` or `YYYY-MM`.
Returns output VAT per (category, rate) — invoices minus credit notes — with
the Belgian return grid where the category and rate determine it unambiguously
(00/01/02/03 by rate, 44 reverse charge, 46 intra-EU, 47 export) and `null`
where they do not (exempt, not-subject).

Two things it deliberately is not:

- **It is not a filed return.** It covers **sales only**. The data model has no
  purchases, so the deductible-VAT grids (59, 81-83, 86-87) and the 71/72
  balance cannot be produced from it. The response says so in a `covers` field
  so a UI cannot present it as ready to file.
- **It is not on a screen.** For a Belgian sole trader this is still the most
  valuable screen in the product, and it does not exist yet.

A credit note always voids its invoice, so an invoice and its credit note in the
same period cancel; when the credit note lands in a later period, the earlier
period keeps the supply and the later one carries the correction — which is what
the return wants. A bare void (`InvoiceService.void`, no credit note) is treated
as never declared.

**Sprint 2b — The reads the screens need — backend DONE, 2026-08-26**

Six endpoints, no schema change, no external dependency. Each one replaces an
aggregation the browser was doing over a full-list fetch, or exposes a rule the
server already owned:

- `GET /payments` — `invoice_id` is no longer required, and `company_id`,
  `client_id`, `paid_from`, `paid_to` filter it. There was previously **no way
  to list payments across invoices at all**, which is what made 6.6 Payments a
  *none*.
- `GET /reports/invoices?company_id&period` — counts and money per **effective**
  status (Overdue included, derived from the due date) plus a monthly series.
- `GET /clients/{id}/stats` — Client 360's header: invoiced, paid, outstanding,
  overdue, credited, first/last invoice, average days to payment. Replaces one
  invoice-list fetch plus a payments fetch per invoice.
- `GET /clients/{id}/timeline` — the **commercial** history (invoices, credit
  notes, payments), which the audit log structurally cannot produce.
- `GET /companies/{id}/validation` — per-field VAT / IBAN / BIC verdicts plus
  what is still missing for Peppol. `core/rules/identifiers.py` could always
  answer this; nothing ever offered it to a form, so a VAT typo surfaced only at
  export time.
- `POST /invoices/{id}/duplicate` — copies a sale into a fresh draft. No number
  consumed, no void or payment inherited.

Also plumbed through to `@billgen/ui` — client methods, types and hooks —
**including the Sprint 1 + 2 endpoints that had none** (`getCompany`,
`updateCompany`, `vatRates`, `pdfTemplates`, `vatReport`, product
status/billing-type filters). So every Sprint 1-2b endpoint is now one hook away
from a screen, and none of them is on one yet.

**Sprint 3 — Email (B1)**
Transport, templates, then in order: password reset → email verification →
send invoice → payment reminders. Each unlocks the next tier of features.

**Sprint 4 — Quotes**
Quote model with its own numbering series (must **not** consume gapless invoice
numbers — see `core/repository/sequence_repo`), PDF template, and
convert-to-invoice. The most-requested missing sales feature.

**Sprint 5 — Trust (L4)**
Password change, session list and revocation, 2FA, GDPR export and account
deletion, cookie consent, and the legal documents. Required before any B2B
customer's DPO will sign.

**Sprint 6 — Billing (B4)**
Merchant-of-Record, plan model, usage metering, checkout. This is Phase 10 and
it is what turns the project into a business.

**Continuous — L6 experience**
The design-system application work in §7 runs alongside all of the above; it is
frontend-only and blocks on nothing.

---

## 5. Not in this tree: the other two products

The IA above is the **customer app**. The user's architecture note is right that
"SaaS complete" ≠ "customer frontend complete" — two more products share the
same design system and backend:

**Admin / back-office** (internal): customers, organizations, subscriptions,
revenue, usage, BillGen's own invoices, support tickets, security events,
system health, feature flags, failed payments, audit logs. Entirely unbuilt and
deliberately out of the customer IA.

**Public website** (marketing): pricing, signup, legal pages, changelog, status
page. Note that Legal and System status appear in *both* — the customer app
needs them behind auth, the marketing site needs them public. Write once, mount
twice.

---

---

## 6. Section by section

Each area lists the **backend** work and the **frontend** work separately,
because they are usually done by different passes and the frontend half is
often already possible.

### 6.1 Dashboard — 6 wired / 0 partial / 1 none

Financial overview, revenue, outstanding, overdue, recent activity and quick
actions are all real today.

- **Alerts & tasks** *(none)* — needs `GET /alerts`: a server-side rules engine
  producing overdue invoices, clients missing VAT or address, and plan-limit
  warnings. Cannot be assembled from `/reports/kpi`, which returns totals with
  no per-record detail. Each alert must link to the screen that fixes it.
- **Frontend, no backend needed:** the KPI row should carry period-over-period
  deltas and the revenue graph should be a chart, not the current table. The
  `ChartWrapper` component exists and is unused.

### 6.2 Sales — 7 wired / 1 partial / 6 none

The largest section and the one with the most product value left in it.

- **Invoices** *(wired)* — list, create, issue, void, delete, PDF, Peppol XML.
  Status filtering is server-side, so the Drafts / Issued / Paid / Partially
  paid / Overdue / Cancelled tabs are all genuinely live.
- **Sent / Viewed** *(none)* — `InvoiceStatus` has no such members. "Sent"
  needs `POST /invoices/{id}/send` and email transport (**B1**). "Viewed" needs
  a client-facing invoice portal before a view can be observed at all. Both are
  rendered as disabled tabs rather than hidden, so the missing lifecycle stays
  visible.
- **Invoice detail & lifecycle** *(partial)* — header, totals, payments and
  exports are real, `/activity?target_id` gives the per-invoice history, and
  `POST /invoices/{id}/duplicate` ships (a copy is always an unnumbered draft,
  even from an issued or voided source). What is left here is the screen.
- **Credit notes** *(wired)* — create, list, get, PDF all exist. **Backend
  ready, screen not built.** This is the cheapest feature on the board.
- **Recurring invoices** *(none)* — `Product.billing_type` already has a
  `RECURRING` member, but nothing schedules or generates. Needs a
  `RecurringInvoice` model, CRUD, and a job runner.
- **Quotes** *(none)* — model with its own numbering series, CRUD, PDF
  template, and convert-to-invoice.
- **Pro-forma invoices** *(none)* — must not consume a gapless invoice number.
  Touches `core/repository/sequence_repo`.
- **Payment reminders** *(none)* — blocked on **B1**. Belgian practice is a
  three-step escalation (friendly reminder, formal notice, demand with
  statutory late interest); each step needs its own template and a sent-record.

### 6.3 Clients — 2 wired / 2 partial / 3 none

- **Clients list** *(wired)* — full CRUD except delete.
- **Client 360** *(partial)* — `GET /invoices?client_id`,
  `GET /activity?target_id` and `GET /clients/{id}/stats` all ship, so the
  Overview is one call instead of a list fetch plus a payments fetch per
  invoice. The Quotes and Documents tabs still have no backend at all.
- **Contacts** *(none)* — `Client` carries one flat email/phone. Multiple named
  contacts per client is a schema change.
- **Client groups** *(none)* — new model and CRUD.
- **Client activity** *(wired)* — `GET /activity?target_id` scopes the audit
  log to one client record.
- **Client history** *(partial)* — `GET /clients/{id}/timeline` ships. It is
  deliberately not the audit log: invoice, payment and credit-note entries are
  written against the invoice and carry no `client_id`, so `?target_id` can
  never return them. The timeline merges invoices, credit notes and payments
  instead. No screen renders it yet.
- **Client documents** *(none)* — blocked on **B2**.

### 6.4 Catalog — 1 wired / 6 partial / 0 none

Mostly *filter* gaps rather than missing data — the model is richer than the
API exposes.

- **Products** *(wired)*.
- **Services** *(partial)* — `billing_type` makes the split derivable but the
  server cannot filter on it, so the UI fetches everything and filters locally.
- **Categories** *(partial)* — `Product.category` is free text. Real categories
  need their own table to be renameable, colourable and orderable.
- **Pricing** *(partial)* — needs a `PriceList`, client-specific pricing and
  bulk updates.
- **Archived** *(partial)* — `ProductStatus.ARCHIVED` exists and
  `GET /products?status=archived` now filters on it. The separate view is
  unbuilt.
- **VAT rates** *(partial)* — `GET /vat-rates` now serves the Belgian rates and
  the EN 16931 categories from `core/rules/vat.py`. Until a screen reads it,
  21/12/6/0 stays duplicated in TypeScript.
- **Invoice templates** *(partial)* — `GET /pdf-templates` lists the four
  registry templates; the picker is unbuilt.

### 6.5 Company — 0 wired / 6 partial / 3 none

**Every partial here had the same single cause: no `PATCH` (B3) — closed
2026-08-26.** Profile, legal information, VAT/BCE, bank account, numbering and
invoice defaults are all editable on the server now. Each is waiting on an edit
form, not an endpoint.

- **Payment conditions** *(none)* — needs `payment_terms_days` and late-fee
  configuration on `Company`.
- **Branding** *(none)* — blocked on **B2**. `Company.logo_key` is a dangling
  reference today.
- **Company documents** *(none)* — blocked on **B2**.
- Also now available, and not one of the nine areas above:
  `GET /companies/{id}/validation` — per-field verdicts on VAT (mod-97), IBAN (ISO 13616) and BIC (ISO
  9362), each with its canonical form, plus `missing_for_peppol`. Supplier side
  only — a `peppol_ready` company can still be refused at export because the
  *client* fails the gate (no VAT = B2C). No form reads it yet.

### 6.6 Reports — 3 wired / 4 partial / 2 none

- **Revenue, outstanding, overdue** *(wired)*.
- **Invoices** *(partial)* — `GET /reports/invoices?company_id&period` ships:
  counts and money per effective status, plus a monthly series. The browser no
  longer has to aggregate the full list — once a screen reads it.
- **Payments** *(partial)* — `GET /payments` no longer requires an
  `invoice_id`; `company_id`, `client_id` and an inclusive `paid_from`/`paid_to`
  window filter it. A cross-invoice payments report is now possible; it is not
  built.
- **VAT** *(partial)* — **screened 2026-08-26.** `GET /reports/vat?period`
  computes output VAT per (category, rate), invoices minus credit notes, with
  the Belgian grid where the mapping is unambiguous, and `VatReportPanel` now
  renders it for a month, a quarter or a year. It stays *partial* for the
  reason it always was: sales only. The model has no purchases, so deductible
  VAT, grids 59/81-83/86-87 and the 71/72 balance cannot be produced — the
  screen says so in a banner driven by the response's own `covers` field, and
  declares any document dropped for being in another currency. The missing half
  is purchase data, not UI.
- **Clients / Products** *(none)* — straightforward aggregations.
- **Export** *(partial)* — `/backup/export` is a whole-org JSON backup, not a
  report export. Needs CSV/XLSX/PDF per report.

### 6.7 Billing — 2 wired / 0 partial / 6 none

**B4 shipped, and it moved two of the eight.** The server owns the commercial
matrix (`api/entitlements/matrix.py`), meters every allowance and refuses with a
uniform 402:

- **Current plan** *(wired)* — `GET /plans` serves the whole matrix, so the
  comparison screen holds no copy of it. No "choose this plan" button, because
  there is no checkout to send anyone to.
- **Usage** *(wired)* — `GET /entitlements`: invoices and Peppol documents
  monthly, clients/products/companies/seats as standing totals. Storage is
  absent because B2 does not exist, so nothing consumes any.

The refusal path is wired once, at the React Query cache, not per feature:
`EntitlementBoundary` turns any 402 into the upgrade prompt, and no panel, hook
or button in either shell contains payment logic.

The remaining six — subscription, BillGen's own invoices, payment method,
billing history, upgrade/downgrade, cancellation — all wait on a payment
provider. There is nothing to subscribe to, charge or cancel.

Two constraints worth writing down now:

- **BillGen must never render a card field.** Card details are collected by the
  payment provider's hosted form. The scaffold for that screen has permanently
  dead inputs marking where the provider's iframe mounts.
- **Data retention after cancellation** is a legal decision, not a technical
  one, and it belongs in the DPA before the cancellation flow is built.

Usage metering needs counters for invoices, clients, storage and seats — none
of which are currently counted.

### 6.8 Documents — 0 wired / 0 partial / 7 none

Entirely blocked on **B2**. All documents, folders, invoice attachments, client
documents, company documents, archived, trash.

Design guidance: this must be business-document oriented, not a generic file
manager. Attach to client / invoice / company, and lean on metadata rather than
folder hierarchy. Trash ties into GDPR retention — soft delete with a retention
window, not immediate destruction.

### 6.9 Explore — 0 wired / 2 partial / 3 none

Named "Explore" rather than "Research": it is the app's internal search engine.

- **Global search** *(none)* — needs `GET /search?q` across entities. The
  command palette navigates between *pages*; it cannot find an invoice by
  number or a client by VAT, which is what people actually reach for it to do.
- **Advanced filters** *(partial)* — only `company_id` and `status` exist. Date,
  amount, client and created-by filters are needed on every list endpoint.
- **Saved searches** *(none)*, **document search** *(none, blocked on B2)*,
  **activity search** *(partial — no free-text or date range)*.

### 6.10 Activity — 1 wired / 1 partial / 3 none

- **Audit log** *(wired)* — append-only, real.
- **User activity** *(partial)* — entries carry an actor but cannot be filtered
  by one.
- **Notifications** *(none)* — the `NotificationCenter` component has existed in
  the design system since the UI build and has never had a data source. Needs a
  model, read/unread state, and a delivery channel.
- **Security events / system events** *(none)*.

### 6.11 Settings — 2 wired / 6 partial / 7 none

- **Backup & restore** *(wired)*, **Appearance** *(wired — correctly needs no
  endpoint)*.
- **Account** *(partial)* — `GET /users/me` is readable and not editable.
- **Users & permissions** *(none)* — `OrgMembership` exists in `core/models`
  and **does** carry a role enum (`Role = owner | admin | member | viewer`,
  `core/models/user.py`); the JWT carries it and `api/deps.py` exposes
  `current_role`. It is read in exactly one place — `/users/me`, to display it.
  **Nothing enforces it: a `viewer` can void an invoice today.** The gap is
  enforcement and a screen, not a model. Note `roles_permissions` is Business+
  in the entitlement matrix, so the enforcement must itself be tier-gated. Also
  blocked on **B1** for invitations — signup always creates a *new* org, so
  every org currently has exactly one member.
- **Security** *(none)* — password change, TOTP, session list and revocation,
  login history. Refresh tokens exist server-side but are not listable or
  individually revocable. A security score is a good framing device but it must
  reflect real checks, not decoration.
- **Email** *(none)* — **B1**.
- **Notification preferences** *(none)* — per-channel toggles, depends on 6.10.
- **Data & privacy** *(partial)* — `/backup/export` is an org backup, **not** a
  GDPR subject-access export, and there is no account-deletion workflow. GDPR
  touches the whole data lifecycle: personal data inventory, processing
  register, consent records, subprocessors, export, deletion, retention.
- **Cookies** *(none)* — essential always on, analytics and marketing default
  to off, consent recorded with a timestamp. No analytics run today, which is
  the only reason this is not already a compliance gap.
- **Import** *(partial)* — only the FinanceFlow legacy backup format is
  understood. Generic CSV/Excel/UBL with column mapping is unbuilt.
- **Export** *(partial)* — one button, one format.
- **Integrations** *(partial)* — see 6.14.
- **API & webhooks** *(none)* — API keys, webhook delivery with retries.
- **Localization** *(partial)* — language follows the company and cannot be
  changed after creation; no user-level preference, timezone or number format.
- **Advanced** *(none)* — feature flags, danger zone, diagnostics.

### 6.12 Help & support — 0 wired / 1 partial / 6 none

- **System status** *(partial)* — `/healthz` and `/readyz` are real, and
  `/readyz` already reports whether the PDF engine is available, which is the
  one honest per-subsystem signal available today. Email, payments and Peppol
  transport have no health signal because those subsystems do not exist.
- **Help center, getting started, tutorials, FAQ, what's new** *(none)* — all
  need a content source (bundled MDX is simplest; a CMS is the grown-up
  answer). "Getting started" additionally needs per-org progress.
- **Contact support** *(none)* — blocked on **B1**, plus a support inbox.
- **Contextual help** — the `HelpBubble` component already exists and is
  unused. Answering "why is my invoice not Peppol-compliant?" in place, next to
  the failing field, is worth more than a help centre.

### 6.13 Legal — 0 wired / 0 partial / 8 none

Two distinct things share this section:

**BillGen's own paperwork** — Terms of Service, Privacy Policy, Cookie Policy,
DPA, subprocessor list, SLA, legal notices. The DPA is required before any
Belgian business customer's DPO signs off. Legal notices (entity, company
number, registered address) are legally required on the site itself. ToS needs
a version and a per-user acceptance record, not just a page.

**Customer contracts** *(a product feature)* — active, expiring, expired,
templates, archived. Unrelated to the above and should not share a model.

### 6.14 Integrations & Peppol

Called out separately because one of these is nearly finished.

**Peppol is the exception worth prioritising.** BillGen already produces
Helger-validated BIS 3.0 XML with the Belgian elements, and nothing transmits
it — the file is downloaded by hand. An Access Point connection converts an
existing, tested export into an actual e-invoicing feature. For the Belgian
market this is a headline capability, not a settings toggle.

Everything else is genuinely greenfield: banking (CODA/PSD2), accounting
export, Google Drive / Dropbox, webhooks.

### 6.15 Onboarding — 0 wired / 1 partial / 0 none

Nine intended steps: activity, company, VAT, bank account, numbering, branding,
invoice template, first client, first invoice.

Today this is one un-resumable `CompanyForm`. Steps 6 and 7 (branding,
template) have no endpoints at all; the rest exist but nothing records
progress, so the wizard cannot be resumed. Needs per-org onboarding state and
should end on "create your first invoice", not on a settings screen.

### 6.16 Desktop (Windows) — 0 wired / 3 partial / 2 none

Reachable only in the Tauri shell; kept in the IA so the surface is not
forgotten.

- **Connection status** *(partial)* — the desktop build runs its own local
  SQLite, so "offline" is currently the *only* mode. There is nothing to sync
  with, which makes the connection indicator honest but trivial.
- **Offline mode & sync** *(none)* — a real sync protocol with conflict
  resolution and an outbox. This is the largest single piece of engineering in
  the roadmap and should not be started until the web product is settled.
- **Automatic local backup** *(partial)* — `/backup/export` exists; scheduler,
  folder preference and retention do not.
- **Printing & PDF** *(partial)* — PDF works; default printer, download folder
  and direct print do not.
- **Auto-update & crash reporting** *(none)* — blocked on EV code-signing
  (Phase 12).

---

## 7. Layer 6 — the experience work (frontend only, blocks on nothing)

These come from the design review of the existing frontend and are independent
of every backend gap above. They are the highest perceived-quality-per-hour
items in the document.

1. **`.bg-panel` never received the premium pass `.bg-card` got.** Every content
   screen is a flat white box with no shadow and an 8px radius, while the design
   system's `Card` is layered glass at 16px with a real shadow. Either give
   `.bg-panel` the same treatment or render panels inside `Card`. One change,
   every screen.
2. **Heading hierarchy is collapsed.** Panel `h1` renders at 18.4px/weight 400
   and `h2` at 16px/400 — identical to body copy. `.bg-panel__header h1` sets
   `font-size` but not `font-weight`, and Tailwind's preflight resets headings
   to inherit. The spec'd scale (22–24px/600) is wired only to
   `.bg-page-header__title`, on a `PageHeader` component that was mounted
   nowhere until this change.
3. **The primary button fails WCAG AA.** White 14.4px/500 on the emerald
   gradient measures 1.92:1 at the top stop, 2.54:1 mid, 3.77:1 at the bottom;
   normal text needs 4.5:1. Shifting the face to 500 to 700 gives 5.9:1 and
   keeps the depth.
4. **Login and signup run none of the design system.** Both render outside
   `AppShell`, so `--bg-app-backdrop` never applies and the glass has nothing to
   sit on. They also use `text-blue-700` (BillGen has no blue) and
   `text-gray-500` instead of tokens, violating rule 1 of `BRAND_TOKENS.md`.
5. **Desktop-only.** One `max-width` media query exists in 4,227 lines of CSS.
   `.bg-topnav__row` is a fixed 4rem flex row with no wrap or scroll, and six
   tables render without the `.bg-table-wrap` overflow container that the
   unused `Table` component provides.
6. **Action soup.** Every invoice row ends with up to five equal-weight
   buttons. `Menu`, `ContextMenu` and `IconButton` all exist and are unused;
   one primary action plus an overflow menu is the standard answer.
7. **Mobile is not the desktop UI shrunk.** It needs its own navigation — a
   bottom tab bar over the five primary sections — not a 1200px dashboard
   compressed to 390px.
8. **Empty states.** A new account currently shows a row of zeroes. The
   `EmptyState` component exists and is used in only four places. Every list
   and every KPI needs a first-run state that invites an action.
9. **58 components exist; 9 were in use.** `Card`, `PageHeader`, `Table`,
   `Badge`, `Tabs`, `List`, `Select`, `DatePicker`, `Combobox`, `Menu`,
   `Pagination`, `StatusTimeline`, `Stepper`, `Toast`, `Skeleton`, `KpiCard`
   and `ChartWrapper` are all built, tested and unmounted.


---

## 8. Multi-frontend architecture (added 2026-08-25)

The IA above describes **one** of four frontend surfaces. Recording all four here
so the customer app is never mistaken for the product.

| Layer | Surface | Directory | State |
|---|---|---|---|
| L1 | Shared design system | `henrioutai-ui/` | **Done** — 72 components, MIT, public-ready |
| L2 | Shared backend | `api/` `core/` `db/` | **Done** for L1 scope — 219 tests |
| L3 | SaaS web (V02) | `frontend-saas/` | **Partial** — full IA routed, 21 areas wired |
| L4 | Windows desktop (V01) | `frontend-electron/` | **Partial** — Tauri shell, local SQLite, no sync |
| L5 | Mobile (V0) | *does not exist* | **Not started** |
| L6 | Studio AI reference (V1) | `docs/billgen---enterprise-invoicing-&-financial-saas.zip` | **Reference only** |

### 9.1 Correction: the desktop nodes are in the wrong tree

The `desktop` section in `ia.ts` (connection status, offline sync, local backup,
printing, auto-update) currently sits inside the **SaaS** IA, where those screens
are unreachable — the SaaS shell has no Tauri APIs and no local filesystem.

Desktop is a separate frontend with a separate shell. Those five areas belong in
a desktop-scoped IA that `frontend-electron` consumes. Until that split happens,
the SaaS coverage number is diluted by five areas that will never render there.

Tracked as `BGEN-DESK-01`.

### 9.2 What the Studio AI reference actually is

95 files, generated by Studio AI, **built on top of this project's own component
library** — same component names, same token file, same `.bg-*` class names.

That makes it unusually useful: it is not a competing design, it is a working
proof of what `@henrioutai/ui` renders when it is actually used. It mounts **40**
library components; the shipping SaaS app mounts 26.

It is **not** a frontend to adopt wholesale. It has no router (view switching via
`useState`), no data layer (local `initialData.ts`), and pulls dependencies this
project should not take — `@google/genai` with no corresponding UI, `motion`
duplicating the CSS motion tokens, `express` irrelevant against FastAPI.

---

## 9. The multi-layer navigation model

The reference makes explicit a pattern the current build half-implements.
Three depths, each answering a different question:

| Depth | Question | Mechanism | State |
|---|---|---|---|
| **N1** Primary | Which part of the business am I in? | Sidebar rail, 11 destinations in 2 labelled groups, live count badges | Partial |
| **N2** Section | Which slice of this section? | Per-page sub-nav: `Tabs` with counts on lists, `SettingsShell` rail on settings | Partial |
| **N3** Record | What is true of this one record? | `Drawer` inspector — metadata, financials, `StatusTimeline`, actions | **Missing** |

### 10.1 N2 — the per-section sub-navigation, section by section

Invoices already does this correctly: six status tabs with counts, backed by the
server-side `?status` filter. The pattern generalises:

- **Sales → Invoices** — All / Drafts / Issued / Paid / Partially paid / Overdue / Cancelled — *built*
- **Sales → Quotes** — All / Draft / Sent / Accepted / Refused / Expired / Invoiced — *no backend*
- **Clients** — All / Active / Archived / Missing VAT / Missing address — *needs filters*
- **Catalog** — Products / Services / Categories / Pricing / VAT / Archived — *derivable, unfiltered*
- **Reports** — Revenue / Invoices / Payments / Outstanding / Overdue / VAT / Export — *3 of 7 wired*
- **Settings** — the `SettingsShell` rail, 15 sections — *rail built, sections stubbed*

**Counts on N2 tabs must come from the server.** Computing them by fetching every
record and counting in the browser works at demo scale and fails at customer scale.

### 10.2 N3 — the record inspector

The highest-value structural pattern missing from the build. The reference
implements `InvoiceDrawer` and `CustomerDrawer`: identity, status badge, metadata,
financials, copyable identifiers, status timeline, action cluster.

It also solves the action-soup problem in §7 item 6 — five equal-weight buttons per
table row move into the drawer, and the row keeps one primary action plus an
overflow menu.

`Drawer`, `StatusTimeline`, `CopyButton`, `ConfirmDialog` and `Menu` are all built
and none are rendered anywhere in the shipping app.

---

## 10. Component adoption — the precise gap

Measured by walking JSX across all frontends. **72 components in the library:**

| | Count |
|---|---:|
| Mounted by an app | 30 |
| Used only inside other library components | 11 |
| **Never rendered anywhere** | **31** |
| Present in the Studio AI reference | 40 |

### 11.1 The 31 never-rendered components

`Banner` · `Breadcrumbs` · `ChartWrapper` · `Checkbox` · `Combobox` ·
`ContextMenu` · `CopyButton` · `DatePicker` · `Divider` · `Drawer` · `FileUpload` ·
`HelpBubble` · `Kbd` · `KpiCard` · `LanguageSwitcher` · `NotificationCenter` ·
`Pagination` · `ProgressBar` · `RadioGroup` · `SearchBar` · `Select` ·
`StatusTimeline` · `Stepper` · `SuccessState` · `Switch` · `Table` · `Textarea` ·
`Toast` · `Tooltip` · `LanguageIcon` · `SupportIcon`

**26 of these are proven necessary by the reference** — they are not speculative
inventory. The highest-leverage ones:

- **`Table`** — all six list screens. Brings the `.bg-table-wrap` overflow
  container the raw tables lack, so lists become scrollable on narrow screens.
- **`Drawer`** — the N3 depth (§9.2).
- **`KpiCard`** — carries delta, direction and hint that the hand-rolled KPI
  markup drops.
- **`ChartWrapper`** — the dashboard currently renders revenue as a *table*.
- **`Menu` / `ContextMenu`** — row overflow actions.
- **`Select` / `Combobox` / `DatePicker` / `Textarea`** — every form currently
  uses raw `<select class="bg-field__input">` and friends.
- **`Toast`** — no mutation in the product gives transient confirmation.
- **`Skeleton`** — every load is a centred spinner.

### 11.2 Used only inside the library (11)

`Avatar` · `CreateBillButton` · `HomeButton` · `IconButton` · `LogoMark` · `Menu` ·
`Segmented` · `Skeleton` · `IconChip` · `HelpIcon` · `NotificationsIcon`

These render — but only because `TopNav` and friends mount them internally. No
application has ever *chosen* one.

---

## 11. Open decisions (cheap now, expensive later)

Everything built after these inherits them.

### BGEN-BRAND-01 — accent and typeface — **DECIDED 2026-08-25: tokens.css is the standard**

**Resolved.** The reference re-skin is rejected; emerald `#10B981` and Satoshi
remain canonical, and `tokens.css` is the single authority for palette and
type. The reference contributes layout and component patterns only.

Enforced by `frontend-react/src/scaffold/tokens.test.ts`, which fails if the
accent stops being emerald, the sans face stops being Satoshi, or any Tailwind
colour utility or raw hex reaches app or component source. The four violations
that existed (`text-blue-700` and `text-gray-500` on the auth screens) are
fixed; a new `.bg-link` fills the gap that caused them — the system had no
inline text-link style, so call sites reached for a raw Tailwind blue.

The original analysis follows.


The reference kept `--brand-emerald-500` in the palette but repointed
`--bg-accent` at `--brand-blue-500` `#2563EB`, and swapped `--bg-font-sans` from
Satoshi to **Plus Jakarta Sans**.

This is the token architecture working exactly as designed — a re-skin touched
only the semantic layer. But it directly contradicts `docs/BRAND_TOKENS.md`,
which fixes emerald `#10B981` as canonical. **Adopting the reference wholesale
would silently rebrand BillGen.**

| Token | BillGen canonical | Reference | Verdict |
|---|---|---|---|
| `--bg-accent` | emerald `#10B981` | blue `#2563EB` | **conflict** |
| `--bg-font-sans` | Satoshi | Plus Jakarta Sans | **conflict** |
| `--bg-font-mono` | Geist Mono | Geist Mono | agree |
| Radii, motion, spacing, glass | — | identical | agree |

### BGEN-BRAND-02 — navigation model — **DECIDED 2026-08-25: top bar with popups**

**Resolved.** No sidebar. The top bar carries the primary sections, and each one
opens a **popup list of its sub-pages** — so the whole 15-section IA is reachable
in one hop without giving up horizontal space. Applies to both the SaaS and
Windows shells.

Two implementation notes that are easy to get wrong:

- `.bg-topnav__links` had `overflow-x: auto`, and `Menu` renders no portal, so
  every popup was clipped at the nav's edge. The row now wraps instead. Guarded
  by a test that asserts the CSS rule directly, because a clipped popup still
  renders in the DOM and jsdom never applies the stylesheet.
- The trigger opens the menu rather than navigating, so each popup carries an
  explicit "<section> overview" entry. Without it the section landing page is
  unreachable.

The original analysis follows.


Sidebar (reference: 11 destinations, 2 groups, count badges) versus TopNav-only
(current: 5 destinations). The earlier decision deleted the sidebar; the
reference's model scales to the 15-section IA considerably better, and the count
badges are real signal.

`SidebarNav` already exists in the library with `category` and `badge` props, so
the component cost of switching is close to zero. This is a product call.

### BGEN-BRAND-03 — icon language — **DECIDED 2026-08-25: one custom SVG grammar**

**Resolved.** BillGen keeps its own SVG set as the single icon language: 24x24
grid, 2px stroke, round caps and joins, `currentColor` only, `fill="none"`, and a
four-state interaction grammar (idle .8 / hover 1 / active accent / disabled .4)
defined as tokens rather than per component.

`lucide-react` is acceptable only as a *wholesale* replacement, never alongside.
Emoji are never UI.

The audit found the set already ~90% compliant. Two real violations, both fixed:
`PlusIcon` carried a 2.5px stroke where everything else is 2px, and two shells
still had a `👋` in the first-run heading. Full rules in `docs/BRAND_TOKENS.md`
rule 0b; enforced by `frontend-react/src/scaffold/icons.test.ts`, which also
trips if an icon library is added as a dependency.

The original analysis follows.


The reference mixes three grammars: custom SVG, `lucide-react`, and emoji.
BillGen currently has one (14 custom SVG icons). Pick one — adopting lucide is
defensible only as a *wholesale replacement*, never alongside.

---

## 11b. Nav curation — the coverage map is not the navigation (decided 2026-08-27)

Today `routableNodes()` generates the router straight from `ia.ts`, so "a node
exists" and "a node is in the nav" are the same statement. That was right while
the product was half-built: `SectionIndex` renders "3 of 7 areas fully wired"
with ready/partial/no-backend badges, and `ScaffoldPage` names the endpoint each
gap is waiting for. Those are **build-time instruments** — a coverage ledger
wearing a navigation's clothes — and they stop earning their place the moment
the gaps close.

**The rule for what survives as a destination:**

> A nav destination is a place you go *before* you know which record you want.
> Anything that only means something *after* you have picked one belongs inside
> that record.

Not "remove the repetition" — repetition is the symptom. The cut is list vs
record.

### Worked example — Clients, 7 popup entries → 2

| Node | Destination | Why |
|---|---|---|
| Clients (list) | **stays in nav** | you go there to find someone |
| Client groups | **stays in nav** | a group is a cross-client object with its own list; it is not a property of one client |
| Contacts | 360 tab | contacts belong to *a* client |
| Client history | 360 tab | per-client by definition |
| Client documents | 360 tab | *and* a cross-client document search belongs to the Documents section, which is a different question |
| Client activity | **deleted as a nav item** | the cross-client version is already `activity/audit`; the per-client version is already a 360 tab |

### Company is the same disease, and the cheapest to cure

`company/profile|legal|vat|bank|numbering|defaults` are six nav entries over
**one row**. They were wired that way on 2026-08-27 because the IA said so.
`CompanySettingsPanel` is already a single component with a `section` prop and
`section="all"` already works, so collapsing them is deleting five routes, not a
rewrite. Do this one first — it is the proof the rule is cheap.

### Two constraints on how, not whether

1. **The re-cut does not wait for the backend.** A missing *per-record* feature
   belongs inside the record screen as a scaffold block — exactly how Client 360
   already quarantines quotes, documents and tags. Scaffold *pages* survive only
   for gaps that are genuinely their own destination. On that basis Clients can
   be re-cut today: contacts, history and documents have no models, and they are
   precisely the entries that should not be nav items either way.
2. **Do not lose the ledger.** `ia.ts` stays complete — the architecture report
   and `coverage()` read it. Add an explicit nav flag so the IA keeps every node
   while the shell renders a curated subset. Curating then costs one line per
   node, is reversible, and the gap ledger keeps working; it moves to the Explore
   section, where a coverage map belongs.

---

## 11c. Release hygiene — comments must not ship, and must not be deleted (added 2026-08-27)

**The goal:** a published artifact should not read as a guided tour of how the
product works. **The non-goal:** editing the tree. The comments in this codebase
are why a session can pick up where the last one left off; deleting them is
irreversible, and re-deleting them on every change is a recurring model-token
cost for a job that is pure text processing. So: **strip on export, never in the
source.**

### Where the exposure actually is

| Artifact | Exposed? | Why |
|---|---|---|
| Private GitHub repo (`BGEN-OPS-01`) | **No** | nobody can read it |
| SaaS browser bundle | **Already clean** | Vite minifies with esbuild, which drops comments, and `build.sourcemap` is unset (default `false`) — verified in `frontend-saas/vite.config.ts`. Ship a sourcemap and the commented original ships with it |
| Electron desktop | **Yes** | `app.asar` unpacks trivially; whatever lands there is readable |
| Python backend, if bundled with the desktop | **Yes, in full** | `.py` is source. This is the actual manual |

So the work is an export step for the desktop artifact, not a repo-wide edit.

### The shape

- `scripts/export_release.py` — copy tree → strip → build. Never writes to the
  working tree.
- Python stripper: `tokenize`-based (drop `COMMENT` tokens, re-emit). ~40 lines,
  and semantics-preserving in a way a regex over `#` is not.
- TS/TSX: the bundler already does it. Anything shipped as source goes through
  `esbuild --minify`.
- `scripts/extract_annotations.py` — the same pass writes the prose out to
  `docs/ANNOTATIONS/<path>.md` with `file:line` anchors, so the reasoning
  survives in the private tree rather than being destroyed.

### The trap to know before writing a line

**Docstrings here are not comments.** FastAPI and Pydantic publish them: a class
docstring becomes the OpenAPI `description`, and `frontend-react/src/types/api.d.ts`
is generated from that. `CompanyUpdateRequest`'s "PATCH semantics: only provided
fields change (B3)" note in `api/schemas/companies.py` is exactly this. Strip
`#` comments freely; strip docstrings only with a rule that spares schema and
route classes, or accept that the API's own documentation goes silent and the
generated types change.

### The honest limit

This is anti-manual, not anti-reverse-engineering. It stops someone reading a
guided tour of the design; it does not stop them reading the code. If the goal
is protecting the product rather than withholding the commentary, the lever is
what gets shipped at all — server-side logic plus licensing — not comment
removal.

---

## 12. Where the full audit lives

The complete cross-frontend audit — coverage matrices, repo-aligned backend
breakdown, compliance architecture, progress gates, and the cross-repo punch list
with IDs (`BGEN-CORE-*`, `BGEN-API-*`, `BGEN-TRUST-*`, …) — is a standalone
document:

**[`docs/ARCHITECTURE/system-architecture.html`](ARCHITECTURE/system-architecture.html)**

This roadmap remains the source of the IA counts; that document is the audit
built on top of them.

---

## 13. Definition of done

The product is complete when `frontend-react/src/scaffold/` can be deleted:
no scaffold pages, no dead buttons, no nav markers, and `coverage().percent`
reads 100.

Until then, the number at the top of this document is the honest measure, and
it is regenerated from the code rather than asserted.
