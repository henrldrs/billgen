# BillGen — SaaS Rebuild

Clean-slate rebuild of FinanceFlow BillGen as a 3-layer, multi-tenant SaaS
(Desktop `.exe` + Web SaaS + FastAPI + Postgres/SQLite).

This is **not** a migration of the legacy React or Python codebases. Those
remain untouched as reference material. Everything under this root is
greenfield.

## Layout

| Path | Layer | Responsibility |
|---|---|---|
| `core/` | 1 — Business | Pure Python. Models, services, rules, repository ports, PDF (WeasyPrint), e-invoicing (UBL 2.1 / EN 16931). No FastAPI, no ORM, no React imports. |
| `db/` | Persistence | SQLAlchemy 2.x + Alembic. Implements `core/repository` abstract ports. Same code runs on SQLite (desktop) or Postgres (SaaS). |
| `api/` | 2 — API | FastAPI. HTTP surface, JWT auth, tenant scoping, request/response validation. Delegates every decision to `core/`. |
| `frontend-react/` | 3 — UI kit | Shared React components, panels, hooks. Published as `@billgen/ui`. Zero business logic. |
| `frontend-electron/` | 3 — Desktop | Tauri wrapper. Runs `api/` as a localhost sidecar; SQLite persistence. |
| `frontend-saas/` | 3 — Web | Public SaaS SPA. Auth, billing (Stripe), org switcher, marketing pages. |
| `infra/` | Deploy | Dockerfiles, GitHub Actions, deploy scripts. |
| `tests/` | Verify | pytest (core/api/db), Vitest (ui), Playwright (e2e), golden PDF/XML fixtures. |
| `docs/` | Record | Architecture Decision Records under `docs/ARCHITECTURE/`. |

## Getting started

Phase 0 — skeleton only. No functional code yet.

```bash
# Python side (uv workspace)
uv sync

# Frontend side (npm workspaces)
npm install

# Local Postgres + MinIO for SaaS dev
docker compose up -d
```

## Architecture decisions

See `docs/ARCHITECTURE/ADR-0001-three-layer.md`.
