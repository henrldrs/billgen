# ADR-0001 — Three-layer architecture (CORE / API / FRONTEND)

- **Date:** 2026-07-04
- **Status:** Accepted
- **Deciders:** Product owner + Data Architect

## Context

The prior product (FinanceFlow BillGen v2.1.0 in `D:\CODING\audit-v2-react-exe`,
plus the MyShop iterations under `C:\Users\hdr_s\Documents\business model\`) mixed
business logic into React panels (`InvoiceBuilderPanel.tsx`, `App.tsx`) and
duplicated a subset of the same domain in a legacy Python/Tkinter path
(`bill_generator.py`, `core/db.py`, `core/invoice_engine.py`). Data schemas
diverged between the two paths, three Critical bugs shipped in the legacy path,
and there was no way to enforce Belgian gapless invoice numbering at the seller
level.

The Data Architect's directive is: do **not** correct the legacy code — build
from scratch in a way that treats domain logic as the load-bearing layer.

## Decision

Adopt a three-layer split, with persistence as a separate technical layer:

1. **CORE** (`/core`) — pure Python. Domain models (Pydantic), use-case services,
   rules (VAT, discounts, gapless numbering, Belgian legal mentions), abstract
   repository ports, PDF rendering (WeasyPrint + Jinja2), e-invoicing (UBL 2.1 /
   EN 16931). No FastAPI, no ORM, no React imports.
2. **API** (`/api`) — FastAPI. HTTP surface only. JWT auth, tenant scoping
   (org_id from claims into a ContextVar), request/response validation
   (Pydantic). Delegates every business decision to CORE.
3. **FRONTEND** — three consumers of the same OpenAPI schema:
   - `frontend-react/` — shared UI kit (`@billgen/ui`): components, panels,
     hooks. Zero business logic.
   - `frontend-electron/` — Tauri wrapper: ships FastAPI as a localhost sidecar
     with SQLite persistence. License file verified locally.
   - `frontend-saas/` — public web SaaS SPA: auth flows, Stripe billing, org
     switcher, marketing pages.
4. **DB** (`/db`) — SQLAlchemy 2.x + Alembic. Provides ORM implementations of
   the abstract repository ports declared in CORE. Same repository interface
   is satisfied by SQLite (desktop) and Postgres (SaaS).

## Consequences

- Every business table carries `organization_id`; a tenant middleware in the
  API injects it into a ContextVar and repositories read it from there —
  repository methods never accept a raw `org_id` parameter, so a router bug
  cannot cross tenants.
- The same CORE runs against SQLite (desktop) and Postgres (SaaS) via
  port/adapter inversion. One codebase, two persistence backings.
- Frontends cannot express any rule the API does not publish, so business
  logic drift between UI and server is structurally impossible.
- PDF and Peppol XML are generated server-side (one engine each: WeasyPrint,
  UBL builder), eliminating the jsPDF + ReportLab + fpdf2 triple duplication
  in the legacy code.
- Invoice numbering is enforced by a `sequence` table with row locks
  (per-organization, monotonic, gapless). Hard-delete is disallowed at the
  repository level; correction goes through credit notes.

## Non-goals

- No migration of legacy React/Python data. If a legacy customer needs to
  bring data across, a one-shot `import_service` will read an export bundle.
  The legacy folders are read-only reference.
- No Electron path with full Node context. The desktop wrapper is Tauri;
  Electron is only a fallback if Tauri proves unworkable, and would not
  change any CORE/API code.

## References

- Full 12-phase refactor plan produced 2026-07-04 in the source conversation.
- Prior audits at `D:\CODING\audit-v2-react-exe\00_EXECUTIVE_SUMMARY.md`
  through `15_FINAL_SCORECARD.md` and `BETA VERSION\audit 29-4\`.
