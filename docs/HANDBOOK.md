# Handbook — how BillGen runs, connects, and where it has already bitten

The parts of the old `HANDOFF.md` that were still true, plus the parts of
`ENVIRONMENT_REFERENCE.md` that had not gone stale. Status lives in
[SOLO_RUN.md](SOLO_RUN.md), the queue in [TICKETS.md](TICKETS.md), the shape of
the system in [ARCHITECTURE/](ARCHITECTURE). This file is the *mechanics*.

---

## 1. Run it yourself

Double-click **`billgen.bat`** at the repo root. Menu:

- **[1] Web app** — FastAPI on 8000 and the SaaS UI on 5173, two windows, opens
  the browser. Sign up with any email and an 8-character password. The easiest
  way to exercise the whole product.
- **[2] Desktop app** — the native Tauri window. First run compiles Rust for a
  few minutes, then it is fast. Self-contained: its own SQLite in
  `Documents\BillGen`, auto-login, no signup.
- **[3] Run all tests** — Python and frontend.
- **[4] First-time setup** — `npm install` plus a DB migrate. Fresh clone only.

The two front ends are independent consumers of the **same** API and domain
code. For browser verification of desktop-only behaviour there is a second
pair — `api-desktop` on 8010 and `saas-desktop` on 5183, both in
`.claude/launch.json` — where sign-in needs no password.

---

## 2. How a request flows

Creating an invoice, end to end:

```
InvoiceBuilderPanel (React)
  → useCreateInvoice()              frontend-react/src/hooks/queries.ts
  → ApiClient.createInvoice()       frontend-react/src/lib/apiClient.ts   (POST /invoices + Bearer)
  → TenantBindingMiddleware         api/middleware/tenant.py              (JWT → organization_context)
  → invoices router                 api/routers/invoices.py               (validates InvoiceCreateRequest)
  → InvoiceService.create()         core/services/invoice_service.py
        allocate_invoice_numbers()  core/services/numbering_service.py    (gapless sequence + display ref)
        invoice_totals()            core/rules/currency_math.py           (Decimal VAT math)
        uow.invoices.add()          db/repositories/…                     (INSERT, org-scoped)
        _audit.record()             core/services/_audit.py               (append-only audit row)
        uow.commit()                                                      (numbers burn only if this commits)
  → InvoiceResponse                 back up the same chain
```

Live totals in the builder come from `POST /invoices/preview` — pure
calculation, **no DB write, no sequence consumed**. The browser never computes
VAT.

---

## 3. Multi-tenancy and auth — how the isolation actually holds

- Every business table carries `organization_id`. Repository methods **never
  accept an org id**; they read `current_organization_id()` from a `ContextVar`
  (`core/tenancy.py`).
- `TenantBindingMiddleware` sets that ContextVar from the JWT's `org_id` claim
  on every request. A router cannot query the wrong tenant because the filter
  lives below it. Writes also call `guard_tenant()`.
- Tested: a forged or wrong-secret token → 401; one org sees empty lists and
  404s for another org's rows (`tests/api/test_tenant_isolation.py`).
- Desktop mode: `POST /auth/desktop-bootstrap` mints a singleton local session,
  and **404s unless `settings.desktop_mode` is true**, so a hosted deployment
  cannot be talked into it.

---

## 4. Domain-critical bits

- **Gapless numbering.** A `SequenceRow` per `(org, company, scope)`, advanced
  under a row lock, consumed inside the same transaction as the invoice — so a
  rollback leaves no gap. Invoices and credit notes have independent series.
- **Draft → issued (ADR-0002).** `create_draft()` makes a DRAFT with **no
  number** (`reference` and `sequence_global` are nullable). `issue()` is the
  only place a number is consumed: it freezes issue date, lines and totals,
  sets ISSUED and writes an `issue` audit entry, in one transaction. Issuance
  is a local act and never touches the network.
- **No hard delete, except drafts.** A draft has no number, so `DELETE
  /invoices/{id}` → 204 (409 once issued). Correcting an *issued* invoice means
  a credit note: `CreditNoteService.issue()` mirrors the lines, then voids and
  links the invoice — and dates the void from the credit note, not the clock.
- **Stored totals.** `subtotal_ht` / `total_vat` / `total_ttc` are persisted on
  the invoice, computed once by `invoice_totals()`, legally binding at issue.
- **Audit log.** Append-only `AuditLogRow`; every mutation writes one in the
  same transaction. Read it through `GET /activity`.

---

## 5. Gotchas already paid for

- **Sync Playwright cannot run on a thread with a live asyncio loop.** The PDF
  routes are sync `def` handlers, so Starlette runs them in its threadpool, off
  the event-loop thread, where that is fine. Never call `html_to_pdf()` from an
  `async def`. (It is why the API PDF test asserts `status in (200, 503)`
  rather than probing the engine on the loop thread.)
- **A hook added to a component with early returns goes at the top.** Placing
  one below an `if (isLoading) return` renders more hooks than the previous
  render and crashes on first load — with a green test suite, because the tests
  never hit the loading branch. A UI change is not verified until it has been
  loaded in a browser.
- **A guard that inspects a collection must assert the collection is
  non-empty**, or one day it passes by finding nothing. FastAPI 0.139 stopped
  copying an included router's routes into `app.routes` and the authz walk
  silently saw 4 routes instead of 100. Three tests now pin this deliberately.
- **Two unique constraints whose first column is the same collapse to one
  name.** The `uq` convention keys off the first column only, so two
  `organization_id`-leading constraints on one table emit twice under
  `uq_<table>_organization_id`. SQLite accepts it; Postgres rejects the
  `CREATE TABLE` outright. `tests/db` now compiles all tables under the
  Postgres dialect on every run, because development and the fast CI leg are
  both SQLite.
- **Pydantic v2 serialises `Decimal` as a JSON string** — parse with
  `Decimal(str(v))` in Python, `Number(...)` in TypeScript.
- **Unbound `fetch` as an instance property throws "Illegal invocation"** in
  browsers, though Node and MSW hide it → `fetch.bind(globalThis)` in
  `apiClient.ts`.
- **SQLAlchemy does not order plain-FK inserts across tables in one flush** →
  `session.flush()` the parents first (see `AuthService.signup`).
- **Rust E0597**: do not hold a `MutexGuard` across an `if let` while the
  `State` binding drops — take the value in its own `let` first (`main.rs`
  exit handler).
- **`cargo build | tee | tail` masks cargo's exit code.** Grep the log for
  `error[` or `Finished`; do not trust the pipeline's status.
- **`cargo build` while `vitest` runs** starves the CPU into 5-second test
  timeouts that are not real failures. Re-run once the compile is done.
- **NBSP characters get mangled by editors**, and money formatting is full of
  them → `core/utils/money.py` binds one to `_NBSP` and formats through the
  constant, so no f-string in the tree carries a bare non-breaking space.

---

## 6. The machine

- **Python 3.14.4**, system install. Tests run on it directly; `.venv/` exists
  only to hold `ruff`, and `uv` is not on PATH — invoke it as `python -m uv`.
  The PDF engine needs a browser: after `pip install playwright`, run
  `python -m playwright install chromium` once (~150 MB). Without it `/pdf`
  returns a clean 503 and everything else works.
- **Node 24 / npm 11**, four workspaces: `henrioutai-ui`, `frontend-react`,
  `frontend-saas`, `frontend-electron`.
- **Rust 1.96 (MSVC)** at `%USERPROFILE%\.cargo\bin`, **not on the default
  PATH**. `billgen.bat` prepends it; in a shell,
  `export PATH="$USERPROFILE/.cargo/bin:$PATH"`. VS Build Tools 2026, Windows
  SDK 10.0.26100 and WebView2 are already installed.
- **Databases.** `var/billgen.dev.db` is the SQLite dev database, with smoke
  data (`henri@example.com` / `beta-password-1`). The desktop app uses a
  separate one under `%USERPROFILE%\Documents\BillGen` — deliberately not
  `%APPDATA%`, which an MSIX package virtualises and deletes on uninstall
  (`desktop/paths.py` carries the resolution order; `BILLGEN_DATA_DIR`
  overrides it). Postgres for SaaS work comes from `docker compose up -d`.
- **Settings** are read by `api/config.py` from the environment; every variable
  is documented in `.env.example`, which is the reference rather than a second
  document that can disagree with it.

---

## 7. Where the UI lives

`henrioutai-ui/` is the design system, published as `@henrioutai/ui`: tokens,
components, icons, fonts — business-free and public-ready. `frontend-react/` is
`@billgen/ui`, the business half (typed API client, generated types, hooks,
panels), and it re-exports the design system so `import { Button } from
"@billgen/ui"` still works. `frontend-saas/` and `frontend-electron/` are two
shells over both.

**A new component goes in `henrioutai-ui/src/components/`**, never duplicated
into a shell. Colours and spacing come from semantic tokens (`--bg-*`) only —
`docs/BRAND_TOKENS.md` is the standard and a guard test enforces it.

The prior product demos (`D:\CODING\audit-v2-react-exe`, `D:\CODING\FinanceFlow
Bill Generator`) are reference material, not code to edit — and they are on a
drive an agent session cannot reach. Any "match the demo" work needs the
screens pasted in or the folders copied into the tree first.
