# The minimal stack — 37 items, and where BillGen actually stands

Added 2026-09-04 from two reference images Henri supplied: the thirteen layers a
production full-stack app really has, and the taxonomy of API types.
**Re-cut 2026-09-04** against `themed/production-stack-audit.md`, which
cross-checks those thirteen against AWS Well-Architected, Twelve-Factor, OWASP
Top 10:2025, OWASP ASVS 5.0, Google SRE, DORA, ISO/IEC 25010:2023 and two
systematic reviews — and finds **24 more items the picture omits**.

The list is kept here as a **standing checklist**, not as a one-off audit. The
project-agnostic copy lives at `~/.claude/MINIMAL_STACK.md`; this file adds the
column that copy cannot have — what BillGen has, what it does not, and which
gaps are a *must* before money changes hands. Statuses were checked against the
repository on 2026-09-04, not against memory.

> The point of the first list was that "full-stack" is not two cylinders. The
> point of the re-cut is worse: it is not thirteen cylinders either. The
> thirteen are the ones a *diagram* shows. The twenty-four it omits — schema
> lifecycle, async work, secrets, dependency provenance, correlation IDs,
> alerting, security logging, runbooks, model pinning, evaluation, AI
> transparency — are the ones an *incident* shows.

## Tiers

- **T0 — Personal / local.** Runs on your machine. You are the only user.
- **T1 — Internal tool.** Other people depend on it. Bounded blast radius.
- **T2 — Public product.** Strangers use it. Someone pays, or would notice an outage.
- **T3 — Regulated / sensitive.** Personal, financial or health data; or a legal
  regime applies — GDPR, AI Act, e-invoicing, PCI.

Everything at or below your tier is required; everything above is deferred on
purpose.

**BillGen's tier is T3.** Not aspirationally — it issues fiscal documents under
a seven-year Belgian retention obligation, processes personal data of its
customers' customers, and ships AI-bearing features into the EU. Every row
below is therefore in scope. There is no "we're only small" exemption on this
product; the tier is set by the data and the regime, not by the headcount or
the revenue.

---

## The 37 items

Legend: ✅ done · ⚠️ partial · ❌ absent · ➖ deliberately not applicable.
A status with no evidence — a path, a command, an endpoint — is an opinion, not
a status.

### A · Product surface

| # | Item | Tier | BillGen | Evidence |
|---|---|---|---|---|
| **A1** | Frontend and client state | T0+ | ✅ | Three surfaces over one design system: `henrioutai-ui` (72 components), `frontend-saas`, `frontend-electron`. Application of the system is the open work, not the system. |
| **A2** | Accessibility and internationalisation | T1+ | ⚠️ | Stronger than expected on both halves. **i18n:** a real four-locale catalogue (`frontend-react/src/lib/translations.ts`, fr/nl/en/es, French first because `Company.default_language` is "fr") with `isLang()` narrowing untrusted input, its own test, and a backend that emits message *keys* rather than prose (`errCustomerName`, `warnSupplierBicInvalid`). **a11y:** ~10 panel test files assert through accessible roles and names, and the 2026-09-04 log records an unnamed-table regression caught *as a test failure* — which is the mechanism working. The gap is that there is no deliberate audit: no axe pass, no contrast check, no keyboard traversal of the shell. Caught-by-accident is not the same as verified. (The UI tests live beside the components, not under `tests/`.) |

### B · Application and API

| # | Item | Tier | BillGen | Evidence |
|---|---|---|---|---|
| **B1** | APIs and backend logic | T0+ | ✅ | FastAPI, **24 routers / 100 endpoints** (generated inventory, not counted by hand), `core/` services with the domain rules in pure Python. Past MVP since 2026-08-28. |
| **B2** | API surface classification | T1+ | ⚠️ | The routes exist and the audit engine enumerates them (`billgen-audit/.../scanners/routes.py`), and enforcement is real — `api/authz` returns 403, entitlements 402. What is missing is the *recorded* two-axis classification: trust boundary × protocol, per route. See "List 2" below, which is that classification started but not yet attached to the route table. |
| **B3** | Async work, jobs and scheduling | T1+ | ❌ | **Nothing.** No queue, no scheduler, no worker — grep finds no celery/rq/apscheduler/BackgroundTasks anywhere in `api/` or `core/`. This is not a nice-to-have here: **email (blocker B1) and Peppol transmission both need it**, and both are on the revenue path. Sending mail inside a request handler is how the first outage happens. |
| **B4** | Exception and edge-case handling | T0+ | ✅ | A genuinely thorough exception-to-status map in `api/main.py`; `core/services/errors.py`. Fails closed. |

### C · Data

| # | Item | Tier | BillGen | Evidence |
|---|---|---|---|---|
| **C1** | Database and storage | T0+ | ⚠️ | Postgres (prod) / SQLite (workstation), repository ports. Issued invoices now land on a **local filesystem archive** — `DOCUMENT_ROOT`, registered in `documents` with a hash (T-27), per organization on a host (T-33) — which is the whole answer on the desktop and half of it on a host. **No blob storage — blocker B2** still stands for the hosted SaaS: a filesystem on one VPS is not durable, and company logos and expense scans dangle on it. |
| **C2** | Migrations and schema lifecycle | T1+ | ⚠️ | Alembic, with a real migration history under `db/migrations/versions/`, and CI runs a sqlite/postgres matrix. What is missing is the *lifecycle* half: no migration has been run forward-then-back against production-shaped data, and at least one column has been added by a migration and never written — see `template_snapshot` in ADR-0006. A schema that grows columns nothing fills is a schema drifting from its own code. |
| **C3** | Backup, restore and retention | T1+ | ⚠️ | A real backup export/restore with an audit entry on both (`core/services/backup_service.py`, ADR-0003). The export carries the document register with its hashes since T-27, so a restore *names* the copies it cannot find. The desktop now writes a dated archive of the whole database at every boot and keeps thirty (`desktop/backups.py`, T-23), and a sidecar-written archive is restored through the API on every test run. A portable export exists too: AES-256-GCM over the JSON plus the documents, passphrase-derived with scrypt (T-28), so data can leave the machine without the file becoming the breach. **The hosted side still has no automated backups, no restore has been rehearsed on a real machine ([RESTORE_LOG.md](RESTORE_LOG.md) is empty of one), and no retention policy is expressed anywhere in code** — despite the seven-year Belgian obligation being the single hardest constraint on this product. An untested restore is a belief. |

### D · Platform and delivery

| # | Item | Tier | BillGen | Evidence |
|---|---|---|---|---|
| **D1** | Version control and codebase | T0+ | ✅ | Git, one repo, remote exists. |
| **D2** | Automated tests and quality gates | T1+ | ✅ | **554 tests** in 54 files across `tests/{api,core,db,desktop,e2e,ui}`; ruff + pytest + a Chromium PDF test gate CI. The domain rules — VAT, numbering, legal mentions — are tested where they live. |
| **D3** | Build, release, run separation | T1+ | ⚠️ | `Dockerfile` (api + web targets), `docker-compose.yml`, `infra/docker/` with a prod compose and a Caddyfile. Built and buildable; nothing is released or run anywhere. |
| **D4** | Configuration and secrets | T0+ | ✅ | `api/config.py` `Settings` (pydantic-settings) with `validate_for_boot` — production refuses the dev JWT secret, a secret under 32 bytes, or desktop_mode. `.env.example` documents only fields that actually exist, and says so in its own header. This one is better than most shipped products. |
| **D5** | Environments and dev/prod parity | T1+ | ⚠️ | Two environments are *described* (`.env.example` dev, `infra/docker/.env.prod.example`) and the split is honest about itself. The parity gap is named and real: **dev is SQLite, prod is Postgres**, and the gapless-numbering row lock (`.with_for_update()`) is correct only on Postgres. CI's sqlite/postgres matrix is what keeps this at ⚠️ rather than ❌. |
| **D6** | Dependency and supply-chain management | T1+ | ⚠️ | `uv.lock` pins the full Python tree; CI runs an advisory dependency audit. No SBOM, and the audit is advisory — it reports and does not block. |
| **D7** | Cloud and compute | T1+ | ❌ | No VPS provisioned. The decision is made (SaaS on a cloud VPS, never the workstation); the machine does not exist. |

### E · Runtime resilience

| # | Item | Tier | BillGen | Evidence |
|---|---|---|---|---|
| **E1** | Load balancing and scaling | T2+ | ❌ | Single instance. Two things to check the day this changes: the rate limiter (E2), and the numbering row lock (D5). |
| **E2** | Rate limiting and backpressure | T1+ | ⚠️ | `api/middleware/ratelimit.py` — in-memory sliding window per IP. Correct for one instance; it silently multiplies the limit by the number of instances the day a second one starts. Needs a shared store before scaling. No backpressure anywhere. |
| **E3** | Resilience patterns | T2+ | ❌ | No timeout policy, no retry policy, no circuit breaker. Not yet costly — there is exactly one outbound dependency shape today (the PDF engine, which `/readyz` checks). It becomes costly the moment Peppol, a payment gateway and an email provider are all in the path, which is the same moment revenue is. |
| **E4** | Caching and CDN | T2+ | ❌ | No cache layer in the API. The marketing site rides Vercel's CDN; the app has nothing. Not yet a problem — read volume is zero. Note the AI Act constraint in ADR-0005: whatever cache arrives must **preserve provenance marking**, so this row is no longer purely a performance decision. |
| **E5** | Availability and recovery | T2+ | ⚠️ | `/healthz`, `/readyz` (which already reports whether the PDF engine is up). No uptime measurement, no recovery objective written down. |

### F · Observability

| # | Item | Tier | BillGen | Evidence |
|---|---|---|---|---|
| **F1** | Logs as event streams | T0+ | ⚠️ | structlog access log to stdout — the right shape. **Nothing aggregates it**, so it is an event stream into a void. |
| **F2** | Metrics and the golden signals | T1+ | ❌ | No metrics of any kind. Latency, traffic, errors and saturation are all unmeasured. |
| **F3** | Traces and correlation | T2+ | ❌ | **No correlation ID.** The audit engine looks for one and reports its absence (`billgen-audit/.../scanners/operations.py:273`). Two log lines from the same request cannot be tied together today. This is the cheapest item in section F and the one that makes the others readable. |
| **F4** | Alerting on symptoms | T2+ | ❌ | Nothing alerts on anything. No error tracker either — nothing collects a stack trace from a running server. You cannot support a customer whose error you never saw. |

### G · Security and compliance

| # | Item | Tier | BillGen | Evidence |
|---|---|---|---|---|
| **G1** | Authentication | T1+ | ⚠️ | JWT access + rotating refresh, session list and per-session revocation, password change (`api/security/auth_service.py`). Missing: 2FA, email verification, password reset — the last two behind blocker B1 (no mail). |
| **G2** | Authorisation and access control | T1+ | ✅ | Four-role matrix in `api/authz` **enforced** (403), entitlements (402) kept separate from it, tenancy through repository ports so it cannot be forgotten a layer up. Tested (`tests/api/test_tenant_isolation.py`). |
| **G3** | Transport, storage and cryptography | T1+ | ⚠️ | TLS is planned at the edge (Caddyfile). Tenant isolation is real and tested — but enforced in the **repository layer, not by the database**. There is no Postgres row-level security; a raw query or a future service that bypasses the repository is stopped by nothing. |
| **G4** | Security logging and alerting | T1+ | ⚠️ | Better than expected: the append-only audit log records sign-ins, sign-outs, session revocations and password changes, and `core/trust/security_events.py` is an honest filter over it — including `unrecorded()`, which exists precisely so a security screen can say "not watching" rather than render an empty table that reads as "no incidents". The gap is the second half of the item's name: nothing **alerts**. |
| **G5** | Privacy and regulatory compliance | T3+ | ⚠️ | Three registries exist and are honest about being registries rather than prose: `core/trust/legal.py` (seven documents, none drafted, each recording what it blocks), `core/trust/personal_data.py`, `core/trust/consent.py`. **No document is drafted** — that is a lawyer's work, correctly not faked. Retention is the conspicuous hole: see C3. |

### H · Economics and stewardship

| # | Item | Tier | BillGen | Evidence |
|---|---|---|---|---|
| **H1** | Cost visibility and control | T1+ | ➖→❌ | Nothing to measure while nothing is hosted. Becomes ❌ the day D7 is provisioned, and the item to build then is a budget alarm, not a dashboard. |
| **H2** | Documentation and runbooks | T1+ | ⚠️ | Documentation is a genuine strength — `docs/ARCHITECTURE/` ADRs, `ROADMAP_IA.md`, `SOLO_RUN.md`, `HANDBOOK.md`, and an audit engine that regenerates the architecture doc's volatile parts. **Runbooks are the missing half**: there is no written procedure for restore, rollback, incident, or key rotation. Documentation explains the system; a runbook tells a tired person what to type at 3am. |
| **H3** | Sustainability | T2+ | ➖ | Deferred on purpose. Revisit when D7 exists and there is a machine whose size is a choice. |

### I · AI-bearing systems

*In scope: BillGen ships AI features to paying customers under its own name.
See ADR-0005 for why that makes Henri a **provider**, not merely a deployer.*

| # | Item | Tier | BillGen | Evidence |
|---|---|---|---|---|
| **I1** | Model and inference layer | T1+ | ❌ | No model is in the request path *yet* — the TVA classification surfaces are designed (`core/tva/`) with `confidence` and reason codes already riding along, but nothing calls a model. The item is ❌ rather than ➖ because the pinning and prompt-versioning discipline has to exist **before** the first call, not after: `:latest` in production is an AI Act GPAI-governance failure, not just an ops smell. |
| **I2** | Evaluation harness | T1+ | ❌ | Nothing measures generated-output quality. Same timing argument as I1 — the held-out set is cheap before the feature ships and political after. |
| **I3** | AI transparency and provenance | T2+ | ⚠️ | `core/trust/ai_transparency.py` is a real, well-reasoned ledger of which surfaces must be marked, with the Annex III drift named per surface. **Its obligation date was wrong and is corrected in this pass** — see ADR-0005 §3. Nothing renders a marker yet, and no provenance metadata is attached at generation time. |
| **I4** | AI literacy and system inventory | T1+ | ❌ | The Article 4 inventory does not exist. `ai_transparency.SURFACES` is a *product-feature* registry, not a *system* inventory — it does not record which model, which version, which provider, where inference runs, what data crosses the boundary, or who was trained on what. Enforcement of Art. 4 began **2 August 2026**; this is live exposure, and it is a few hours of work. |

---

## What is a must, in order

Before the first paying customer:

1. **I4 + I3 — the Article 4 inventory and the transparency layer.** Moved to
   the top of this list by ADR-0005: both obligations are **already live**
   (2 Aug 2026), BillGen gets **no watermarking grace period** because it was
   not on the market before that date, and an undocumented Article 4 failure is
   an *aggravating factor in any other enforcement action*. Cheapest item here,
   and the only one already accruing exposure.
2. **C3 — automated backups + one rehearsed restore.** Fiscal data under a
   seven-year retention obligation with no tested restore is the one failure
   that cannot be apologised for.
3. **F4 + F3 — an error tracker and a correlation ID.** Support is impossible
   without the first; the second is an afternoon and makes every log line after
   it useful.
4. **D7 + D3 — hosting and the machine.** Nothing else can be verified until
   the thing runs somewhere that is not this workstation.
5. **B3 — a job queue.** Not for scale — because email and Peppol transmission
   are both on the revenue path and neither belongs in a request handler.
6. **D1/CI — watch CI actually run once.** A green badge nobody has seen go red
   is not a quality gate.
7. **C1 — blob storage (B2)**, if documents ship in v1.

Should follow soon after: **E2** (shared rate-limit store), **G3** (database
row-level security as a second belt under the repository's braces), **H2**
(runbooks — at minimum: restore, rollback, incident), **C2** (retention policy
in code), **A2** (an actual accessibility pass).

Genuinely later: **E1**, **E4**, **H3**. All three are answers to load that
does not exist, and building them now would be guessing at a shape. **I1/I2**
become urgent the moment the first model call is written, and not one day
before — but they must land *with* it, not after.

---

## List 2 — the API taxonomy, on two axes

The source infographic conflates transport style (REST/SOAP/GraphQL) with trust
boundary (open/internal/partner). They are independent, and the audit's B2 item
is right that both have to be recorded per surface: an endpoint built for
internal use ends up reachable from the internet with internal-grade auth
precisely when only one axis was written down.

| Trust boundary | Protocol | BillGen |
|---|---|---|
| **Open** | REST | ✅ The whole customer-facing API. |
| | SOAP | ➖ Not used — with one asterisk: Peppol transport is AS4, the same *family* of enterprise messaging, and will feel like it. |
| | GraphQL | ➖ Deliberately not. One client shape, one team; the flexibility would buy nothing and cost a caching story. |
| **Internal** | Frontend → backend | ✅ Every screen. |
| | Backend → backend | ⚠️ One case: the desktop sidecar bootstrap (`api/routers/desktop.py`). Nothing else talks service-to-service, because there is one service. |
| | Service → database | ✅ Through repository ports, so tenancy cannot be forgotten one layer up. |
| **Partner** | B2B integration | ❌ **The whole commercial gap.** Peppol Access Point (validated BIS 3.0 XML is produced and nothing transmits it), payment gateway / Merchant of Record, banking CODA-PSD2. |
| | Affiliate | ➖ Not planned. |
| | Data sharing | ❌ An accounting export the customer's bookkeeper consumes, plus a public API and webhooks for customers (`settings.api`, unbuilt). |
| **Agent** | Tool call / MCP | ➖ Not planned, and worth a deliberate decision rather than a drift. If BillGen ever exposes invoice creation as a tool call, that is a **new trust boundary** with no session, no browser and no human in the loop — not a REST endpoint with a different content type. |

**The lesson from this list, for this product:** everything BillGen has is the
easy half — REST, frontend-to-backend, service-to-database. Every remaining
revenue-bearing feature is in the *partner* row, and partner APIs are the ones
with contracts, certification and someone else's timeline attached. Peppol
first: the export already exists and is validated, so the work is transport,
not format.

---

## How to use this

Walk the table top to bottom and give each item ✅ / ⚠️ / ❌ / ➖ with a sentence
of evidence — a file path, a command that runs, an endpoint that answers. A
status with no evidence is an opinion.

The failure mode this exists to prevent is not ignorance of the layers. It is
finishing A1 and B1, feeling done, and discovering F4 and C3 the week after the
first customer's data goes missing.

**Related:**
[ROADMAP_IA.md](ROADMAP_IA.md) covers the *product* layers L1–L6 (features),
which is a different axis entirely — a feature can be complete at L1 and still
be sitting on a stack missing four of these thirty-seven.
[ADR-0005](ARCHITECTURE/ADR-0005-ai-act-position.md) holds section I's
reasoning: role, per-surface classification, and the dates.
[ADR-0006](ARCHITECTURE/ADR-0006-invoice-conformity-layers.md) holds the
invoice-conformity layering (P0–P3) that B4 and C2 both touch.

**Sources absorbed into this file:** `themed/production-stack-audit.md` (the
37 items, tiers and verification tests) and `themed/ai-act-blueprint.md` §3
(the thirteen-layer extraction and the layer-to-obligation crosswalk). Neither
is copied into the repo; their concerns live here, with BillGen's evidence
attached.
