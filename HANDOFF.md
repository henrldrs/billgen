# BillGen — Session Handoff

Greenfield 3-layer rebuild of a Belgian invoicing app. This document is the map:
what exists, where it lives, how the pieces connect, and how to run and test it.
Read this instead of re-deriving context.

---

## 0. Status at a glance

| | |
|---|---|
| Location | `C:\Users\hdr_s\Documents\business model\BillGen BETA` |
| Phases done | 0–9, **11** (domain → rules → DB → services → API → business routers → UI kit → SaaS shell → desktop → legacy import) + **Peppol e-invoicing** (Helger-validated Peppol BIS 3.0 + Belgian elements + pre-export validation gate; `771e903` then switched off UBL.BE). Phase 10 (billing) not yet started. |
| UI library | **Its own package `@henrioutai/ui`** (`henrioutai-ui/`, extracted `5a81cfd`) — the design system (58 components + 14 icons + tokens/CSS/fonts), token-only, business-free, **public-ready** (MIT). `@billgen/ui` (frontend-react) keeps the business half (API client, generated types, hooks, panels) and re-exports the design system, so `import { Button } from "@billgen/ui"` still works. Both shells run TopNav-only nav (sidebar deleted), OrgSwitcher, AccountMenu, ⌘K palette, SettingsShell (Import + Backup + Activity + theme). Dark mode = one token remap, persisted pre-paint. Dep graph: `@henrioutai/ui` (leaf) ← `@billgen/ui` ← shells. `docs/frontent build/component-library/` is the archived record + preview gallery. Desktop (Tauri) shell same layout (`c09f0f7`; Tauri window not relaunched). See §3 + §9. |
| Tests | **Python 298 passed, 0 skipped** (`python -m pytest tests`); **frontend 107 passed** (`npm run test --workspace @billgen/ui`) |
| Git | local only, **not pushed** — no remote yet (Henri setting up a private GitHub; this is the top safety-net gap). One commit + tag per phase (`phase-4` … `phase-9b`); later work committed on `main` without tags. CI workflow (`.github/workflows/ci.yml`) is written and waiting for that remote. Branch `main`. |
| PDF engine | **Headless Chromium via Playwright** (primary, cross-platform incl. Windows/desktop) with **WeasyPrint** as a fallback for the Docker/SaaS image. Setup on a fresh box: `pip install playwright` then `python -m playwright install chromium`. Without any engine, `/pdf` returns a clean 503. Free-tier PDFs carry a subtle "Made with BillGen" footer + logo. |
| Not a migration | The legacy React/Python apps (`D:\CODING\audit-v2-react-exe`, `myshop-*`) are reference only. Do not edit them. The **approved Peppol reference** is `D:\CODING\FinanceFlow Bill Generator` (the demo) — inventoried in [docs/COMPARISON_demo_vs_new.md](docs/COMPARISON_demo_vs_new.md). |
| Audit progress | The demo was formally audited (`D:\CODING\audit-v2-react-exe`, Apr 2026). How this rebuild answers those findings is scored in [docs/AUDIT_PROGRESS_vs_demo.md](docs/AUDIT_PROGRESS_vs_demo.md) — see §0.1 below. |

Design decision of record: [docs/ARCHITECTURE/ADR-0001-three-layer.md](docs/ARCHITECTURE/ADR-0001-three-layer.md).

---

## 0.1 Audit progress vs. the audited demo (Apr 2026 → now)

The shipped demo (React + localStorage, at `D:\CODING\audit-v2-react-exe`) was audited
across three tracks: **A. SaaS/commercial** (`00`–`15`, verdict *do not launch*,
**51%**), **B. mom/private-use** (`BETA VERSION/audit 29-4`), and the **C. Electron
portable EXE** it built. Full finding-by-finding scoring is in
[docs/AUDIT_PROGRESS_vs_demo.md](docs/AUDIT_PROGRESS_vs_demo.md). Summary:

- **The rebuild closed the engineering / data-integrity / compliance half; the
  commercial-launch half is still untouched (by design — it's Phase 10+).** Indicative
  weighted re-score: **~2.54 (51%) → ~3.17 (~63%)**, still under the audit's 70% launch
  line, and the entire remaining gap is in categories **10 Monetization / 11 Support /
  12 Legal**.
- **Solved at the root:** localStorage → real DB; gapless numbering (row-locked, no
  hard-delete); mock dashboard → real KPIs; **zero tests → 206 Py + 38 FE**; deeper
  Peppol (multi-rate + Helger-validated BIS 3.0 + structured comm + pre-export gate); plus net-new
  **backend + tested multi-tenancy** the demo never had.
- **Partly done:** desktop `.exe` (Tauri shell compiles clean, but no signed installer /
  frozen sidecar — Phase 12); license (`desktop/licensing.py` verifies Ed25519, but no
  activation flow / plan gating).
- **Still open (the whole commercial layer):** EV code-signing, EULA/privacy/legal
  entity, checkout/Merchant-of-Record, product telemetry, support inbox, accountant
  sign-off.
- **Debts the rebuild carries:** agenda/VAT-reminder feature not ported; the live
  shells still look plainer than the demo (the premium component library that closes
  this gap is finished, but only in isolation — see the UI-library row in §0);
  Access-Point round-trip still untested (Helger schematron validation has since
  **passed** on both BE and non-BE samples); historical invoices deliberately not
  imported.

---

## 1. Run it yourself

Double-click **`billgen.bat`** (repo root). Menu:

- **[1] Web app** — starts the FastAPI API (port 8000) and the SaaS UI (port 5173) in two windows and opens the browser. Sign up with any email + 8-char password. This is the easiest way to exercise the whole product.
- **[2] Desktop app** — launches the native Tauri window (first run compiles Rust for a few minutes; then it's fast). Self-contained: its own SQLite in `%APPDATA%\BillGen`, auto-logs-in, no signup.
- **[3] Run all tests** — Python + frontend.
- **[4] First-time setup** — `npm install` + DB migrate (only needed on a fresh clone).

The web app and desktop app are two independent front ends over the **same** API and domain code.

---

## 2. Architecture — the three layers

```
FRONTENDS (Layer 3)          frontend-saas/   frontend-electron/   (both consume @billgen/ui)
        │  HTTPS + JWT
        ▼
API (Layer 2)                api/             FastAPI: routing, auth, tenant scoping, validation
        │  Python calls
        ▼
CORE (Layer 1)               core/            pure Python: models, rules, services, PDF, UBL
        │  repository ports (abstract)
        ▼
DB layer                     db/              SQLAlchemy + Alembic; SQLite (desktop) or Postgres (SaaS)
```

**The rule that makes it a real separation:** dependencies only point downward.
`core/` imports no FastAPI, no ORM, no React. `api/` calls `core/`, never the
reverse. Frontends only speak HTTP. Types on the frontend are **generated** from
the API's OpenAPI schema, so the UI cannot drift from the server contract.

---

## 3. Repository map (dir by dir)

### `core/` — Layer 1, pure business logic (no framework imports)

| Path | Key names | Purpose |
|---|---|---|
| `core/models/_base.py` | `DomainModel`, `IdentifiedModel`, `TenantModel` | Pydantic bases. `extra="forbid"`; `TenantModel` adds `organization_id`. Money is `Decimal`. |
| `core/models/*.py` | `Organization`, `User`, `OrgMembership`, `Company`, `Client`, `Product`, `Invoice`+`InvoiceLine`, `CreditNote`+`CreditNoteLine`, `Payment`, `AuditLogEntry`, `VATRate`, `Discount`, `Currency` | Domain models. Source of truth for shapes. |
| `core/rules/currency_math.py` | `invoice_totals()`, `line_totals()`, `quantize()`, `InvoiceTotals` | HT/VAT/TTC with **banker's rounding**; invoice-level discount allocated proportionally across lines. |
| `core/rules/vat.py` | `pick_category()`, `build_rate()`, `EU_MEMBER_STATES` | Belgian VAT category logic (domestic / reverse-charge / export). |
| `core/rules/numbering.py` | `client_initials()`, `format_display_reference()`, `format_credit_note_reference()` | Legacy display reference `{prefix}{initials}{MM}{seq}{YYYY}`; credit-note `CN-{prefix}{YYYY}/{NNNN}`. |
| `core/rules/discounts.py` | `discount_amount()` | Percentage / fixed (capped at base). |
| `core/rules/belgian_legal.py` | `legal_mention_for()`, `mandatory_mentions_for_invoice()` | Mandatory legal mentions FR/NL/EN/ES. |
| `core/rules/identifiers.py` | `canonicalize_vat()`, `validate_belgian_vat()`, `validate_iban()`, `validate_bic()`, `ISO_COUNTRY_CODES` | Belgian identifier checksums (VAT mod-97, IBAN ISO 13616, BIC ISO 9362). Ported from the approved demo; feeds the Peppol gate. |
| `core/rules/belgian_peppol.py` | `structured_communication()`, `btcc_code()`, `peppol_endpoint()` | OGM-VCS structured payment communication; Belgian tax-category code (BTCC); Peppol EndpointID scheme (BE 0208 / non-BE 9925). |
| `core/tenancy.py` | `organization_context()`, `current_organization_id()`, `guard_tenant()`, `TenantContextError`, `TenantViolationError` | **The multi-tenant backbone.** A `ContextVar` holds the current org. |
| `core/repository/` | abstract `*Repository` ports + `UnitOfWork`; `sequence_repo` (`INVOICE_SERIES`, `CREDIT_NOTE_SERIES`, `monthly_bucket()`) | Storage-agnostic interfaces. No `org_id` params — read from context. No invoice hard-delete; audit log is append-only. |
| `core/services/` | `InvoiceService`, `CreditNoteService`, `PaymentService`, `Company/Client/Product/Organization/Activity/ReportingService`, `PdfService`, `PeppolService`, `ImportService`; `peppol_validation.validate_peppol_parties()`; `errors.py` (`NotFoundError`, `BusinessRuleError`, `PeppolValidationError`, `FieldError`); `_audit.record()`; `numbering_service` | **Use-cases.** Each opens one `UnitOfWork`, does the work, writes an audit entry, commits once. `PeppolService` runs the party-validation gate before building XML. |
| `core/imports/` | `parse_backup()`, `map_company/map_client/map_product`, `ImportReport`, `MappingError`, `APP_NAME` | Pure legacy-import layer: parses a `FinanceFlow BillGen` backup (`{app, keys}` with `billgen-*` localStorage keys) and maps its records onto domain models. No framework, no I/O. |
| `core/pdf/` | `registry` (`TEMPLATES`, `get_template`), `renderer` (`render_html`, `html_to_pdf`, `PdfEngineUnavailableError`), `context` (`build_invoice_context`, `branded`), `templates/*.html.j2`, `assets/billgen_logo.png` (generated — see `assets/brand/`) | Server-side PDF via Jinja2 → **headless Chromium (Playwright), WeasyPrint fallback**. 4 templates: fr_standard, fr_detailed, nl_minimal, credit_note. Draft PDFs are watermarked; free-tier PDFs carry a "Made with BillGen" footer + the embedded **mark** (not the text lockup) at 16px (`branded` flag = seam for paid-tier removal). |
| `core/einvoicing/` | `ubl_builder.build_invoice_ubl()`, `ubl_validator.validate_invoice_ubl()` | **Standard Peppol BIS Billing 3.0** / UBL 2.1 XML (stdlib ElementTree), Helger-validated (2026.5). BE sellers additionally carry the Belgian elements BIS accepts — EndpointIDs, OGM-VCS structured communication (`PaymentID`), KBO legal id, party contact — layered over the EN 16931 multi-rate/discount engine. (The older UBL.BE profile/markers/BTCC were dropped — see §9.) |
| `core/utils/` | `money.format_amount()`, `dates.format_date()`, `jsonsafe.json_safe()` | Formatting + audit-log JSON safety (Decimal→str). |

### `db/` — persistence (implements the core ports)

| Path | Key names | Purpose |
|---|---|---|
| `db/models/_base.py` | `Base`, `TenantRowMixin`, `IdentifiedRowMixin`, `MONEY_PRECISION/SCALE` | SQLAlchemy 2.x declarative base; `organization_id` on every business table via the mixin. |
| `db/models/*.py` | `OrganizationRow`, `UserRow`, `CompanyRow`, `ClientRow`, `ProductRow`, `InvoiceRow`+`InvoiceLineRow`, `CreditNoteRow`+`CreditNoteLineRow`, `PaymentRow`, `SequenceRow`, `AuditLogRow`, `SubscriptionRow`, `UserCredentialRow`, `RefreshTokenRow` | ORM rows. Unique constraints enforce `(org, company, reference)` and `(org, company, sequence_global)`. |
| `db/repositories/sqlalchemy_repositories.py` | `SqlAlchemy*Repository` | Port implementations. Every query filters on `current_organization_id()`; writes call `guard_tenant()`. |
| `db/repositories/unit_of_work.py` | `SqlAlchemyUnitOfWork` | Transaction boundary wiring all repos to one session. |
| `db/repositories/mappers.py` | `invoice_to_row`, `row_to_invoice`, … | Flatten nested VAT/discount value objects into columns. |
| `db/engine.py`, `db/session.py` | `make_engine()`, `make_session_factory()` | SQLite (with FK pragma) or Postgres from a URL. |
| `db/migrations/` | Alembic; `3d8a27f7f865` (initial), `6cca38efdaf1` (auth tables) | `env.py` reads `DATABASE_URL`; batch mode for SQLite. |

### `api/` — Layer 2, FastAPI

| Path | Key names | Purpose |
|---|---|---|
| `api/main.py` | `create_app(settings, engine)` | App factory (testable). Wires middleware, exception handlers (`NotFoundError`→404, `BusinessRuleError`→409, `TenantViolationError`→403, `PdfEngineUnavailableError`→503), all routers. `app.state`: `settings`, `session_factory`, `uow_factory`, `auth_service`, `codec`. |
| `api/config.py` | `Settings`, `get_settings()` | pydantic-settings. Fields: `database_url`, `jwt_secret`, `cors_origins`, `rate_limit_per_minute`, `desktop_mode`. |
| `api/middleware/tenant.py` | `TenantBindingMiddleware` | Decodes the JWT, binds `org_id` into `organization_context()` for the request. Public allowlist: `/auth/*`, `/healthz`, `/readyz`, `/docs`, `/openapi.json`. |
| `api/middleware/ratelimit.py` | `RateLimitMiddleware` | In-memory sliding window per IP. |
| `api/security/jwt.py` | `JwtCodec`, `TokenPair` | HS256 access (15 min) + refresh (30 d), `jti` claim. |
| `api/security/password.py` | `hash_password`, `verify_password` | argon2id. |
| `api/security/auth_service.py` | `AuthService` (`signup`, `login`, `refresh`, `logout`, `desktop_bootstrap`), `DESKTOP_EMAIL` | Composes ORM rows directly (users/orgs/credentials/refresh tokens). Refresh tokens rotate (single-use). |
| `api/deps.py` | `get_uow_factory`, `get_auth_service`, `current_user_id`, `current_role` | FastAPI dependencies. |
| `api/routers/*.py` | `health, auth, desktop, users, organizations, companies, clients, products, imports, invoices, credit_notes, payments, reports, activity` | Thin HTTP → service translation. `imports` exposes `POST /imports/legacy/{preview,commit}` (dry-run vs. write). |
| `api/schemas/*.py` | request/response Pydantic DTOs | Separate from domain models. |

### `desktop/` — desktop sidecar core (pure Python, toolchain-independent)

| Path | Key names | Purpose |
|---|---|---|
| `desktop/paths.py` | `app_data_dir()`, `database_url()`, `secret_path()`, `license_path()` | `%APPDATA%\BillGen` locations. |
| `desktop/bootstrap.py` | `run()`, `find_free_port()`, `prepare_database()`, `configure_environment()`, `load_or_create_secret()` | The sidecar entrypoint (`python -m desktop.bootstrap`): migrate-on-boot, pick port, print `BILLGEN_SIDECAR port=N`, serve uvicorn. |
| `desktop/licensing.py` | `verify_license()`, `sign_license()`, `check_license()`, `generate_keypair()`, `LicenseInfo`, `LicenseError` | Ed25519 offline license verification. |

### `henrioutai-ui/` — `@henrioutai/ui`, the design system (public-ready, business-free)

Extracted from `@billgen/ui` (`5a81cfd`) so it can go public (MIT) while the
BillGen engine stays private. Depends only on React. This is the source of
truth for every component; `@billgen/ui` re-exports it.

| Path | Purpose |
|---|---|
| `src/components/` (+ `icons/`) | 58 components + 14 icons. Token-only (`var(--bg-*)`), no data layer, no `t()`. Consumed at source (`main` → `src/index.ts`); npm-publish wants a `dist` build (README). |
| `src/styles/` | `tokens.css` (the remap layer), `components.css` (the `.bg-*` classes), `fonts.css` + `fonts/` (Satoshi, Geist Mono). Dark mode = `:root[data-bg-theme="dark"]`. Shells import these via `@henrioutai/ui/styles/*`. |
| `src/index.ts`, `package.json`, `README.md`, `LICENSE` | Public API + publish-shaped package metadata. |

### `frontend-react/` — `@billgen/ui`: BillGen business UI (consumes `@henrioutai/ui`)

| Path | Key names | Purpose |
|---|---|---|
| `src/lib/apiClient.ts` | `ApiClient`, `MemoryTokenStore`, `TokenStore`, `ApiError` | Typed HTTP client. **Pluggable token storage** (kit never touches localStorage). One refresh+retry on 401 → `onAuthLost`. `desktopBootstrap()` for the desktop app. |
| `src/types/api.d.ts` | generated | From the API's `openapi.json`. Regenerate: `npm run generate:api` in `frontend-react/`. |
| `src/providers/BillGenProvider.tsx` | `BillGenProvider`, `useApi` | React Query + ApiClient context. |
| `src/hooks/queries.ts` | `useClients`, `useInvoices`, `useInvoicePreview`, `useCreateInvoice`, `useVoidInvoice`, `useIssueCreditNote`, `useRecordPayment`, `useKpi`, `useRevenue`, `useActivity`, `useCompanies`, `useProducts`, `useBackupExport`, `useBackupRestore`, … | Server-state hooks with cache invalidation. |
| `src/hooks/useAuth.tsx` | `AuthProvider`, `useAuth` | In-memory session (the SaaS shell adds persistence on top). |
| `src/index.ts` | — | Re-exports the design system (`export * from "@henrioutai/ui"`) + the business surface, so `import { Button, InvoiceBuilderPanel } from "@billgen/ui"` still resolves. |
| `src/panels/` | `ClientsPanel`, `ProductsPanel`, `InvoiceBuilderPanel`, `HistoryPanel`, `DashboardPanel`, `ActivityPanel`, `CompanyForm`, `ImportPanel`, `BackupPanel` | Dumb panels: data via hooks, `t()` for i18n, no math; import components from `@henrioutai/ui`. |
| `src/lib/format.ts` | `formatMoney`, `formatDate`, `monthName` | Display-only (Intl). **Not** the legally binding server formatting. |

### `frontend-saas/` — public web app

| Path | Key names | Purpose |
|---|---|---|
| `src/lib/api.ts` | `LocalStorageTokenStore`, `api` | Token persistence lives **here** (the shell), injected into the kit's ApiClient. |
| `src/auth/session.tsx` | `SessionProvider`, `useSession` | Bootstraps from persisted tokens via `GET /users/me` on reload. |
| `src/pages/AppShell.tsx` | `AppShell` | Sidebar + company selector; first-run onboarding via `CompanyForm`; panel language follows `company.default_language`. |
| `src/pages/{LoginPage,SignupPage,routes}.tsx`, `src/App.tsx` | routing, `RequireAuth` | react-router; mounts kit panels. |
| `src/styles.css` | `.bg-*` | Design tokens + full styling of the kit's classes. |

### `frontend-electron/` — Tauri desktop app

| Path | Key names | Purpose |
|---|---|---|
| `src-tauri/src/main.rs` | `spawn_sidecar()`, `api_base_url` command, `SidecarState` | Rust shell: spawns `python -m desktop.bootstrap`, reads the port line, drains stdout, waits, kills sidecar on exit. |
| `src-tauri/tauri.conf.json` | — | Window, scoped CSP (allows localhost API), NSIS bundle, icons. |
| `src-tauri/icons/`, `public/favicon.*` | — | Generated from `assets/brand/billgen-mark.svg`; never hand-edit. Were a generic blue placeholder until `2026-08-25`. |
| `src-tauri/capabilities/default.json` | — | `core:default` for the `main` window. |
| `src/lib/api.ts` | `createApi()`, `tokenStore` | Resolves the sidecar port via `invoke('api_base_url')`; falls back to a dev URL outside Tauri. |
| `src/App.tsx`, `src/DesktopShell.tsx` | boot flow + tab shell | Auto-login via `desktopBootstrap()`, then mounts the 7 kit panels (no login chrome). |

### `assets/brand/` — the mark, and everything rendered from it

`billgen-mark.svg` is the **single source of truth** for the BillGen mark
(the invoice page whose right edge forms a B). Hand-authored geometry, not a
trace: page corners are r=26 on the stroke centreline, the lower bowl is a
circle (centre 213,330 r=103), the euro ring is a circle (centre 129,334 r=38).

`python scripts/generate_brand_assets.py` renders **every** raster from it via
Playwright's Chromium (already a PDF dependency) — 25 files:

| Output | What it is |
|---|---|
| `core/pdf/assets/billgen_logo.png` | free-tier PDF footer, **mark only**, transparent, 256px tall |
| `frontend-electron/src-tauri/icons/*` | desktop + Windows Store icons, `.ico`, `.icns` |
| `frontend-electron/src-tauri/icon-source.png` | 1024px tile, so a future `tauri icon` run starts from the real mark |
| `frontend-{saas,electron}/public/favicon.{svg,ico}`, `apple-touch-icon.png` | browser tabs |

Two colourways, both generated: **on light** (canonical `#334155` / `#10B981`)
for paper and in-app, and **on an ink tile** (`#1F2937` ground, white outline,
emerald-400 accent) for app icons and favicons — navy-on-transparent vanishes
against dark taskbars and browser chrome.

The web copy of the geometry lives in `henrioutai-ui/src/components/LogoMark.tsx`,
which paints the same paths with `var(--bg-navy)` / `var(--bg-accent)` so the
mark retints with the token layer. **Edit the geometry in both** — the SVG for
rasters, the TSX for the web — and re-run the script.

> `docs/frontent build/logo_refractor/` is the **superseded** auto-trace that
> this replaced (wobbly strokes, misshapen bowl). Kept as a record; do not
> re-trace from it. The only asset there still worth anything is
> `billgen_icon_transparent_master.png`, the clean 350x453 crop of the original
> that the current geometry was measured against.

### `docs/frontent build/component-library/` — isolated UI library build (NOT wired in)

The from-scratch premium component set (Henri's drawings + brand tokens; no
open-source extraction), built outside the live packages **on purpose**:

| Path | Purpose |
|---|---|
| `components/*.tsx` (+ `icons/`) | 57 components + IconChip and 13 hand-drawn icons — the exact files that later get copied into `frontend-react/src/components/`. |
| `styles/tokens.additions.css`, `styles/components.additions.css` | Token-only `--bg-*` / `.bg-*` additions to append to the real `tokens.css` / `components.css`. Dark mode = one token remap under `:root[data-bg-theme="dark"]`, zero component-CSS changes. |
| `styles/fonts.css` + `fonts/` | Satoshi (UI face) + Geist Mono (numbers & identifiers, the `.bg-num` utility). |
| `index.additions.ts` | Export lines to append to `frontend-react/src/index.ts`. |
| `preview/` + `open-preview.cmd` | Batch-selectable live gallery (Vite, port 5174) — double-click the `.cmd`. Disposable scaffolding, never copied anywhere. |
| `README.md` / `COMPONENTS.md` | Slice-by-slice story + the 7 integration steps / per-component reference (props, usage, keyboard behavior). |

Covers **all P0 + all P1** of `docs/UNIVERSAL_COMPONENT_LIBRARY_CHECKLIST.md`
(14 slices, commits `9b1e37c` → `622bea0`), henrioutai-standard compliant,
browser-verified in both themes. Nothing in `frontend-react` / `frontend-saas` /
`frontend-electron` imports it — the connection steps live in its README and
happen in a later phase, deliberately.

---

## 4. How a request flows (the load-bearing connection)

Creating an invoice, end to end:

```
InvoiceBuilderPanel (React)
  → useCreateInvoice() hook           frontend-react/src/hooks/queries.ts
  → ApiClient.createInvoice()         frontend-react/src/lib/apiClient.ts   (HTTP POST /invoices + Bearer token)
  → TenantBindingMiddleware           api/middleware/tenant.py              (JWT → organization_context)
  → invoices router                   api/routers/invoices.py              (validates InvoiceCreateRequest)
  → InvoiceService.create()           core/services/invoice_service.py
        allocate_invoice_numbers()    core/services/numbering_service.py   (gapless SequenceRepository + display ref)
        invoice_totals()              core/rules/currency_math.py          (Decimal VAT math)
        uow.invoices.add()            db/repositories/…                    (INSERT, org-scoped)
        _audit.record()               core/services/_audit.py              (append-only audit row)
        uow.commit()                                                       (numbers only "burned" if this commits)
  → InvoiceResponse                   back up the same chain
```

Live totals in the builder come from `POST /invoices/preview` (pure calculation,
**no DB write, no sequence consumed**) — the browser never computes VAT.

---

## 5. Multi-tenancy & auth (how isolation actually holds)

- Every business table has `organization_id`. Repository methods **never accept
  an org id** — they read `current_organization_id()` from a `ContextVar`
  (`core/tenancy.py`).
- `TenantBindingMiddleware` sets that ContextVar from the JWT's `org_id` claim on
  every request. A router literally cannot query the wrong tenant, because the
  filter lives below it. Writes also call `guard_tenant()`.
- Tested: a forged/wrong-secret token → 401; one org sees empty lists / 404 for
  another org's rows (`tests/api/test_tenant_isolation.py`).
- Desktop mode: `POST /auth/desktop-bootstrap` mints a singleton local session —
  **404 unless `settings.desktop_mode` is true**, so a hosted deployment can't be
  coerced into it.

---

## 6. Domain-critical bits

- **Gapless numbering:** `SequenceRow` per `(org, company, scope)`, advanced under
  a row lock, consumed inside the same transaction as the invoice → no gaps on
  rollback. Invoices and credit notes have independent series.
- **Draft → issued lifecycle (ADR-0002, done):** `InvoiceService.create_draft()`
  makes a DRAFT with **no number** (`reference`/`sequence_global` are nullable);
  `issue()` is the sole place the gapless number is consumed — it freezes issue
  date + lines + totals, sets ISSUED, writes an `issue` audit entry, all in one
  transaction. Issuance is a local act; it never touches Peppol/the network.
  `POST /invoices` now returns a draft; `POST /invoices/{id}/issue` finalizes it.
- **No hard delete (except drafts):** a DRAFT has no number, so it is freely
  hard-deletable (`delete_draft()` + repo `delete()`, guarded to drafts; `DELETE
  /invoices/{id}` → 204, 409 if already issued). Correcting an **issued** invoice
  = issue a **credit note** (`CreditNoteService.issue()` mirrors lines, voids +
  links the invoice). Void exists for pre-send mistakes.
- **Stored totals:** `subtotal_ht/total_vat/total_ttc` are persisted on the
  invoice (legally binding at issue time), computed once by `invoice_totals()`.
- **Audit log:** append-only `AuditLogRow`; every mutation writes one in the same
  transaction. Read via `GET /activity`.

---

## 7. Tests

| Suite | Command | Count |
|---|---|---|
| Python (core/api/db/desktop) | `python -m pytest tests` | 206 passed, 0 skipped |
| Frontend (`@billgen/ui`) | `npm run test --workspace @billgen/ui` | 38 passed |

The real-PDF-bytes test now runs against Chromium (Playwright) instead of being
skipped. The whole app flow was also **browser-verified** in Phase 8 (signup →
invoice → payment → dashboard) and the Tauri shell **compiles clean** (`cargo
build`).

---

## 8. Environment & toolchain (exact, so you don't re-discover)

- **Python 3.14.4**, system install, **no venv**. Deps via pip: `fastapi uvicorn
  pyjwt argon2-cffi pydantic-settings sqlalchemy alembic jinja2 httpx structlog
  cryptography pytest pytest-asyncio playwright` (+ `Pillow` for icon/logo gen).
  **PDF engine needs a browser:** after `pip install playwright`, run
  `python -m playwright install chromium` (one-time, ~150 MB). Without it, PDF
  export returns 503 but everything else works.
- **Node v24.15.0 / npm 11** — npm workspaces (`frontend-react`, `frontend-saas`,
  `frontend-electron`).
- **Rust 1.96.1 (MSVC)** at `%USERPROFILE%\.cargo\bin` — **NOT on the default
  PATH**. `billgen.bat` prepends it. In a shell: `export
  PATH="$USERPROFILE/.cargo/bin:$PATH"`.
- Already present: VS Build Tools 2026 (MSVC `cl.exe`), Windows SDK 10.0.26100,
  WebView2 149.
- Dev DB: `var\billgen.dev.db` (SQLite) — has Phase-8 smoke data
  (`henri@example.com` / `beta-password-1`). Desktop app uses a **separate** DB in
  `%APPDATA%\BillGen`.

---

## 9. Known gaps & next phases

> **Plan of record (next up):** the **invoice lifecycle split — draft → issued →
> delivered** — is designed in
> [docs/ARCHITECTURE/ADR-0002-invoice-lifecycle.md](docs/ARCHITECTURE/ADR-0002-invoice-lifecycle.md).
> **Step 1 is DONE.** `InvoiceService.create()` was split into `create_draft()` (no
> number, DRAFT, hard-deletable) + `issue()` (the sole place the gapless number is
> consumed — freezes issue date + lines + totals, sets ISSUED, audits `issue`, one
> transaction; **not** dependent on the Peppol network). `POST /invoices` creates a
> draft; `POST /invoices/{id}/issue` finalizes; `DELETE /invoices/{id}` hard-deletes a
> draft only. UI gained a confirm-gated Issue + Delete action and a DRAFT badge; draft
> PDFs are watermarked "not a valid invoice"; drafts are excluded from KPI/revenue.
> Migration `b7f2c1a9d3e4` makes `reference`/`sequence_global` nullable. Remaining
> steps: delivery/payment status as a *separate, async* track (port + external adapter).
>
> **Foundation-hardening track:** (1) Peppol → trustworthy ✅ **done** (forms surface
> gate fields; mixed-rate discount split per category; BE switched to plain BIS;
> **both non-BE and BE invoices Helger-validated** against OpenPeppol 2026.5).
> (2) draft→issue split ✅ **done** (ADR-0002 step 1). (3) **boot-time config
> guards** ✅ **done** (`64415f1`) — `api/config.py` `validate_for_boot()`: a
> `ENVIRONMENT=production` start refuses the dev `jwt_secret` / a <32-byte secret /
> `desktop_mode`, and warns on wildcard-or-localhost CORS and SQLite; dev stays
> permissive. (4) **backup/restore** ✅ **done** (`66a0baa`, ADR-0003) — org-scoped
> JSON export + restore-into-empty-org, sequence counters preserved, UI in both
> shells' settings. Remaining, in order: (5) **CI + quality gate** — workflow written
> and committed (`.github/workflows/ci.yml`, `64415f1`), **inert until a GitHub remote
> exists** (Henri is setting that up; repo is still local-only — this is the top
> safety-net gap now). (6) **lightweight crash reporting**. (7) **historical-invoice
> import design** — an `imported/historical` marker so legacy invoices keep their
> original reference without consuming the live sequence. Audit-vs-now scoring:
> [docs/AUDIT_PROGRESS_vs_demo.md](docs/AUDIT_PROGRESS_vs_demo.md).
>
> **Deployment path (decided 2026-07-12):** SaaS runs on a **cloud VPS** (the
> workstation is the build/deploy origin only, never the host); sequence is **safety
> net first** (git remote + CI + backup ✅) → **desktop installer** (PyInstaller-freeze
> the sidecar, Phase 12) → **web deploy** (Dockerfile + Postgres + TLS; the API does
> not yet serve the SPA — needs a static host or a `StaticFiles` mount). No Dockerfile
> exists yet; `infra/*` is still empty scaffolding.
> **Repo topology (decided 2026-07-12):** BillGen stays **one private monorepo**
> (engine + api + db + apps — tightly coupled via the generated OpenAPI types, the
> workspace-linked UI, and the engine-at-runtime desktop sidecar). The **design
> system `@henrioutai/ui` is public** — already carved into `henrioutai-ui/` as a
> standalone package (`5a81cfd`); extracting it to its own public repo later is a
> `git subtree`/`filter-repo` split, and npm-publishing to outside consumers wants a
> `dist` build step. **Blocked on:** no git remote yet (Henri setting up a private
> GitHub; then push the monorepo, and the public library repo).

- **Phase 10** — Stripe billing + plan enforcement (`SubscriptionRow` already
  exists), email (Postmark), VIES VAT check.
- **Phase 11 — DONE (backend + UI).** Legacy import end to end:
  - **Backend:** `core/imports/` + `ImportService` + `POST
    /imports/legacy/{preview,commit}`. Imports **companies, clients, products**
    from a `FinanceFlow BillGen` backup JSON, with dry-run preview, per-scope
    name dedup (idempotent), and a structured report. The exact legacy shapes
    were recovered from the shipped app's sourcemaps (`app.asar`); its export
    format is `BillgenBackup` = `{app, keys}` where `keys` maps `billgen-*`
    localStorage keys to stringified JSON.
  - **UI (11b):** `ImportPanel` in `@billgen/ui` (file picker → preview →
    confirm, with counts table + issues + invoice note), `useImportPreview` /
    `useImportCommit` hooks, `ApiClient.previewLegacyImport` /
    `commitLegacyImport`, and the `/app/import` route + nav link in the SaaS
    shell. Browser-verified end to end (import → data persisted with correct
    mappings). Reads files via `FileReader` (jsdom/older browsers lack
    `File.text()`). While here, made `AppShell` company selection sticky so an
    import (which adds a company + invalidates the list) no longer yanks the
    user onto a different company mid-task.
- **Phase 11b remainder — still open:**
  - **Historical invoices are deliberately NOT imported.** Recreating them
    would mint live, gapless, legally-binding invoice numbers as an import
    side effect. They are *counted* and surfaced as `invoices_detected` in the
    report so nothing is silently dropped. Importing them needs a design that
    preserves the original reference **without** consuming the live sequence
    (e.g. an `imported/historical` marker).
  - `ImportPanel` is mounted in **both** the SaaS shell and the desktop shell
    (`frontend-electron` — `.bg-import*` styles mirrored into its `styles.css`;
    typecheck-verified, Tauri build not re-run). ~~The desktop shell showed
    `companies[0]` with no company switcher~~ — **fixed** by the `c09f0f7` shell
    rework: OrgSwitcher now switches companies on desktop too.
  - CSV path (per-entity CSV → the same `ImportService`) if a user has data
    outside the BillGen app.
- **Peppol e-invoicing hardening — DONE (`771e903`).** Ported the *approved* demo
  (`D:\CODING\FinanceFlow Bill Generator`, `frontend/src/lib/peppol.ts`) into the
  new architecture, placed by layer (see [docs/COMPARISON_demo_vs_new.md](docs/COMPARISON_demo_vs_new.md)):
  - **Rules (pure):** `core/rules/identifiers.py` (VAT/IBAN/BIC checksums) +
    `core/rules/belgian_peppol.py` (OGM-VCS, BTCC, EndpointID scheme).
  - **Builder:** emits **standard Peppol BIS Billing 3.0** for every seller
    (`CustomizationID` = the Peppol id, PEPPOL-EN16931-R004). BE sellers add the
    Belgian elements BIS accepts: `EndpointID` (0208), `Contact/ElectronicMail`,
    OGM-VCS `PaymentID`, supplier `PartyLegalEntity/CompanyID` (KBO). `BuyerReference`
    = the invoice ref. The EN 16931 multi-rate/discount/Decimal engine underneath.
    *(The UBL.BE profile + `AdditionalDocumentReference` markers + BTCC `cbc:Name`
    were dropped — they failed BIS R004; see the Helger result below.)*
  - **Gate:** `PeppolService` refuses to build XML for invalid parties / **B2C**
    (customer without VAT); API returns **422** `{errors:[{field,message_key}]}`
    (runtime shape, *not* in the generated FE types — handle by hand in the UI).
  - **Still open / caveats:**
    - **Helger validation — PASSED (non-BE *and* BE).** Both
      `var/peppol_samples/nonbe_seller_multirate_discount.xml` and
      `be_seller_multirate_discount.xml` validate **clean** against *OpenPeppol UBL
      Invoice 2026.5 / BIS Billing 3.0.21* on the Helger validator. So the EN 16931
      tax engine (multi-rate `TaxSubtotal` grouping, per-category discount split,
      BR-CO-* totals) **and** the Belgian-elements-on-BIS output are proven against
      the current production schematron. (En route: the BE file first failed with one
      error — `PEPPOL-EN16931-R004`, the UBL.BE `CustomizationID` — which is why BE
      output was switched to plain BIS. Validate the *Invoice* VESID, not Credit Note
      / UBL.BE.) Regenerate anytime via `scripts/generate_peppol_samples.py`.
      **Remaining Peppol gate is transport, not format:** a real Access-Point
      round-trip (a later phase) — schematron-valid ≠ delivered.
    - **Mixed-rate document discount — FIXED.** A document-level discount on a
      mixed-VAT-rate invoice now emits **one `AllowanceCharge` per VAT category**
      (each carrying its category; parts quantized to sum exactly to
      `AllowanceTotalAmount`, BR-CO-11), instead of pinning the whole allowance to
      the first category. Single-rate output is byte-identical to before. Covered by
      `test_mixed_rate_document_discount_splits_per_category`.
    - **Group D — partly done.** Company/client onboarding forms now surface the
      fields the Peppol gate needs: `CompanyForm` collects `registration_number`,
      `email`, `address_line1`, `postal_code`, `city`, `country_code` (was
      name/vat/iban/bic/prefix only — a company made there could **never** pass the
      gate, which requires an address); `ClientsPanel` adds `address_line1`,
      `postal_code`, `country_code`. `CompanyResponse` now returns
      `registration_number` (openapi.json + `api.d.ts` regenerated). Verified: FE
      typecheck clean, 33 FE + 185 Py tests green.
    - **Deferred (Group D remainder):** editable `Invoice.buyer_reference`;
      draft→certified labeling discipline in the front ends.
- **UI component library — MERGED + SaaS shell rebuilt (2026-07-11).** Henri lifted
  the isolation rule; the library was copied into `frontend-react/src/` as designed
  (`5bd7e79`: components, CSS additions appended, fonts, Button/Field/Modal/EmptyState
  replaced, all 31 Field call sites migrated to Field>TextInput with an auto-id
  fallback) and the SaaS shell was rebuilt on it (`0386c09`: TopNav-only nav per the
  nav decision, OrgSwitcher, AccountMenu, ⌘K CommandPalette, SettingsShell hosting
  Import + Activity + theme preferences, dark mode persisted pre-paint). Browser-
  verified both themes against the live API; 38/38 FE tests. The desktop (Tauri)
  shell got the same rework (`c09f0f7`): TopNav-only nav over tab state, OrgSwitcher
  (which **closes the old companies[0]-no-switcher gap**), settings hosting Import +
  Activity + theme — typecheck + vite build verified, Tauri window not relaunched
  (Rust compile; do a runtime pass next desktop session). `docs/frontent build/
  component-library/` is now the archived record, not the source.
  Then the design system was **extracted into its own package `@henrioutai/ui`**
  (`5a81cfd`, `henrioutai-ui/`) so it can be published (MIT) while BillGen stays
  private — see the repo-map entry. `@billgen/ui` now consumes + re-exports it.
  **Still open:** Henri's sketches for the three placeholder icons (Products &
  services, Import, Activity); a notification source for the bell (chrome-only
  today); P2 nice-to-haves + app-specific compositions (invoice line editor,
  VAT picker).
- **Next phases discussed, NOT started:**
  - **Automatic Peppol transmission** — send structured XML straight to the buyer
    via an Access Point (Doccle/Billit/Unifiedpost/…): needs an AP account+API,
    SMP/SML participant lookup, and accept/reject handling. (Distinct from the
    demo's manual "PDF through Doccle" flow.)
  - **Automatic payment reconciliation** — detect paid/unpaid from a bank feed
    (CODA / PSD2 aggregator like Ponto/Isabel) matched on the OGM-VCS
    `PaymentID` (already emitted). Today only **manual** `PaymentService` exists.
- **Phase 12** — CI, `npm/pip/cargo audit`, **PyInstaller-freeze the sidecar** for
  a packaged desktop, `tauri build` NSIS installer + `signtool`.
- Smaller: **DONE** — HistoryPanel now has **PDF + Peppol XML download buttons**
  (`saveBlob` → existing `invoicePdf`/`invoicePeppolXml` client methods; read-only
  re-renders, no data written beyond the export audit entry; browser-verified:
  Peppol 200, PDF 503 handled gracefully where WeasyPrint is absent). Still open:
  a `.bg-totals` CSS "nit" (under-specified — it's the on-screen totals box in the
  invoice **builder**, `styles.css`; no concrete defect found, deferred pending a
  specific repro). *(The Peppol/UBL caveats moved to the Peppol bullet above.)*
- **Sprint 1 + Sprint 2 backend — DONE 2026-08-26** (`docs/ROADMAP_IA.md` §4).
  All of it is server-side; **not one of these is on a screen yet**, so the
  screens still look exactly as they did:
  - `GET` + `PATCH /companies/{id}` — closes **B3**. Every `Company` field
    except `logo_key` (B2) is editable, so a VAT typo is no longer permanent.
    The router re-validates the merged model instead of `model_copy(update=…)`,
    which silently skips validation even under `validate_assignment`: an
    explicit `null` on a non-nullable field is a 422, not a corrupt row. An
    unknown `default_pdf_template` is rejected against the PDF registry.
  - `GET /products?status&billing_type` — Catalog's Services and Archived views.
  - `GET /vat-rates`, `GET /pdf-templates` — the Python constants
    (`core/rules/vat.py`, `core/pdf/registry.TEMPLATES`) exposed, so the
    frontend can stop hardcoding `21/12/6/0` and the template ids.
  - `GET /reports/vat?period` (`YYYY`, `YYYY-Qn`, `YYYY-MM`) — output VAT per
    (category, rate), invoices minus credit notes, with the Belgian grid where
    the mapping is unambiguous. **Sales only**: the model has no purchases, so
    grids 59/81-83/86-87 and the 71/72 balance are not derivable — the response
    carries `covers: "output_vat_only"` so a UI cannot present it as filable.
    New `core.rules.vat_buckets` shares the discount-allocation code with
    `invoice_totals`, so a taxable base can never drift from a stored total.
  - `vitest.config.ts` now sets `testTimeout`/`hookTimeout` to 30s — closes
    **BGEN-OPS-02**. Collection alone takes ~45s under load, which is why 5s
    flaked.
  - Also swept up so the first CI run is green: 8 pre-existing `ruff` failures
    in `scripts/`, and a stale `frontend-react/openapi.json` (regenerated, along
    with `src/types/api.d.ts`).
- **Sprint 2b backend — DONE 2026-08-26** (`docs/ROADMAP_IA.md` §4). Six reads,
  no schema change, no migration, no external dependency. Each replaces an
  aggregation the browser was doing over a full-list fetch, or exposes a rule
  the server already owned. **Still not one of them is on a screen.**
  - `GET /payments` — `invoice_id` is now optional; `company_id`, `client_id`,
    `paid_from`, `paid_to` filter it (bounds inclusive, newest first). There was
    previously **no way to list payments across invoices at all**. Needed a new
    `PaymentRepository.list()` port: `Payment` carries only `invoice_id`, so
    filtering by company or client is a join, not a column read.
  - `GET /reports/invoices?company_id&period` — counts and money per
    **effective** status (Overdue derived from the due date, so it is a bucket
    rather than something the caller re-derives), plus a monthly series. Drafts
    are counted, never summed; voided invoices carry their total in their own
    bucket but leave revenue alone.
  - `GET /clients/{id}/stats` — Client 360's header in one call.
    `average_days_to_payment` covers **fully-paid invoices only**: a partial has
    no settlement date, and averaging it in would make the number improve when a
    customer pays less.
  - `GET /clients/{id}/timeline` — the **commercial** history (invoices, credit
    notes, payments), which the audit log structurally cannot produce: audit
    entries for an invoice carry no `client_id`, so `/activity?target_id=<client>`
    only ever returns edits to the client record. Same-day ties sort
    invoice → credit note → payment → void, so a payment never appears above the
    invoice it settles.
  - `GET /companies/{id}/validation` — per-field VAT (mod-97) / IBAN (ISO 13616)
    / BIC (ISO 9362) verdicts with canonical forms, plus `missing_for_peppol`.
    A blank optional field is **not** an error (that is a form state), but it
    does block `peppol_ready`. Supplier side only: a `peppol_ready` company can
    still be refused at export because the *client* fails the gate (no VAT =
    B2C). Pure logic in `core/services/company_validation.py`.
  - `POST /invoices/{id}/duplicate` — copies client, lines, discount, comments,
    terms, template and currency into a fresh draft, and nothing that identifies
    the source document. It routes through `create_draft`, so a copy can never
    come out already numbered; totals are recomputed rather than copied, because
    a stale total on a draft becomes a wrong total the moment it is issued.
  - **Frontend plumbing, same commit:** `ApiClient` methods, generated types and
    React Query hooks for all six — **plus the Sprint 1 + 2 endpoints that had
    none**: `getCompany`, `updateCompany`, `validateCompany`, `vatRates`,
    `pdfTemplates`, `vatReport`, and `status`/`billing_type` on `listProducts`.
    `listPayments` and `listProducts` still accept a bare id, so no call site
    changed. Every Sprint 1-2b endpoint is now one hook away from a screen.
    `openapi.json` + `src/types/api.d.ts` regenerated; all four workspaces
    typecheck clean.
- **B4 entitlement layer — DONE 2026-08-26.** The commercial half of the
  product, minus the payment provider. Tiers settled as **free / starter /
  business / business_pro**, carried by the **organization** (the billing
  account that holds the seats), not the user. `PlanTier.PERSONAL` was renamed
  → `STARTER` (data migration `c4e1a7b20f38`; the column is a plain String, so
  no schema change) and `BUSINESS_PRO` added.
  - **`api/entitlements/`** is the whole layer and **nothing in `core/` may
    import it.** Three concepts kept apart on purpose: *subscription* (the
    commercial state), *entitlement* (what it permits), *usage* (what is
    spent). `matrix.py` is the only place a tier name maps to a capability, so
    a price or quota change never touches domain code.
  - **Routers declare a capability, never a plan.**
    `Depends(require_quota(Meter.INVOICES))` / `Depends(require_feature("recurring_invoices"))`.
    `if tier == "business"` appears nowhere.
  - **Usage is derived, never accumulated** (`usage.py`): every number is a
    `COUNT(*)` over rows that already exist, filtered on `created_at` for the
    monthly meters. There is no counter to drift — a restore, an import, a
    deleted draft or a manual fix all move it correctly. Peppol documents are
    counted from the append-only `EXPORT_PEPPOL` audit entries. Two kinds of
    meter: **flow** (invoices, Peppol documents — reset monthly) and **stock**
    (clients, products, companies, seats — standing totals).
  - **Quota checks are atomic** (`service.quota_guard`): a row lock on the
    organization is taken *before* counting and **held while the endpoint body
    runs**, so two concurrent requests cannot both create the 50th invoice.
    Same SQLite-noop / Postgres-real asymmetry as the gapless numbering lock,
    for the same reason — which is another thing only the Postgres CI run can
    actually prove (`BGEN-OPS-01`).
  - **402 = commercially unavailable; 403 stays authenticated-but-unauthorized.**
    Bodies are `{error, required_tier, feature, message}` (+ `limit/used/period`
    for a quota), so the shell needs one generic handler:
    `isEntitlementError(err)` in the ApiClient, and no per-feature payment
    logic in React.
  - **The cap governs creation only.** At the invoice cap a tenant can still
    issue, pay, credit-note, export, PDF and back up everything they already
    have — covered by `test_hitting_the_invoice_cap_never_blocks_existing_work`.
    A Business→Starter downgrade with three companies keeps all three, editable;
    only a fourth is refused (`test_downgrade_over_limit_keeps_every_record`).
    The invoice allowance is consumed at **draft creation**, never at issue:
    issuing is legally load-bearing and must not fail for a commercial reason.
  - **CORE is now pricing-blind.** `PdfService` no longer reads `plan_tier`; it
    takes `branded=` (defaulting to **True**, so a forgotten call site shows a
    footer rather than giving away the paid feature) and the API supplies it
    from `pdf_remove_branding`. That was the last tier lookup in `core/`.
  - **Not built, on purpose:** Stripe/Mollie/MoR, checkout, webhooks. The
    provider is an adapter that writes `SubscriptionRow`; `resolve_tier()`
    already prefers it over `Organization.plan_tier` when its status is
    active/trialing/past_due. Seats are in the matrix but nothing consumes
    them — there is no invite flow (needs **B1**).
  - **Desktop is exempt** (`desktop_mode`): a local single-user SQLite install
    with no subscription behind it, licensed separately via
    `desktop/licensing.py`.
  - New: `GET /entitlements` (this tenant's tier + features + usage) and
    `GET /plans` (the whole matrix, so a pricing screen has no second copy in
    TypeScript). `useEntitlements()` / `usePlans()` hooks ship. **No screen
    reads them yet** — the upgrade modal and the usage meters are frontend work.
- Repo is **local only** — no remote. Commit + tag per phase. **This is now the
  top item on the board** (`BGEN-OPS-01`): the whole history lives on one
  machine with no backup, and `.github/workflows/ci.yml` cannot run until there
  is a remote. Needs Henri's GitHub account.

---

## 10. Gotchas already paid for (don't rediscover)

- **Sync Playwright can't run on a thread with a live asyncio loop.** The PDF
  routes are sync `def` handlers, so Starlette runs them in its threadpool (off
  the event-loop thread) where `sync_playwright()` is fine. Don't call
  `html_to_pdf()` directly from an `async def` — it'll raise "Sync API inside the
  asyncio loop". (That's why the API PDF test asserts `status in (200, 503)`
  instead of probing the engine on the loop thread.)
- **Pydantic v2 serializes `Decimal` as a JSON string** — frontend/tests parse
  with `Decimal(str(v))` / `Number(...)`.
- **Unbound `fetch` as an instance property throws "Illegal invocation" in
  browsers** (Node/MSW hide it) → `fetch.bind(globalThis)` in `apiClient.ts`.
- **SQLAlchemy doesn't order plain-FK inserts across tables in one flush** →
  `session.flush()` parents first (see `AuthService.signup`).
- **Rust E0597**: don't hold a `MutexGuard` across an `if let` block while the
  `State` binding drops — take the value in its own `let` first (`main.rs` exit
  handler).
- **`cargo build | tee | tail` masks cargo's exit code** — grep the log for
  `error[` / `Finished`, don't trust the pipeline's status.
- **Running `cargo build` while `vitest` runs** starves CPU → 5 s test timeouts
  that are not real failures. Re-run when the compile is done.
- NBSP characters in source get mangled by editors → `money.py` uses an explicit
  `" "` escape.

---

## 11. Git — phases and tags

```
1d272c4  (no tag)  chore: ignore backups/ (zips live outside version control)
622bea0  (no tag)  docs: COMPONENTS.md — per-component library reference
3e3a638…5f2be92   (no tags)  ui: component-library slices 2–14 — 9 commits
                   (P0 + P1 sets, dark mode, henrioutai pass, preview, fonts)
9b1e37c  (no tag)  ui: isolated component-library build (slice 1) + docs catchup
fb711f4  (no tag)  docs: brand tokens, component blueprints, dashboard ref theme
1987c9c  (no tag)  ui: save dialog + saved confirmation; blocked Peppol exports
142ade9  (no tag)  ui: move brand tokens + component styles into @billgen/ui
5b9c93e  (no tag)  pdf: BillGen branding on free tier only, across all templates
7f2e36f  (no tag)  pdf: fix Chromium engine under uvicorn; draft-safe filenames
fa17c74  (no tag)  docs: Access Point / Peppol transmission integration notes
b6ae363  (no tag)  pdf: cross-platform Chromium engine + free-tier branding
7220359  (no tag)  invoice-lifecycle: draft → issued split (ADR-0002 step 1)
33664ed  (no tag)  peppol: Helger-validated BIS 3.0 + gate form fields
771e903  (no tag)  peppol: approved demo localisation + pre-export validation gate
a9b8dee  (no tag)  polish: mount ImportPanel in the desktop shell
53f466f  (no tag)  polish: invoice download buttons + import API-schema separation
783af28  (no tag)  Phase 11b: import UI — ImportPanel
c4d704d  (no tag)  Phase 11: legacy import backend
1dbd0a1  (no tag)  docs: session handoff + billgen.bat launcher
d4e52ce  phase-9b  Tauri desktop shell (spawns sidecar, compiles clean)
b5577b8  phase-9a  desktop sidecar core (bootstrap, licensing, local auto-login)
bac89f3  phase-8   SaaS shell (auth pages, app shell, browser-verified)
ac6cc8e  phase-7b  remaining @billgen/ui panels
0575406  phase-7a  @billgen/ui foundation (typed client, hooks, ClientsPanel)
d7369ba  phase-6   API business routers
cff1e3e  phase-5   FastAPI skeleton, JWT auth, tenant middleware
b69bbc8  phase-4   monorepo skeleton + CORE domain/rules/DB/services
```

Work after `phase-9b` (import, polish, peppol, lifecycle, PDF engine, UI library)
is committed on `main` **without tags**. To return to a tagged checkpoint:
`git checkout phase-6` (etc.).

Note: `9b1e37c` accidentally deleted `docs/AUDIT_PROGRESS_vs_demo.md` and
`docs/COMPARISON_demo_vs_new.md` while this document still linked to them; both
were restored from that commit's parent (2026-07-11).
