# Demo (FinanceFlow Bill Generator) vs. New Architecture (BillGen BETA)

**Purpose.** A factual, side-by-side inventory of what the *demo* codebase contains
versus what the *new architecture* contains — which classes, DTOs, models, and
constructions exist on each side, and how each builds the same output (Peppol XML,
PDFs, numbering, totals). This document deliberately does **not** judge which is
better; it maps *what is where and how it is built* so a later pass can decide what
to port, keep, or drop.

- **Demo** = `D:\CODING\FinanceFlow Bill Generator`
- **New**  = `C:\Users\hdr_s\Documents\business model\BillGen BETA` (this repo)

Method: read of both trees (source only, excluding `node_modules`, `.venv`, `dist`,
build artifacts). Line references are to files as they stand at time of writing.

---

## 0. What each codebase actually *is*

The demo is not one app — it is **three overlapping generations** living in one folder.
The new repo is **one coherent generation** that realizes the demo's stated roadmap
(the demo README literally lists "FastAPI backend, PostgreSQL" as its future direction).

| | Demo | New |
|---|---|---|
| **Gen 1 (original)** | `bill_generator.py` (47 KB monolith) + `core/*.py` (SQLite, ReportLab/fpdf2 PDF) + `_archive/ui_v1_customtkinter/` (Tkinter UI) | — (superseded before this repo) |
| **Gen 2 (shipped)** | `frontend/` — React 19 + TS, **localStorage-only**, client-side PDF (jsPDF) + **client-side Peppol** (`lib/peppol.ts`). This is the app end users actually run. | — |
| **Gen 3 (in progress)** | `server/` — Fastify + Drizzle + **Postgres w/ RLS**, `shared/` package. A backend rewrite, partially built. | The whole repo: FastAPI + SQLAlchemy + Postgres/SQLite, 3-layer, desktop + SaaS front ends. |
| **Data of record** | `billgen-*` keys in browser `localStorage` (Gen 2) | Relational DB (`core` domain ↔ `db` rows) |

**Teaching point.** When comparing "the demo," you must say *which generation*. The
Peppol generator and the domain types the users actually exercise live in **Gen 2
(`frontend/` + `shared/`)**. The `server/` (Gen 3) is the closest structural analog to
the new architecture and is the most useful thing to diff against it.

---

## 1. Tech stack, side by side

| Concern | Demo Gen 2 (shipped) | Demo Gen 3 (`server/`) | New (BillGen BETA) |
|---|---|---|---|
| Language | TypeScript | TypeScript | Python 3.14 + TS (front ends) |
| Runtime/host | Browser / Electron | Node (Fastify) | FastAPI (uvicorn) + Tauri sidecar |
| Persistence | `localStorage` | Postgres (Drizzle ORM) | SQLAlchemy → SQLite (desktop) / Postgres (SaaS) |
| Domain logic location | In React components + `lib/` | Fastify route modules | `core/` (pure, framework-free) |
| PDF | jsPDF (client) | — | WeasyPrint + Jinja2 (server, `core/pdf/`) |
| Peppol/UBL | `frontend/src/lib/peppol.ts` (client, string templates) | — | `core/einvoicing/ubl_builder.py` (server, ElementTree) |
| Validation | `shared/src/validation.ts` (mod-97 VAT/IBAN/BIC) | zod on routes | Pydantic model constraints |
| Multi-tenancy | none (single browser) | Postgres **RLS** + `set_config('app.current_company_id')` | Python **ContextVar** (`core/tenancy.py`) + repo filtering |
| Money type | JS `number` | `numeric(12,2)` in DB, `number` in TS | `Decimal` end-to-end (banker's rounding) |

---

## 2. Domain models / DTOs — presence matrix

Entities that exist on each side. "✓" = present as a first-class type/table/model.

| Entity | Demo `shared/types.ts` (Gen 2) | Demo `server/schema.ts` (Gen 3) | New `core/models/` |
|---|---|---|---|
| Company | ✓ `Company` | ✓ `companies` | ✓ `Company` |
| Client | ✓ `Client` | ✓ `clients` | ✓ `Client` |
| Service / Product | ✓ `Service` | ✓ `services` | ✓ `Product` |
| Invoice | ✓ `Invoice` + `SavedInvoice` | ✓ `invoices` | ✓ `Invoice` + `InvoiceLine` |
| Invoice line | inline `{description,price,quantity}` | `jsonb lines` (same shape) | ✓ `InvoiceLine` (structured, own VAT+discount) |
| Credit note | ✗ (only `docType='credit_note'` flag) | ✓ via `docType` on `invoices` | ✓ `CreditNote` + `CreditNoteLine` (separate model) |
| Payment | ✗ (only `status: Paid/Pending`) | ✗ (status enum) | ✓ `Payment` |
| User | ✗ | ✓ `users` | ✓ `User` |
| Org / tenant | ✗ (company *is* the tenant) | company-as-tenant + `memberships` | ✓ `Organization` + `OrgMembership` (org ⊃ company) |
| Membership | ✗ | ✓ `memberships` (owner/member) | ✓ `OrgMembership` |
| Session/token | ✗ | ✓ `sessions` | ✓ `RefreshTokenRow` / JWT |
| Invite | ✗ | ✓ `invites` | ✗ |
| Agenda / calendar | ✓ `AgendaEvent` + `AgendaServiceLine` | ✓ `agenda_events` | ✗ (not ported) |
| Audit log | ✓ `LogEntry` (client log) | ✓ `audit_log` | ✓ `AuditLogEntry` (append-only) |
| Counter/sequence | `billgen-seq-*` string | ✓ `invoice_counters` | ✓ `SequenceRow` |
| VAT rate | `number` (`vatRate`) | `numeric vatRate` | ✓ `VATRate` (rate **+ category**) |
| Discount | ✗ | ✗ | ✓ `Discount` (line + invoice level) |
| Dashboard types | ✓ `ChartDataPoint`,`NewsItem`,`TimelineItem` | — | reporting DTOs in `api/schemas` |

**Notable structural differences (facts, not verdicts):**

- **Tenancy grain.** Demo treats the **company** as the tenant boundary (clients/
  services/invoices hang off `companyId`; a user has `memberships` to companies).
  New inserts an **Organization** above Company (`org ⊃ companies ⊃ clients/invoices`);
  every business row carries `organization_id`.
- **Invoice lines.** Demo stores lines as an unstructured JSON array with exactly
  three fields (`description, price, quantity`) and **one `vatRate` for the whole
  invoice**. New promotes lines to a model where **each line carries its own
  `VATRate` (rate + EN 16931 category) and optional `Discount`**.
- **Credit notes & payments.** Demo encodes these as *flags/enums* on the invoice
  (`docType`, `status: Paid/Pending`). New has **dedicated `CreditNote` and
  `Payment` models** with their own lifecycle and audit trail.
- **Agenda.** A whole feature area (`AgendaEvent`, reminders, VAT cadence) exists in
  the demo and is **absent** from the new architecture.

### 2a. Field-level: Company

| Field (demo) | Field (new) | Note |
|---|---|---|
| `name` | `name` | same |
| — | `legal_name` | new splits legal vs trading name |
| `vat` | `vat_number` | rename |
| — | `registration_number` | new adds explicit KBO/enterprise number field |
| `address` (single string) | `address_line1/2`,`postal_code`,`city` | **demo stores one string, parsed at export; new stores structured fields** |
| `country` (opt, default BE) | `country_code` (default BE) | same intent |
| `email`,`phone` | `email`,`phone` | same |
| `iban`,`bic` | `iban`,`bic` | same |
| `prefix` | `invoice_reference_prefix` | rename |
| `footer` | — | demo-only (PDF footer text) |
| `logoBase64` | `logo_key` | demo inlines base64; new stores a key/reference |
| `currency` | `default_currency` | same |
| `language` | `default_language` | same |
| `defaultTemplate` (A/B/C) | `default_pdf_template` (`fr_standard`…) | different template id scheme |
| `vatCadence`,`vatReminderDaysBefore` | — | demo-only (agenda reminders) |

### 2b. Field-level: Client

| Demo | New | Note |
|---|---|---|
| `name`,`email`,`phone` | same | |
| `address` (string) | `address_line1/2`,`postal_code`,`city` | structured in new |
| `country` | `country_code` | |
| `vat?` | `vat_number?` | |
| — | `contact_person` | new-only |
| — | `is_business` | **new-only; drives EN 16931 VAT category (B2B vs B2C)** |
| — | `notes` | new-only |

---

## 3. Persistence & DB

| | Demo Gen 2 | Demo Gen 3 (`server/drizzle`) | New (`db/`) |
|---|---|---|---|
| Store | `localStorage` JSON strings under `billgen-*` | Postgres | SQLAlchemy 2.x → SQLite or Postgres |
| Schema source of truth | TS interfaces | **hand-written SQL** in `server/drizzle/*.sql` (Drizzle tables are typed views only; RLS/triggers live in SQL) | Alembic migrations (`3d8a27f7f865`, `6cca38efdaf1`) + declarative models |
| Money columns | n/a (JS number) | `numeric(12,2)` | `Numeric(MONEY_PRECISION, SCALE)` |
| Lines storage | JSON string | `jsonb lines` | child `InvoiceLineRow` table |
| Uniqueness | none | PKs + counter PK `(company,year,docType)` | `(org,company,reference)` and `(org,company,sequence_global)` |

**localStorage key map (demo Gen 2), for reference:**

```
billgen-companies                         Company[]
billgen-clients-{companyId}               Client[]
billgen-services-{companyId}              Service[]
billgen-invoices-{companyId}              SavedInvoice[]   (no id; reference is identity)
billgen-paid-status-{companyId}           Record<reference, boolean>
billgen-seq-{companyId}-{clientId}-{YYYY}-{MM}   monthly counter (string)
billgen-agenda-{companyId}                AgendaEvent[]
billgen-log / billgen-error-log           LogEntry[]
```

This is exactly what both import paths (demo `server/.../billgenBackup.ts` and new
`core/imports/legacy_backup.py`) consume — see §10.

---

## 4. Multi-tenancy — two different mechanisms

- **Demo Gen 3:** Postgres **Row-Level Security**. Each request sets
  `set_config('app.current_company_id', <id>, true)` inside the transaction
  (`withUserTx`, `plugins/tenancy.ts`); RLS policies in the hand-written SQL enforce
  that queries only see the current company's rows. Isolation lives **in the database**.
- **New:** a Python **`ContextVar`** (`core/tenancy.py::organization_context`) holds
  the current org id for the request; `TenantBindingMiddleware` sets it from the JWT,
  every repository query filters on `current_organization_id()`, and writes call
  `guard_tenant()`. Isolation lives **in the repository layer**.

**Teaching point.** Same goal (a request can't read another tenant's rows), opposite
placement: demo pushes the guarantee *down into Postgres* (fails closed even if app
code is wrong, but Postgres-only); new keeps it *in application code* (portable to
SQLite for the desktop build, but the guarantee is only as good as the repo layer).

---

## 5. Invoice numbering — three different formats coexist

| | Format | Grain | Where |
|---|---|---|---|
| Demo Gen 2 | `{prefix}{clientInitials(2)}{MM}{nn}{YYYY}` e.g. `FLOW-AC04012026` | **per company + client, monthly** | client-side counter `billgen-seq-*` |
| Demo Gen 3 | `{prefix}{year}-{NNNN}` e.g. `FACT-2026-0001` | **per company + year + docType** | `invoice_counters` + `nextReference()` `FOR UPDATE` |
| New | `{prefix}{initials}{MM}{seq}{YYYY}` (display) + gapless `sequence_global` | per company + monthly bucket; credit notes `CN-{prefix}{YYYY}/{NNNN}` | `core/rules/numbering.py` + `SequenceRow` |

**Teaching point.** The new architecture kept the demo **Gen 2** human-facing format
(`format_display_reference` reproduces `{prefix}{initials}{MM}{seq}{YYYY}` — the
audit even notes seq widening past 2 digits at 100+), *and* added a separate
machine `sequence_global` for gaplessness — whereas the demo's own **Gen 3** backend
abandoned that format for a simpler `year-NNNN`. Both Gen 3 and New assign the legal
number **transactionally under a row lock** so a rollback rolls the counter back
(no gaps). Demo Gen 2 increments a plain localStorage counter (re-export does not
re-increment).

---

## 6. Invoice line & VAT/totals model

| Aspect | Demo (peppol.ts / schema) | New (`core/rules/currency_math.py` + models) |
|---|---|---|
| VAT rate scope | **one `vatRate` for the entire invoice** | **per line** (`InvoiceLine.vat: VATRate`) |
| VAT category | none (rate only; BTCC code derived at export) | EN 16931 category (`S/Z/E/AE/O`) via `pick_category()` |
| Discounts | none | line-level + invoice-level `Discount`, proportionally allocated |
| Rounding | `toFixed(2)` on JS floats | `Decimal` banker's rounding (`quantize`) |
| Totals | `subtotal = Σ price·qty`, `tax = subtotal·rate`, computed at render | `invoice_totals()` computes HT/VAT/TTC once, **stored** on the invoice |
| Category selection | manual (`btccCodeForRate`) | derived from buyer/seller country + B2B + VAT presence |

**Teaching point.** The demo's tax model is "single rate × subtotal." The new model
is a per-line category engine: it decides *domestic / reverse-charge / intra-EU /
export* from the parties (`pick_category`), carries a category on every line, and
groups the UBL `TaxSubtotal`s by `(category, rate)`. This is why the new UBL can
represent a mixed-rate invoice and the demo's cannot.

---

## 7. Peppol / UBL — the flagship comparison

Both produce a Peppol BIS Billing 3.0 / UBL 2.1 `<Invoice>`. Construction differs at
every level.

| | Demo `frontend/src/lib/peppol.ts` | New `core/einvoicing/ubl_builder.py` |
|---|---|---|
| Language / place | TypeScript, **client-side (browser)** | Python, **server-side** |
| Build method | **string template literals** + `escapeXml()` | **ElementTree** (`_cbc`/`_cac` helpers), `ET.indent`, real XML serializer |
| Trigger | "Export UBL XML **draft**" button → `downloadPeppolXml()` | `PeppolService.generate_invoice_xml()` → API endpoint (audited `export_peppol`) |
| Pre-emit validation | **yes** — `validateSupplier`/`validateCustomer` (mod-97 VAT/IBAN/BIC) gate emission; returns `{ok:false, errors}`; **blocks B2C** | none at build time (relies on Pydantic model constraints); light post-hoc `ubl_validator.py` |
| Multi-rate | **no** (single `vatRate`, one `TaxSubtotal`) | **yes** (groups by `(category,rate)`) |
| Discounts in XML | no | yes (`AllowanceCharge`, doc-level) |
| Status labeling | explicit **DRAFT** discipline (filename `-draft.xml`, uncertified copy) | treated as exportable; docstring notes "revisit before AP" |

### 7a. Element-by-element (what each emits)

| UBL element (BT) | Demo | New | Construction note |
|---|:---:|:---:|---|
| `CustomizationID` | ✓ **conditional** | ✓ fixed | **Demo switches to the Belgian `UBL.BE:1.0.0.20180214` profile for BE suppliers**, vanilla BIS otherwise. New always emits vanilla BIS `en16931…peppol…billing:3.0`. |
| `ProfileID` | ✓ | ✓ | identical (`…billing:01:1.0`) |
| `ID` (BT-1) | ✓ | ✓ | invoice reference |
| `IssueDate` (BT-2) | ✓ (from `createdAt`) | ✓ | |
| `DueDate` (BT-9) | ✓ (issue + 30d, computed) | ✓ (from `invoice.due_date`) | demo derives; new stores |
| `InvoiceTypeCode` 380 | ✓ | ✓ | |
| `Note` | ✗ | ✓ (`invoice.comments`) | |
| `DocumentCurrencyCode` | ✓ | ✓ | |
| `BuyerReference` (BT-10) | ✓ = `buyerReference ?? reference` | ✓ = **`client.name`** | **demo falls back to the invoice reference (a real BT-10); new currently puts the client name here** |
| `AdditionalDocumentReference` ×2 | ✓ (ubl-BE-01/02/03: `UBL.BE` marker + `CommercialInvoice`) | ✗ | demo-only; required by the Belgian profile it targets |
| Supplier `EndpointID` (BT-34) | ✓ `0208` (BE) / `9925` (non-BE) | ✓ `0208` (BE only) | **demo handles non-BE via 9925; new derives 0208 from VAT digits, BE-only** (added this session) |
| Buyer `EndpointID` (BT-49) | ✓ `0208`/`9925` | ✓ `0208` (BE only) | same divergence |
| `PartyName` / `PostalAddress` / `Country` | ✓ (address **parsed from one string**) | ✓ (from **structured fields**) | demo `parseAddress()` splits on commas + postal regex; new reads discrete columns |
| `PartyTaxScheme/CompanyID` (VAT) | ✓ both parties | ✓ both parties | |
| `PartyLegalEntity/RegistrationName` | ✓ | ✓ | |
| `PartyLegalEntity/CompanyID schemeID=0208` (BT-30) | ✓ (BE seller, KBO) | ✗ | demo-only |
| `Contact/ElectronicMail` | ✓ both parties | ✗ | demo-only |
| `PaymentMeans/PaymentMeansCode` 30 | ✓ | ✓ | credit transfer |
| `PaymentMeans/PaymentID` | ✓ **OGM-VCS structured communication** | ✗ | demo generates `+++DDD/DDDD/DDDXX+++` |
| `PayeeFinancialAccount/ID` (IBAN) + `FinancialInstitutionBranch/ID` (BIC) | ✓ | ✓ | |
| `PaymentTerms/Note` | ✓ (`comments` or default) | ✓ (`payment_terms`) | |
| `TaxTotal` / `TaxSubtotal` | ✓ single subtotal, `TaxCategory` carries `ID` + **`Name`=BTCC** + `Percent` | ✓ **N subtotals grouped by (category,rate)**, exemption reason for AE/export | **demo adds the Belgian BTCC code in `cbc:Name` (00/01/02/03/45); new adds `TaxExemptionReason` for zero-VAT categories** |
| Line `TaxTotal` (per line) | ✓ (line-level `TaxAmount`) | ✗ (only classified category on the item) | demo emits per-line tax |
| `AllowanceCharge` (discount) | ✗ | ✓ (doc-level) | new-only |
| `LegalMonetaryTotal` | ✓ | ✓ | both emit LineExtension/TaxExclusive/TaxInclusive/Payable; new adds `AllowanceTotalAmount` when discounted |
| `InvoiceLine` | ✓ | ✓ | both: ID, InvoicedQuantity `C62`, LineExtension, Item/Name, ClassifiedTaxCategory, Price |

**Teaching point (Peppol).** The two generators are almost mirror images of each
other's strengths:
- The **demo** is deeper on **Belgian localisation** — it targets the stricter
  `UBL.BE` profile, emits the `AdditionalDocumentReference` markers that profile
  requires, carries the BTCC tax-category code, the KBO `CompanyID`, party contact
  email, and a real **OGM-VCS structured payment communication** — and it *validates
  parties (mod-97) and blocks B2C before it will emit a single tag.*
- The **new** builder is deeper on the **EN 16931 tax engine** — real `Decimal`
  math, **per-line VAT categories**, **multi-rate `TaxSubtotal` grouping**,
  **document-level discounts**, exemption reasons — and it builds via a real XML
  serializer rather than string interpolation, but it currently emits only vanilla
  BIS (no `UBL.BE` profile), misuses `BuyerReference`, and has no structured
  communication or party-contact/legal-id elements.

### 7b. The demo's "draft" gate (worth noting for later)

The demo README encodes a **labeling contract**: the export button may only read
"Export Peppol XML" (instead of "Export UBL XML draft") after (1) `npm run
test:peppol` passes against a committed golden fixture, (2) that golden XML passes the
official Helger validator with zero errors, and (3) a real Access-Point round-trip
succeeds. Until then, files are named `invoice-<ref>-draft.xml`. There are golden
tests: `frontend/src/lib/__tests__/peppol.golden.test.ts`. The new repo instead has
`tests/core/services/test_peppol_service.py` (field assertions) and the light
`ubl_validator.py`; neither side has yet run the official schematron.

---

## 8. Validation layer

| Validator | Demo `shared/validation.ts` | New |
|---|:---:|:---:|
| Belgian VAT mod-97 (`BE`+10, 97−(base%97)) | ✓ `validateBelgianVat` | ✗ |
| VAT canonicalisation (`canonicalizeVat`, 9→10 digit padding) | ✓ | ✗ |
| IBAN ISO 13616 mod-97 + per-country length | ✓ `validateIban` (`IBAN_LENGTHS`) | ✗ |
| BIC ISO 9362 position-aware | ✓ `validateBic` | ✗ |
| ISO country allow-list | ✓ `ISO_COUNTRY_CODES` | partial (`EU_MEMBER_STATES` in `vat.py`, different purpose) |
| OGM-VCS structured communication | ✓ `generateBelgianStructuredCommunication` | ✗ |
| Supplier/customer field gate w/ typed `FieldError[]` | ✓ | ✗ (Pydantic field constraints only) |

**Teaching point.** The demo has a **dedicated, standards-referenced Belgian
validation module** (mod-97 for VAT and IBAN, ISO 9362 for BIC, OGM-VCS generation)
that runs before Peppol export. The new architecture relies on **Pydantic type/length
constraints** on the models and has **no equivalent numeric-checksum validation** —
this is one of the clearest "exists in demo, absent in new" gaps.

---

## 9. PDF generation

| | Demo Gen 1 (`core/invoice_engine.py`) | Demo Gen 2 (`frontend/lib/generatePdf.ts`) | New (`core/pdf/`) |
|---|---|---|---|
| Engine | ReportLab (desktop) / fpdf2 (Android fallback), auto-detected | jsPDF + autotable (browser) | WeasyPrint + Jinja2 (server) |
| Layout | absolute coordinates (mm/pt), hand-placed | jsPDF templates A/B/C | HTML/CSS Jinja templates |
| Templates | one FR layout | 3 (FR×2, NL×1) | 4 (`fr_standard`,`fr_detailed`,`nl_minimal`,`credit_note`) |
| Totals in PDF | `total_ht`, `tva`, `total_ttc` from floats | client-side | from stored `Decimal` totals |
| Native deps | reportlab/fpdf2 | none (pure JS) | **WeasyPrint native stack (Pango/GTK)** — the one skipped test |

**Teaching point.** PDF has moved location every generation: **native Python libs
(Gen 1) → pure client JS (Gen 2) → server HTML→PDF (New)**. The new approach is the
only one that renders from the same stored `Decimal` totals used for the legal record.

---

## 10. Legacy import / backup

Both the demo's Gen 3 and the new architecture can ingest a **Gen 2 `billgen-*`
backup**. Same input, different scope and safety posture.

| Aspect | Demo `server/.../billgenBackup.ts` | New `core/imports/` + `ImportService` |
|---|---|---|
| Input | `{app, schemaVersion, createdAt, keys}` (zod-validated) | same shape, lenient (`parse_backup`, tolerates raw `keys` map or pre-parsed values) |
| Companies / clients / services | ✓ imported | ✓ imported (companies, clients, products) |
| **Historical invoices** | ✓ **imported** as `finalized`/`paid` with original refs; seeds `invoice_counters` past history | ✗ **deliberately not imported** — counted as `invoices_detected` and surfaced, to avoid minting live gapless numbers |
| Agenda events | ✓ imported (normalizes deprecated `serviceId`) | ✗ (no agenda in new) |
| Id remapping | legacy string ids → fresh uuids | legacy ids → fresh uuids, per-scope name dedup (idempotent) |
| Plan limits | ✓ enforces `maxCompanies`, template entitlement | not in import path |
| Dry-run | ✗ (single commit) | ✓ **preview vs commit** (`POST /imports/legacy/{preview,commit}`) |
| Purity | Fastify route (I/O bound) | pure parser (`legacy_backup.py`) + mappers, service does the I/O |

**Teaching point.** The demo importer is more *complete* (it brings historical
invoices and agenda across, seeds the counter). The new importer is more *cautious*
(refuses to recreate legally-binding invoice numbers as an import side effect;
offers a dry-run preview). Same source format, opposite trade-off on historical data.

---

## 11. Auth, plans, entitlements

| | Demo Gen 3 | New |
|---|---|---|
| Users/sessions | `users`, `sessions` (token hash), `invites` | `User`, JWT access+refresh (`RefreshTokenRow`, rotating), argon2id |
| Plans | `plan: free/plus/pro` on user; `entitlementsFor()` (maxCompanies, templateChoice, `BASIC_TEMPLATE`) | `SubscriptionRow` exists; **plan enforcement not yet built (Phase 10)** |
| TOTP | `totpSecret` column present | ✗ |
| Admin/invites | `is_admin`, invite flow, `create-admin` script | ✗ |
| Desktop bootstrap | ✗ | ✓ `POST /auth/desktop-bootstrap` (singleton local session, gated by `desktop_mode`) |

**Teaching point.** The demo's Gen 3 has a **working plan/entitlement model** (and
enforces it *inside the import path*). The new architecture has the *table*
(`SubscriptionRow`) but the enforcement is an open phase. Conversely, the new
architecture has a **desktop auto-login path** the demo lacks.

---

## 12. Feature-surface delta (quick index)

Present in demo, **not** in new architecture:
- **Agenda / calendar** (`AgendaEvent`, `serviceLines`, VAT-cadence reminders).
- **Belgian mod-97 / IBAN / BIC / OGM-VCS validation** module.
- **UBL.BE Belgian profile** + BTCC codes + structured payment communication in Peppol.
- **Invites / admin / TOTP** scaffolding.
- **Service extended CRM-ish fields** (`billingType`, `pipeline`, `status`, `tags`,
  `templateKey`, `isSuggested`, `isCustomized`).
- **Historical-invoice + agenda import.**
- **Per-company footer text**, plan entitlements.

Present in new architecture, **not** in demo:
- **Organization layer** above company; ContextVar tenancy portable to SQLite.
- **Per-line VAT categories + multi-rate tax engine + `Decimal` math + discounts.**
- **Dedicated `CreditNote` and `Payment` models** (vs. flags).
- **Append-only audit + reporting services**, gapless `sequence_global`.
- **Server-side HTML→PDF** from stored totals; **credit-note template**.
- **3-layer separation** (`core` has no framework imports) + generated FE types from OpenAPI.
- **Desktop (Tauri sidecar) + SaaS** dual front ends over one API.
- **Import dry-run preview**; refusal to mint historical invoice numbers.

---

## 13. Where to look (file index)

**Demo (`D:\CODING\FinanceFlow Bill Generator`):**
- Peppol: `frontend/src/lib/peppol.ts`; golden `frontend/src/lib/__tests__/peppol.golden.test.ts`
- Validation: `shared/src/validation.ts`
- Types: `shared/src/types.ts`, `frontend/src/types/index.ts`
- Server schema: `server/src/db/schema.ts` (+ DDL/RLS in `server/drizzle/*.sql`)
- Numbering: `server/src/modules/invoices/numbering.ts`
- Import: `server/src/modules/import/billgenBackup.ts`
- PDF (Gen 1): `core/invoice_engine.py`; (Gen 2) `frontend/src/lib/generatePdf.ts`
- Peppol spec docs: `docs/PEPPOL_SPEC_{EN,FR,NL}.md`

**New (this repo):**
- Peppol: `core/einvoicing/ubl_builder.py`, `ubl_validator.py`; tests `tests/core/services/test_peppol_service.py`
- Tax/rules: `core/rules/{vat,currency_math,numbering,discounts,belgian_legal}.py`
- Models: `core/models/*.py`; Tenancy: `core/tenancy.py`
- DB: `db/models/*.py`, `db/migrations/`
- Import: `core/imports/legacy_backup.py`, `core/imports/mappers.py`, `core/services/import_service.py`
- PDF: `core/pdf/` (registry, renderer, templates)
- Full map: `HANDOFF.md`

---

*Prepared as a neutral inventory. No port/keep/drop decisions taken here — that is the
next pass.*
