# ADR-0004 — Web deployment topology

Status: **proposed** (2026-07-16) · Owner: Henri · Track: deployment path
(HANDOFF §9), stage 3 — "web deploy"

Amended 2026-09-09: still the SaaS topology, unchanged. For the first beta
client the desktop build precedes it again — her data must not be hosted by
us — see `docs/BETA_LAUNCH_PLAN.md` §W3 and TICKETS T-19…T-23. The VPS path is
deferred for her, not abandoned.

## Context

The deployment path decided 2026-07-12 is **safety net → desktop installer →
web deploy**, with the SaaS running on a **cloud VPS** and the workstation as
build/deploy origin only. Stages 1–2 of the safety net are done (config guards
`64415f1`, backup/restore `66a0baa`); stage 3 of the safety net — CI — is
written but has never executed, because the repo has no git remote.

An audit of the repo against a conventional 2026 SaaS stack (Next.js /
FastAPI / Postgres / Redis / managed auth / Stripe / managed infra /
observability) found the application layer largely complete and the
**deployment layer at approximately zero**. The findings below are the state
**as first measured on 2026-07-16**; several were closed the same day by this
ADR's first implementation pass — see "Implementation status" at the end
rather than reading this list as current.

- `infra/` is three empty `.gitkeep` files. No Dockerfile exists anywhere.
- No git remote → `.github/workflows/ci.yml` has never run.
- No Python lockfile. CI installs unpinned deps via a bare `pip install`.
- CI never exercises Postgres; "runs on Postgres" is an untested assumption.
- `RateLimitMiddleware` keeps its sliding window **in process memory** — it
  silently stops limiting anything the moment a second worker or replica
  exists.
- Observability is `structlog` key-value output to a console. No error
  tracking, no request correlation.
- The API does not serve the SPA, so nothing is reachable end to end.
- `ruff` and `mypy` are configured in `pyproject.toml` but no gate runs them.
- **`.env.example` documents variables that do not exist in code**
  (`API_HOST`, `API_PORT`, `STORAGE_BACKEND`, `S3_*`, `STRIPE_*`,
  `POSTMARK_SERVER_TOKEN`), while omitting `CORS_ORIGINS` and
  `RATE_LIMIT_PER_MINUTE` — the two settings a hosted boot actually depends
  on. `Settings` uses `extra="ignore"`, so the phantom vars fail silently.

The deliberate divergences from the conventional stack (Vite SPA over
Next.js; self-rolled JWT + argon2 over Clerk/Auth0) stand — there is no
SEO/SSR requirement, and the auth is tenant-safe and tested. But the auth
choice carries an unwritten consequence: **no password reset, no email
verification, and no email transport at all.** A hosted product where a
forgotten password is a permanent lockout is not shippable, which makes
email a hard dependency of this stage rather than a Phase 10 nicety.

## Decision

**One VPS running Docker Compose behind Caddy, with managed Postgres,
deployed by GitHub Actions from a tag.**

### Topology

```
                    Caddy (TLS, auto-renew)
                   /                      \
        /  → static SPA bundle       /api/* → uvicorn (FastAPI)
                                              │
                                    ┌─────────┴─────────┐
                                 Redis            managed Postgres
                              (rate limit)         (off-box, PITR)
```

### The decisions this records

1. **Caddy terminates TLS and serves the SPA; the API is proxied under
   `/api/*`.** Same-origin, so CORS reduces to a single origin and the
   browser never makes a cross-site request. Caddy over Nginx/Traefik purely
   for automatic certificate issuance and renewal with no extra moving parts.

2. **Postgres is managed and off-box, not a container on the VPS.** This
   costs money and adds a network hop. It is chosen anyway because the data
   is legally-binding gapless invoice series: point-in-time recovery and
   tested backups are the product's real safety net, and a solo operator
   should not be the person responsible for proving a `pg_dump` cron actually
   restores. ADR-0003's logical export is an application feature and does not
   substitute for database-level backups.

3. **The image ships Chromium, and only Chromium.** The handover note used
   to name a second, GTK-based engine as the Docker/SaaS fallback, which
   would have meant desktop rendering a legally-binding invoice through one
   engine while SaaS rendered the same invoice through another — two engines,
   two visual outputs, for the same document. Fidelity wins over image size:
   install Chromium via `playwright install --with-deps chromium`.
   *(Amended 2026-09-09, T-24: the fallback was deleted rather than kept. It
   was never installed in the image and never had the golden-file test this
   ADR asked for, so it was a second appearance nobody had ever looked at.)*

4. **Redis backs the rate limiter.** This is the one place the conventional
   stack's Redis is not optional for us: without it, the limiter is
   decorative under any multi-worker deploy. Sessions stay in JWTs; Redis is
   not introduced for caching or queues at this stage.

5. **`uv` produces the lockfile.** `pyproject.toml` already declares
   `[tool.uv.workspace]` with `core`/`db`/`api` as members, so `uv lock` +
   `uv sync --frozen` is the consistent choice. CI and the image both install
   frozen; an unpinned `pip install` never runs again.

6. **Migrations run as a discrete pre-start step, never on app boot.**
   `desktop/bootstrap.py` migrates on boot because it is a single local
   process. A hosted deploy with multiple workers racing `alembic upgrade
   head` is a corruption vector. Deploy = migrate, then start.

7. **Secrets live only on the VPS**, in a root-owned `0600` env file
   referenced by Compose. Not in git, not in the image, not in Compose YAML.
   `JWT_SECRET` is generated once with `openssl rand -base64 48`; rotating it
   invalidates every session, which is the intended blast radius.

8. **Sentry for errors, plus a request-id middleware.** Full OpenTelemetry
   and a metrics stack are deferred — they are the right answer at team
   scale and are overhead for a solo operator today. Errors and correlated
   request logs are the floor, and structlog already emits structured output
   ready to carry a request id.

9. **`.env.example` is rewritten to match `api/config.py` exactly.** It
   currently teaches variables that do nothing. Every variable it lists must
   map to a `Settings` field, and every prod-relevant `Settings` field must
   appear.

### Deploy pipeline

Tag `v*` on `main` → GitHub Actions runs the existing gate (plus the
additions below) → builds the image → pushes to GHCR → SSHes to the VPS →
`docker compose pull && alembic upgrade head && docker compose up -d`.
Rollback is re-deploying the previous tag; migrations must therefore stay
backward-compatible within a release pair.

### CI additions required before any deploy

- Install from the `uv` lockfile, frozen.
- A Postgres service container, with the Python suite running against it —
  not only SQLite.
- `ruff check` as a gate.
- `pip-audit` / `npm audit` on the dependency surface.
- Build the image on every PR so a broken Dockerfile fails before a tag.

**Amended 2026-07-16, after measuring instead of assuming.** This ADR
originally listed `ruff` *and* `mypy` as gates, and the audits as gates. Both
claims were written without running the tools. What the numbers showed:

- **ruff: 267 errors, now 0 — it is a gate.** The bulk was never real
  findings: 59 B008 were FastAPI's `Depends()` idiom in router signatures, and
  105 PLR2004 were literal status codes in tests. Config, not defects. 54 more
  were auto-fixed (219 tests still green, so behaviour-neutral). What remains
  ignored is recorded with reasons in `pyproject.toml`; the honest debt is
  PLR2004 in `core/rules/` (VAT digit counts, sequence bounds), where named
  constants would genuinely read better but mean editing the numbering and
  checksum code for zero behaviour change — its own reviewed change, not a
  deploy-eve drive-by.
- **mypy: 264 errors across 53 files — it is NOT a gate, and this ADR was
  wrong to imply it could be.** `strict = true` has been configured since the
  scaffold and never run against the code, so it describes an aspiration, not
  the codebase. Making it pass is a real project (missing return annotations,
  untyped decorators on the exception handlers, and so on). It is deliberately
  absent from CI rather than added as a permanently-red job nobody reads. The
  honest options, for a later decision: relax `strict` to a baseline the code
  meets and ratchet up, or gate `core/` only — it is the pure layer and the
  one where types pay most.
- **The audits are advisory (`continue-on-error`), not gates.** A gate on
  `pip-audit`/`npm audit` hands a third party a veto over your deploys: the
  build fails the day someone publishes a CVE in a transitive dependency,
  unrelated to the change under test, and blocks a hotfix exactly when one is
  needed.

## Alternatives rejected

- **Vercel + Railway** (the conventional default). Rejected against the
  2026-07-12 VPS decision, and a poor fit: the PDF engine wants a real
  filesystem and a Chromium install, which is awkward-to-hostile on
  serverless. One VPS is also materially cheaper at this scale.
- **Postgres as a Compose container on the same VPS.** Cheaper and simpler
  to stand up; rejected because it makes backup correctness the operator's
  unpaid job and puts the database on the same disk as the thing that might
  fill it. Revisit only with a tested, off-box, regularly *restored* dump.
- **Serving the SPA from FastAPI via `StaticFiles`.** One fewer component,
  and viable — rejected because Caddy is already there for TLS and serves
  static assets better than uvicorn will, with no extra deployment surface.
- **Kubernetes.** Not at one node and one engineer.
- **Deferring Redis and accepting the in-memory limiter.** Only honest with
  a single worker, which wastes the box and makes a slow PDF render block
  unrelated requests.

## Consequences

- **This ADR is blocked in its entirety on the git remote.** Every step above
  routes through CI, and CI cannot run without a push target. That single
  unstarted task gates the whole stage.
- Same-origin routing means `VITE_API_URL` is baked at *build* time into the
  SPA bundle, so the image is environment-specific. It should build with a
  relative `/api` base so one bundle works everywhere.
- Managed Postgres is a recurring cost and a network dependency: a provider
  outage is a full outage, with no local fallback.
- Chromium in the image costs roughly a gigabyte and slows image pulls;
  accepted for render fidelity.
- Email and password reset become in-scope for this stage rather than Phase
  10. Provider choice is left open here; `.env.example` already anticipates
  Postmark.
- The desktop path is unaffected: it keeps SQLite, migrate-on-boot, Chromium,
  and no Redis. This ADR governs the hosted deployment only.

## Implementation status (2026-07-16)

**Done, and verified locally:**

- `uv.lock` — 77 packages. `uv sync --frozen --no-dev --package billgen-api`
  resolves all three workspace members plus playwright/psycopg/alembic.
- `Dockerfile` (targets `api` + `web`), `.dockerignore`,
  `infra/docker/{docker-compose.prod.yml,Caddyfile,.env.prod.example}`.
- `ruff` green across the repo; 219 Python tests still pass.
- The suite is engine-agnostic: `conftest.py` reads `TEST_DATABASE_URL`,
  defaulting to SQLite so local workflows are untouched.
- `.github/workflows/ci.yml` rewritten: frozen install, SQLite × Postgres
  matrix, lint gate, image build on PRs, advisory audits.
- `.env.example` rewritten to match `api/config.py`, with the
  not-yet-implemented variables quarantined in a clearly-labelled block.

**Written but NOT verified — no Docker and no Postgres in the authoring
environment:**

- Neither image has ever been built. The apt/Chromium layer, the Caddy config
  and the compose wiring are reasoned, not observed.
- The suite has never actually run against Postgres. The wiring is in place
  and the SQLite path is proven unchanged, but the first green Postgres run is
  still owed. Expect SQLite-shaped assumptions to surface.
- CI has still never executed at all. Its first run is an experiment.

**Not started:** the VPS itself, DNS, the managed database, secrets on the
box, Sentry, email/password reset, and the deploy step (deliberately omitted
from CI — there is no host to SSH to yet).

## Open decision for Henri

**Managed Postgres vs. a container on the VPS** is the one call in here with
a real cost attached and no obviously correct answer at your scale. The
recommendation above is managed, on data-safety grounds. If the recurring
cost is the deciding factor, the container path is defensible *provided*
off-box dumps and a rehearsed restore land in the same week — not later.
