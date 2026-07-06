# BillGen — Session Handoff

Greenfield 3-layer rebuild of a Belgian invoicing app. This document is the map:
what exists, where it lives, how the pieces connect, and how to run and test it.
Read this instead of re-deriving context.

---

## 0. Status at a glance

| | |
|---|---|
| Location | `C:\Users\hdr_s\Documents\business model\BillGen BETA` |
| Phases done | 0–9, **11** (domain → rules → DB → services → API → business routers → UI kit → SaaS shell → desktop → legacy import). Phase 10 (billing) not yet started. |
| Tests | **Python 174 passed, 1 skipped** (`python -m pytest tests`); **frontend 33 passed** (`npm run test --workspace @billgen/ui`) |
| Git | local only, **not pushed**. One commit + tag per phase (`phase-4` … `phase-9b`). Branch `main`. |
| Skip reason | 1 PDF test skips because WeasyPrint's native (Pango/GTK) stack isn't installed — HTML rendering is fully tested; only the HTML→PDF byte step needs it. |
| Not a migration | The legacy React/Python apps (`D:\CODING\audit-v2-react-exe`, `myshop-*`) are reference only. Do not edit them. |

Design decision of record: [docs/ARCHITECTURE/ADR-0001-three-layer.md](docs/ARCHITECTURE/ADR-0001-three-layer.md).

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
| `core/tenancy.py` | `organization_context()`, `current_organization_id()`, `guard_tenant()`, `TenantContextError`, `TenantViolationError` | **The multi-tenant backbone.** A `ContextVar` holds the current org. |
| `core/repository/` | abstract `*Repository` ports + `UnitOfWork`; `sequence_repo` (`INVOICE_SERIES`, `CREDIT_NOTE_SERIES`, `monthly_bucket()`) | Storage-agnostic interfaces. No `org_id` params — read from context. No invoice hard-delete; audit log is append-only. |
| `core/services/` | `InvoiceService`, `CreditNoteService`, `PaymentService`, `Company/Client/Product/Organization/Activity/ReportingService`, `PdfService`, `PeppolService`, `ImportService`; `errors.py` (`NotFoundError`, `BusinessRuleError`); `_audit.record()`; `numbering_service` | **Use-cases.** Each opens one `UnitOfWork`, does the work, writes an audit entry, commits once. |
| `core/imports/` | `parse_backup()`, `map_company/map_client/map_product`, `ImportReport`, `MappingError`, `APP_NAME` | Pure legacy-import layer: parses a `FinanceFlow BillGen` backup (`{app, keys}` with `billgen-*` localStorage keys) and maps its records onto domain models. No framework, no I/O. |
| `core/pdf/` | `registry` (`TEMPLATES`, `get_template`), `renderer` (`render_html`, `html_to_pdf`, `PdfEngineUnavailableError`), `context` (`build_invoice_context`), `templates/*.html.j2` | Server-side PDF via Jinja2 + WeasyPrint. 4 templates: fr_standard, fr_detailed, nl_minimal, credit_note. |
| `core/einvoicing/` | `ubl_builder.build_invoice_ubl()`, `ubl_validator.validate_invoice_ubl()` | Peppol BIS 3.0 / UBL 2.1 XML (stdlib ElementTree). |
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

### `frontend-react/` — `@billgen/ui` shared kit (no business logic, no localStorage)

| Path | Key names | Purpose |
|---|---|---|
| `src/lib/apiClient.ts` | `ApiClient`, `MemoryTokenStore`, `TokenStore`, `ApiError` | Typed HTTP client. **Pluggable token storage** (kit never touches localStorage). One refresh+retry on 401 → `onAuthLost`. `desktopBootstrap()` for the desktop app. |
| `src/types/api.d.ts` | generated | From the API's `openapi.json`. Regenerate: `npm run generate:api` in `frontend-react/`. |
| `src/providers/BillGenProvider.tsx` | `BillGenProvider`, `useApi` | React Query + ApiClient context. |
| `src/hooks/queries.ts` | `useClients`, `useInvoices`, `useInvoicePreview`, `useCreateInvoice`, `useVoidInvoice`, `useIssueCreditNote`, `useRecordPayment`, `useKpi`, `useRevenue`, `useActivity`, `useCompanies`, `useProducts`, … | Server-state hooks with cache invalidation. |
| `src/hooks/useAuth.tsx` | `AuthProvider`, `useAuth` | In-memory session (the SaaS shell adds persistence on top). |
| `src/components/` | `Button`, `Field`, `Modal`, `Spinner`, `EmptyState` | Semantic `bg-*` classNames; styled by the app shells. |
| `src/panels/` | `ClientsPanel`, `ProductsPanel`, `InvoiceBuilderPanel`, `HistoryPanel`, `DashboardPanel`, `ActivityPanel`, `CompanyForm`, `ImportPanel` | Dumb panels: data via hooks, `t()` for i18n, no math. `ImportPanel` = file picker → preview → confirm for legacy backups. |
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
| `src-tauri/capabilities/default.json` | — | `core:default` for the `main` window. |
| `src/lib/api.ts` | `createApi()`, `tokenStore` | Resolves the sidecar port via `invoke('api_base_url')`; falls back to a dev URL outside Tauri. |
| `src/App.tsx`, `src/DesktopShell.tsx` | boot flow + tab shell | Auto-login via `desktopBootstrap()`, then mounts the 7 kit panels (no login chrome). |

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
- **No hard delete:** correcting an issued invoice = issue a **credit note**
  (`CreditNoteService.issue()` mirrors lines, voids + links the invoice). Void
  exists for pre-send mistakes.
- **Stored totals:** `subtotal_ht/total_vat/total_ttc` are persisted on the
  invoice (legally binding at issue time), computed once by `invoice_totals()`.
- **Audit log:** append-only `AuditLogRow`; every mutation writes one in the same
  transaction. Read via `GET /activity`.

---

## 7. Tests

| Suite | Command | Count |
|---|---|---|
| Python (core/api/db/desktop) | `python -m pytest tests` | 161 passed, 1 skipped |
| Frontend (`@billgen/ui`) | `npm run test --workspace @billgen/ui` | 29 passed |

The Python skip is the real-PDF-bytes test (needs WeasyPrint's native stack). The
whole app flow was also **browser-verified** in Phase 8 (signup → invoice →
payment → dashboard) and the Tauri shell **compiles clean** (`cargo build`).

---

## 8. Environment & toolchain (exact, so you don't re-discover)

- **Python 3.14.4**, system install, **no venv**. Deps via pip: `fastapi uvicorn
  pyjwt argon2-cffi pydantic-settings sqlalchemy alembic jinja2 httpx structlog
  cryptography pytest pytest-asyncio` (+ `Pillow` for icon gen).
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
  - `ImportPanel` is wired into the **SaaS** shell only; the desktop shell
    (`frontend-electron`) doesn't mount it yet.
  - CSV path (per-entity CSV → the same `ImportService`) if a user has data
    outside the BillGen app.
- **Phase 12** — CI, `npm/pip/cargo audit`, **PyInstaller-freeze the sidecar** for
  a packaged desktop, `tauri build` NSIS installer + `signtool`.
- Smaller: **DONE** — HistoryPanel now has **PDF + Peppol XML download buttons**
  (`saveBlob` → existing `invoicePdf`/`invoicePeppolXml` client methods; read-only
  re-renders, no data written beyond the export audit entry; browser-verified:
  Peppol 200, PDF 503 handled gracefully where WeasyPrint is absent). Still open:
  a `.bg-totals` CSS "nit" (under-specified — it's the on-screen totals box in the
  invoice **builder**, `styles.css`; no concrete defect found, deferred pending a
  specific repro); the UBL builder attaches a document-level discount to the first
  VAT category on mixed-rate invoices (revisit before real Peppol Access Point
  integration).
- Repo is **local only** — no remote. Commit + tag per phase.

---

## 10. Gotchas already paid for (don't rediscover)

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
d4e52ce  phase-9b  Tauri desktop shell (spawns sidecar, compiles clean)
b5577b8  phase-9a  desktop sidecar core (bootstrap, licensing, local auto-login)
bac89f3  phase-8   SaaS shell (auth pages, app shell, browser-verified)
ac6cc8e  phase-7b  remaining @billgen/ui panels
0575406  phase-7a  @billgen/ui foundation (typed client, hooks, ClientsPanel)
d7369ba  phase-6   API business routers
cff1e3e  phase-5   FastAPI skeleton, JWT auth, tenant middleware
b69bbc8  phase-4   monorepo skeleton + CORE domain/rules/DB/services
```

To return to any checkpoint: `git checkout phase-6` (etc.).
