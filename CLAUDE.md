# BillGen — what a session needs before it changes anything

Belgian invoicing SaaS. Three layers — `core/` (pure Python domain) → `api/`
(FastAPI) → `db/` (SQLAlchemy) — and four frontend surfaces sharing one design
system. Python 3.14 on system pip, npm workspaces for the rest.

**Start with [docs/SOLO_RUN.md](docs/SOLO_RUN.md)**, the resume protocol, then
take the top open ticket from [docs/TICKETS.md](docs/TICKETS.md). Neither
depends on remembering a conversation, which is the point of both.

## Where each kind of fact lives

| Kind of fact | Where |
|---|---|
| What to work on next | `docs/TICKETS.md` — the queue, in priority order |
| Where the last session stopped | `docs/SOLO_RUN.md` — the live ledger |
| How to run it, how a request flows, what has already bitten | `docs/HANDBOOK.md` |
| Environment variables | `.env.example` — the reference, not a second document |
| How the system is shaped, and why | `docs/ARCHITECTURE/system-architecture.html` (read the `.txt`), `ADR-0001`…`ADR-0006` |
| Production readiness, layer by layer | `docs/MINIMAL_STACK.md` |
| The launch's business half | `docs/BETA_LAUNCH_PLAN.md` |
| Colours, type, tokens | `docs/BRAND_TOKENS.md` |
| Every screen and how wired it is | `frontend-react/src/scaffold/ia.ts` → `docs/ROADMAP_IA.md` |
| What Henri wants built, in his words | the `.txt` specs in `docs/` — onboarding, settings, dashboard, SaaS appearance |
| Legal and compliance posture | `core/trust/` → generated into `docs/LEGAL_BRIEF.md` |

A fact that belongs in two of these belongs in one of them with a link from the
other. Two copies disagree within a month.

## The four commands that say where things stand

```bash
git log --oneline origin/main..HEAD    # what is committed and unpushed
git status --short                     # a dirty tree means the last item did not finish
python -m pytest tests -q              # 557 tests, system Python, no venv
cd billgen-audit && python -m billgen_audit sync-architecture --check
```

## The rest of the toolchain

```bash
.venv/Scripts/ruff.exe check .   # ruff lives ONLY in .venv; CI runs `ruff check .`
python -m uv lock                # `uv` is not on PATH — always `python -m uv`
npm test                         # frontend suites, all workspaces
npm run typecheck                # all four workspaces
cd billgen-audit && python -m billgen_audit run --open   # or the /audit command
```

The tree is deliberately **not** `ruff format` clean. Do not reformat it as a
side errand — CI only runs `ruff check`.

## Boundaries — Henri's, and a session does not cross them alone

- **Never `git push`.** Commits pile up on `main` for him to read; publishing
  them is one command, and it is his.
- **No new screens.** UI comes from Henri's drawings. The alerts panel and the
  quotes section are backend-complete and still may not be built.
- **The TVA and Template Studio scaffolds stay unwired**, pending a pass over
  the builder with him.
- **Nothing that needs a third party** — email, Peppol transport, checkout,
  blob storage. No amount of local work unblocks those.
- **Nothing on his accounts** — Vercel env vars, `billgen.be` DNS,
  `contact@billgen.be`.
- **No native reads of the Dutch or Portuguese copy.** This is a compliance
  product; the copy is the credibility.

The reasoning for each is in `docs/SOLO_RUN.md` § Boundaries.

## Files not to read

Each is generated, large, and answers questions faster by `grep` than by eye.

| File | What it costs | Ask it differently |
|---|---|---|
| `frontend-react/src/types/api.d.ts` | 224 KB of generated types | `grep` for the schema name |
| `frontend-react/openapi.json` | generated from the routers | read the router in `api/routers/` |
| `billgen-audit/audits/` | past report runs | re-run `/audit` |
| `docs/ARCHITECTURE/system-architecture.html` | 320 KB, mostly CSS and JS | `system-architecture.html.txt` beside it, one section at a time |

The `.txt` is a rendering, never a source: change the HTML, then regenerate with
`sync-architecture` and `scripts/architecture_to_text.py`.
