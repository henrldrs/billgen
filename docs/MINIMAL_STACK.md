# The minimal stack — the two reference lists, and where BillGen actually stands

Added 2026-09-04 from two reference images Henri supplied: the thirteen layers a
production full-stack app really has, and the taxonomy of API types. They are
kept here as a **standing checklist**, not as a one-off audit — the
project-agnostic copy lives at `~/.claude/MINIMAL_STACK.md` so every project
starts from the same definition of minimal.

This file adds the second column: what BillGen has, what it does not, and which
gaps are a *must* before money changes hands. Statuses were checked against the
repository on 2026-09-04, not against memory.

> The point of the first list is that "full-stack" is not two cylinders. Eleven
> of the thirteen layers are invisible from the frontend, and every one of them
> is discovered late and expensively. The point of the second is narrower: know
> which kind of API you are building before you design it, because the wrong
> kind is a rewrite rather than a refactor.

---

## List 1 — the thirteen layers of production

| # | Layer | BillGen | What is actually there / missing |
|---|---|---|---|
| 1 | **Frontend** | ✅ Done | Three surfaces over one design system: `henrioutai-ui` (72 components), `frontend-saas`, `frontend-electron`. Application of the system is the open work, not the system. |
| 2 | **APIs & backend logic** | ✅ Done | FastAPI, 25 routers, `core/` services with the domain rules in pure Python. Past MVP since 2026-08-28. |
| 3 | **Database & storage** | ⚠️ Partial | Postgres (prod) / SQLite (workstation), Alembic, repository ports. **No blob storage — blocker B2.** Documents, company logos and expense scans all dangle on it. |
| 4 | **Auth & permissions** | ⚠️ Partial | JWT access + rotating refresh, session list and per-session revocation, password change, four-role matrix in `api/authz` **enforced** (403), entitlements (402) separate from it. Missing: 2FA, email verification and password reset — the last two behind blocker B1. |
| 5 | **Hosting & deployment** | ⚠️ Partial | `Dockerfile` (api + web targets), `docker-compose.yml`, `infra/docker/` with a prod compose and a Caddyfile. Nothing is deployed. |
| 6 | **Cloud & compute** | ❌ None | No VPS provisioned. The deployment decision is made (SaaS on a cloud VPS, never the workstation); the machine does not exist yet. |
| 7 | **CI/CD & version control** | ⚠️ Partial | Git + `.github/workflows/ci.yml`: sqlite/postgres matrix, ruff, pytest, Chromium for the PDF test, both Docker targets, advisory dependency audit. The file's own header says it is inert until the repo has a remote — **the remote now exists, so that comment is stale and the first real run has still not been watched.** |
| 8 | **Security & RLS** | ⚠️ Partial | Tenant isolation is real and tested (`core/tenancy.py` ContextVar + `guard_tenant`, ADR-0001, `tests/api/test_tenant_isolation.py`) — but it is enforced in the **repository layer, not by the database**. There is no Postgres row-level security. A raw query or a future service that bypasses the repository is not stopped by anything. |
| 9 | **Rate limiting** | ⚠️ Partial | `api/middleware/ratelimit.py` — in-memory sliding window per IP. Correct for one instance; it silently multiplies the limit by the number of instances the day a second one starts. Needs a shared store (Redis) before scaling. |
| 10 | **Caching & CDN** | ❌ None | No cache layer anywhere in the API. The marketing site rides Vercel's CDN; the app has nothing. Not yet a problem — read volume is zero. |
| 11 | **Load balancing & scaling** | ❌ None | Single instance. Two things to check first when this changes: the rate limiter above, and the gapless numbering row lock (`.with_for_update()`), which is the one piece of logic that is correct only on Postgres. |
| 12 | **Error tracking & logs** | ⚠️ Partial | structlog access log, and a genuinely thorough exception-to-status map in `api/main.py`. **No error tracker and no log aggregation** — nothing collects a stack trace from a running server. You cannot support a customer whose error you never saw. |
| 13 | **Availability & recovery** | ⚠️ Partial | `/healthz`, `/readyz` (which already reports whether the PDF engine is up), and a real backup export/restore with an audit entry on both. **No automated backups, no uptime measurement, no restore ever rehearsed.** An untested restore is a belief, not a backup. |

### What is a must, in order

Before the first paying customer:

1. **13 — automated backups + one rehearsed restore.** Fiscal data with a
   seven-year retention obligation and no tested restore is the one failure
   that cannot be apologised for.
2. **12 — an error tracker.** Support is impossible without it, and it is an
   afternoon of work.
3. **5 + 6 — hosting and the machine.** Nothing else can be verified until the
   thing runs somewhere that is not this workstation.
4. **7 — watch CI actually run once.** A green badge nobody has seen go red is
   not a quality gate.
5. **3 — blob storage (B2)**, if documents ship in v1. If they do not, this
   moves down.

Should follow soon after: **9** (shared rate-limit store) and **8** (database
row-level security as a second belt under the repository's braces).

Genuinely later: **10** and **11**. Both are answers to load that does not
exist, and building them now would be guessing at a shape.

---

## List 2 — the API taxonomy, and which kinds BillGen needs

| Kind | | BillGen |
|---|---|---|
| **Open** | REST | ✅ The whole API. |
| | SOAP | ➖ Not used — with one asterisk: Peppol transport is AS4, which is the same *family* of enterprise messaging and will feel like it. |
| | GraphQL | ➖ Deliberately not. One client shape, one team; the flexibility would buy nothing and cost a caching story. |
| **Internal** | Frontend → backend | ✅ Every screen. |
| | Backend → backend | ⚠️ One case exists: the desktop sidecar bootstrap (`api/routers/desktop.py`). Nothing else talks service-to-service, because there is one service. |
| | Service → database | ✅ Through repository ports, so tenancy cannot be forgotten one layer up. |
| **Partner** | B2B integration | ❌ **The whole commercial gap.** Peppol Access Point (validated BIS 3.0 XML is produced and nothing transmits it), payment gateway / Merchant of Record, banking CODA-PSD2. This row is where BillGen stops being a document generator. |
| | Affiliate | ➖ Not planned. |
| | Data sharing | ❌ The BillGen-shaped version is an accounting export the customer's bookkeeper consumes, plus a public API and webhooks for customers (`settings.api`, unbuilt). |

**The lesson from this list, for this product:** everything BillGen has is the
easy half — REST, frontend-to-backend, service-to-database. Every remaining
revenue-bearing feature is in the *partner* row, and partner APIs are the ones
with contracts, certification and someone else's timeline attached. Peppol
first: the export already exists and is validated, so the work is transport,
not format.

---

## How to use this

When starting or reviewing any project, walk list 1 top to bottom and give each
layer one of ✅ / ⚠️ / ❌ with a sentence of evidence — a file path, a command
that runs, an endpoint that answers. A layer with a status and no evidence is
an opinion.

The failure mode this exists to prevent is not ignorance of the layers. It is
finishing layers 1 and 2, feeling done, and discovering 12 and 13 the week
after the first customer's data goes missing.

Related: [ROADMAP_IA.md](ROADMAP_IA.md) covers the *product* layers L1–L6
(features), which is a different axis entirely — a feature can be complete at
L1 and still be sitting on a stack that is missing four of the thirteen.
