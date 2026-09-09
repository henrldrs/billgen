# BillGen — SaaS Rebuild

Clean-slate rebuild of FinanceFlow BillGen as a 3-layer, multi-tenant SaaS
(Desktop `.exe` + Web SaaS + FastAPI + Postgres/SQLite).

This is **not** a migration of the legacy React or Python codebases. Those
remain untouched as reference material. Everything under this root is
greenfield.

## Layout

| Path | Layer | Responsibility |
|---|---|---|
| `core/` | 1 — Business | Pure Python. Models, services, rules, repository ports, PDF (headless Chromium via Playwright), e-invoicing (Peppol BIS 3.0 / UBL 2.1 / EN 16931). No FastAPI, no ORM, no React imports. |
| `db/` | Persistence | SQLAlchemy 2.x + Alembic. Implements `core/repository` abstract ports. Same code runs on SQLite (desktop) or Postgres (SaaS). |
| `api/` | 2 — API | FastAPI. HTTP surface, JWT auth, tenant scoping, request/response validation. Delegates every decision to `core/`. |
| `frontend-react/` | 3 — UI kit | Shared React components, panels, hooks. Published as `@billgen/ui`. Zero business logic. |
| `frontend-electron/` | 3 — Desktop | Tauri wrapper. Runs `api/` as a localhost sidecar; SQLite persistence. |
| `frontend-saas/` | 3 — Web | Public SaaS SPA. Auth, billing (Stripe), org switcher, marketing pages. |
| `infra/` | Deploy | Dockerfiles, GitHub Actions, deploy scripts. |
| `tests/` | Verify | pytest (core/api/db), Vitest (ui), Playwright (e2e), golden PDF/XML fixtures. |
| `docs/` | Record | Architecture Decision Records under `docs/ARCHITECTURE/`. |

## Getting started

Phases 0–9 + 11 are done (multi-tenant API, SaaS + desktop shells, Peppol
BIS 3.0, PDF, legacy import); Phase 10 (billing) is not started. The full,
current map — how to run it, test counts, toolchain, known gaps — is
**`docs/HANDOFF.md`**. Quickest start: double-click **`billgen.bat`**
(menu: web app / desktop app / run all tests / first-time setup).

```bash
# Frontend side (npm workspaces)
npm install

# Python side: system pip, no venv — exact package list in docs/HANDOFF.md §8

# Local Postgres + MinIO for SaaS dev (optional; SQLite works out of the box)
docker compose up -d
```

## Architecture decisions

See `docs/ARCHITECTURE/ADR-0001-three-layer.md` (three-layer split) and
`docs/ARCHITECTURE/ADR-0002-invoice-lifecycle.md` (draft → issued lifecycle).
