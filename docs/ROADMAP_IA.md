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
| Fully wired | 21 | **18%** |
| Partial | 30 | 26% |
| No backend | 63 | 55% |

**171 distinct backend capabilities** are missing. That number is not a
criticism — it is the honest size of "a real SaaS platform" versus "a working
invoicing core", and the core is genuinely done.

### By section

| Section | Wired | Partial | None | Total |
|---|---:|---:|---:|---:|
| Dashboard | 6 | 0 | 1 | 7 |
| Sales | 7 | 1 | 6 | 14 |
| Clients | 1 | 3 | 3 | 7 |
| Catalog | 1 | 4 | 2 | 7 |
| Reports | 3 | 2 | 4 | 9 |
| Company | 0 | 6 | 3 | 9 |
| Billing | 0 | 0 | 8 | 8 |
| Documents | 0 | 0 | 7 | 7 |
| Explore | 0 | 2 | 3 | 5 |
| Activity | 1 | 1 | 3 | 5 |
| Settings | 2 | 6 | 7 | 15 |
| Help & support | 0 | 1 | 6 | 7 |
| Legal | 0 | 0 | 8 | 8 |
| Onboarding | 0 | 1 | 0 | 1 |
| Desktop (Windows) | 0 | 3 | 2 | 5 |

**Company is the standout anomaly: 0 wired, 6 partial, 3 none.** Every field is
already on the domain model and reachable exactly once, at creation. There is
no `PATCH /companies/{id}`, so a typo in a VAT number is permanent. This is the
cheapest high-value fix in the entire roadmap.

### By layer

| Layer | Wired | Partial | None | Total |
|---|---:|---:|---:|---:|
| **L1 — Core** | 15 | 6 | 0 | 21 |
| **L2 — Business** | 4 | 10 | 26 | 40 |
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

Most of the 171 missing capabilities are ordinary CRUD. Four are
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

### B3 — No `PATCH /companies/{id}`
Blocks 6 partial Company areas at once. The model already carries legal name,
VAT, registration number, IBAN/BIC, numbering prefix, default template,
language and currency. One endpoint converts all of them from write-once to
editable. **Highest value per hour of work in the whole document.**

### B4 — No subscription/plan model
Blocks all 8 Billing areas, usage metering, plan gating, and the entire
monetisation path. Also blocks the free-tier PDF branding becoming a real
paid-tier removal rather than a hardcoded flag.

---

## 4. Recommended order

Sequenced by dependency and value, not by section order.

**Sprint 1 — Close the embarrassing gaps (days, not weeks)**
1. `PATCH /companies/{id}` + `GET /companies/{id}` → unblocks B3, 6 areas.
2. `GET /invoices?client_id` and `GET /activity?target_id` → unblocks Client
   360 and the per-invoice timeline, both currently faked by fetching
   everything and filtering in the browser.
3. `GET /products?status` and `?billing_type` → unblocks Catalog's Services and
   Archived views.
4. `GET /vat-rates` and `GET /pdf-templates` → both already exist as Python
   constants (`core/rules/vat.py`, `core/pdf/registry.TEMPLATES`) and just need
   exposing. Removes hardcoded `21/12/6/0` from the frontend.

**Sprint 2 — The VAT report**
`GET /reports/vat?period`. For a Belgian sole trader this is the most valuable
screen in the product and it does not exist. Everything it needs is already in
the database.

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
  exports are real. The status timeline can only show created/issued/paid:
  `/activity` filters by `target_type`, not `target_id`, so a true per-invoice
  history cannot be assembled. Also needs `POST /invoices/{id}/duplicate`.
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

### 6.3 Clients — 1 wired / 3 partial / 3 none

- **Clients list** *(wired)* — full CRUD except delete.
- **Client 360** *(partial)* — Overview totals are computed by fetching every
  invoice and filtering in the browser: correct, but it does not scale. Needs
  `GET /clients/{id}/stats` and `GET /invoices?client_id`. The Quotes and
  Documents tabs have no backend at all.
- **Contacts** *(none)* — `Client` carries one flat email/phone. Multiple named
  contacts per client is a schema change.
- **Client groups** *(none)* — new model and CRUD.
- **Client history / activity** *(partial)* — the audit log is real but cannot
  be scoped to one client without `GET /activity?target_id`.
- **Client documents** *(none)* — blocked on **B2**.

### 6.4 Catalog — 1 wired / 4 partial / 2 none

Mostly *filter* gaps rather than missing data — the model is richer than the
API exposes.

- **Products** *(wired)*.
- **Services** *(partial)* — `billing_type` makes the split derivable but the
  server cannot filter on it, so the UI fetches everything and filters locally.
- **Categories** *(partial)* — `Product.category` is free text. Real categories
  need their own table to be renameable, colourable and orderable.
- **Pricing** *(partial)* — needs a `PriceList`, client-specific pricing and
  bulk updates.
- **Archived** *(partial)* — `ProductStatus.ARCHIVED` exists; the list endpoint
  takes no status filter.
- **VAT rates** *(none)* — `core/rules/vat.py` holds the Belgian logic and
  never exposes it, so the frontend hardcodes 21/12/6/0. **One endpoint fixes
  a correctness risk.**
- **Invoice templates** *(none)* — `core/pdf/registry.TEMPLATES` has four
  templates; no endpoint lists them, so a picker cannot be populated.

### 6.5 Company — 0 wired / 6 partial / 3 none

**Every partial here has the same single cause: no `PATCH` (B3).** Profile,
legal information, VAT/BCE, bank account, numbering and invoice defaults all
exist on the model and are reachable exactly once, at creation.

- **Payment conditions** *(none)* — needs `payment_terms_days` and late-fee
  configuration on `Company`.
- **Branding** *(none)* — blocked on **B2**. `Company.logo_key` is a dangling
  reference today.
- **Company documents** *(none)* — blocked on **B2**.
- Also worth adding: `GET /companies/{id}/vat-validation`, since
  `core/rules/identifiers.py` can already validate Belgian VAT, IBAN and BIC
  checksums but never offers it to the UI.

### 6.6 Reports — 3 wired / 2 partial / 4 none

- **Revenue, outstanding, overdue** *(wired)*.
- **Invoices** *(partial)* — counts aggregated in the browser from the full
  list; wants `GET /reports/invoices`.
- **Payments** *(none)* — `/payments` requires an `invoice_id`. There is no way
  to list payments across invoices at all.
- **VAT** *(none)* — **the most valuable missing report in the product.** For a
  Belgian sole trader the quarterly VAT return is the reason to own the app,
  and every input already exists in the database.
- **Clients / Products** *(none)* — straightforward aggregations.
- **Export** *(partial)* — `/backup/export` is a whole-org JSON backup, not a
  report export. Needs CSV/XLSX/PDF per report.

### 6.7 Billing — 0 wired / 0 partial / 8 none

Entirely unbuilt (Phase 10), blocked on **B4**. Subscription, current plan,
usage, BillGen's own invoices, payment method, billing history,
upgrade/downgrade, cancellation.

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
- **Users & permissions** *(none)* — `OrgMembership` exists in `core/models`,
  is not exposed, and carries no role enum. Roles needed: owner, administrator,
  accountant, employee, viewer.
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

### BGEN-BRAND-02 — navigation model

Sidebar (reference: 11 destinations, 2 groups, count badges) versus TopNav-only
(current: 5 destinations). The earlier decision deleted the sidebar; the
reference's model scales to the 15-section IA considerably better, and the count
badges are real signal.

`SidebarNav` already exists in the library with `category` and `badge` props, so
the component cost of switching is close to zero. This is a product call.

### BGEN-BRAND-03 — icon language

The reference mixes three grammars: custom SVG, `lucide-react`, and emoji.
BillGen currently has one (14 custom SVG icons). Pick one — adopting lucide is
defensible only as a *wholesale replacement*, never alongside.

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
