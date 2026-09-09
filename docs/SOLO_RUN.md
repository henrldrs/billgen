# Solo run — the resumable ledger

**This file is the first thing to read when a session starts with no memory of
the last one.** It exists because a session can end mid-task — a usage limit, a
closed laptop, a crash — and the work has to survive that without Henri
re-explaining anything.

The mechanics — how to run it, how a request flows, what has already bitten —
are in [HANDBOOK.md](HANDBOOK.md); the map of which file holds which kind of
fact is [CLAUDE.md](../CLAUDE.md). This is neither: it is the **live state of
one continuing run**, updated as items are finished rather than rewritten at
the end.

The **business** half of the launch — registration, contracts, hosting the beta
for a real client — is not in this queue. It lives in
[BETA_LAUNCH_PLAN.md](BETA_LAUNCH_PLAN.md), because an empty code queue and a
blocked launch are two different states and conflating them hides the second.

---

## Resume protocol — do this first, every time

**Then open [TICKETS.md](TICKETS.md) and take the top open ticket.** That file
exists so a session does not spend its first half re-deriving what the last one
already knew. Each ticket names its files, what it blocks, and the assertion
that closes it. The architecture document is what you check work *against*;
the queue is what you take work *from*. Do not start an unqueued task without
saying why.

Nothing here depends on remembering a conversation. Four commands tell you
exactly where the last session stopped:

```bash
git log --oneline origin/main..HEAD
```

```bash
git status --short
```

```bash
python -m pytest tests -q
```

```bash
cd billgen-audit && python -m billgen_audit sync-architecture --check
```

Then read **§ Queue** below and start at the first item marked `QUEUED`.

**The rules that make this work:**

1. **Commit after every finished item.** The commit is the durable record; this
   file is only the index. A clean tree plus a green suite means the last item
   completed. A dirty tree means it did not, and the diff is where you were.
2. **Never leave the tree dirty across a stop.** If an item cannot be finished,
   either commit it with a `wip:` subject and say so in § Queue, or revert it.
   A half-edit with no note is the one state this protocol cannot recover from.
3. **Update § Queue in the same commit as the work.** A ledger that lags the
   tree is worse than no ledger, because it is believed.
4. **Do not push.** See § Boundaries. Commits are waiting for Henri; adding to
   that pile is correct, publishing it is not.

---

## Queue

Ordered. `DONE` items stay listed with their commit so a cold session can tell
"already done" from "never started" without reading the diff. A row that ships
*in* the same commit as this file cites that commit's subject instead of a hash,
which it cannot know.

| # | Item | State | Evidence |
|---|---|---|---|
| 1 | Migrate the day-to-day dev database | `DONE` | Already at head `a40b35409ffe`; nothing to apply. The previous note assumed it was behind. |
| 2 | Settle §3, the duplicate constraint name | `DONE` | `b5ebe4e`. Models and migrations were already renamed; verified by compiling all 21 tables under the postgres dialect. Guard test added — the suite runs on SQLite, which accepts the bug. |
| 3 | The authz guard had stopped seeing the routes | `DONE` | `b5ebe4e`. Not on the original list — found by running the suite. See § What changed underneath us. |
| 4 | Regenerate the architecture report | `DONE` | `14bcd89`. In sync. Only file counts moved; the engine and the route walk agree on 92 endpoints / 23 routers. |
| 5 | The mark's palette and the site's grounds, as tokens | `DONE` | `bcc3401`. Henri's ask mid-session. Additive only — no existing token changed value. |
| 6 | ⌘K palette → `GET /search` | `DONE` | Ships in *feat: the palette searches the database*. Verified in the running app, not only under test: typing `Corp` returns the client and lands on Client 360; typing `OUT-BC06` returns the invoice and lands on its detail. |
| 7 | A total on the payments report → `GET /reports/payments` | `DONE` | Ships in *feat: the payments screen prints the server's total*. The endpoint grew `paid_from`/`paid_to` so the headline totals the same window the rows are filtered by. Verified in the app: narrowing the window moved both to € 0,00 together. |
| 8 | The composer's VAT category default → `GET /vat-treatment` | `DONE` | Ships in *feat: the composer stops charging Belgian VAT to everyone*. Verified in the app against a real Dutch client: category `AE`, rate 0%, Article 51 §2 mention shown; switching back to a Belgian client restores 21% and drops the notice. |

| 9 | T-24 · Phase 0 hygiene | `DONE` | `19cfb5d`…`12ce164`, eight commits. Closed in [TICKETS.md](TICKETS.md) § Done with what moved where. Henri scheduled it on 2026-09-09 and its `do` list sanctioned the deletions. |

**The queue is empty.** Items 6–8 were the three the handover note sanctioned
explicitly: *"None of these invents a screen; each connects a control that is
already drawn."* That sanction is what makes them safe to do without Henri, and
it extends to nothing else — see § Boundaries. Item 9 came from
[TICKETS.md](TICKETS.md), which is where the next one comes from too.

### Health, as of the last run

| | |
|---|---|
| Python | **557 collected, exit 0** |
| Frontend | **175 passed** (`npm run test`, 29 files), typecheck clean across all four workspaces |
| `ruff check` | clean. CI runs `ruff check .` only — the tree is *not* `ruff format` clean and was not before, so do not reformat it as a side errand |
| Architecture doc | **in sync** as of `12ce164` — both `sync-architecture --check` and `architecture_to_text.py --check` green |
| ROADMAP_IA | regenerated 2026-09-04 from `ia.ts`: 115 areas, 34 wired, 30% |
| Unpushed | everything on `main` after `origin/main` — count it with the first command in the resume protocol rather than trusting a number here, which is stale the moment the next commit lands. Three trees became one on 2026-09-09: the worktree and its branch were removed, the remote-only docs commit `fde1edc` was folded in as `a5b3948`, and `main` fast-forwarded to the former `audit-engine-and-scaffolds` head |

---

## What changed underneath us

Worth knowing before trusting anything: **the dependency floor moved.** This
machine now runs Python 3.14.4, FastAPI 0.139.1 and **Starlette 1.0.0**, and one
of those broke a guard quietly enough to be worth writing down.

FastAPI 0.139 stopped copying an included router's routes up into `app.routes`;
each `include_router` is now a private `_IncludedRouter` wrapper, and the real
routes hang off its `original_router`. Anything walking `app.routes` sees 4
routes instead of 92.

The lesson generalises past that one test: **a guard that inspects a collection
must also assert the collection is non-empty**, or one day it passes by finding
nothing. Three tests here now do that deliberately — the route walk, the
Postgres DDL check, and the palette scanner's "the source tree is actually being
scanned". Copy the pattern.

---

## Boundaries — not to be done alone

These are not "hard", they are **Henri's**. Doing them unattended produces work
he has to undo.

- **`git push`.** It publishes work he has not read and runs CI. One command,
  his to run.
- **New screens.** The alerts panel and the quotes section are backend-complete
  and still may not be built: UI comes from Henri's drawings, and there are none
  for either.
- **Wiring the TVA and Template Studio scaffolds.** Explicitly on hold pending a
  pass over the builder *with* him. A session that helpfully mounts them has
  done the wrong thing.
- **Anything needing a third party** — email, Peppol transport, checkout, blob
  storage. No amount of local work unblocks these.
- **Vercel env vars, the `billgen.be` DNS records, `contact@billgen.be`.** His
  accounts, his credentials.
- **Native reads of the Dutch and Portuguese copy.** This is a compliance
  product; the copy is the credibility.

### Open decisions parked for him

- **Which green is canonical.** `#10B981` (the app's accent, guard-pinned)
  versus `#529984` (what the logo actually is). Both are now in the token layer
  and documented in [BRAND_TOKENS.md](BRAND_TOKENS.md); the accent was
  deliberately *not* repointed. Changing it is a doc change plus a test change,
  which is the point — it cannot happen by stylesheet edit.
- ~~`files_docs` reads 120 against prose saying "down from 356"~~ — **closed
  by deleting the unzipped AI Studio folder.** The count is 29 again and the
  sentence describes it. Worth noting how it resolved: the number was never
  wrong, the tree was, and re-measuring after a real change fixed a
  documentation problem that a rewording would only have papered over.
- ~~**`docs/billgen.bat`**, an untracked accidental copy of the root
  launcher~~ — **gone.** It is no longer on disk.

**Product decisions, carried out of the handover note before it was folded
away.** Three of them are cited from source comments, which is why they cannot
just be dropped:

- **Approve or redraw the §11b nav cut** for the remaining ten sections. One
  reading, then a session of route work — ~100 entries down to ~45.
- **Tier naming final?** `free / starter / business / business_pro`.
- **The Business Pro shell is decided in principle and unbuilt.** It needs a
  design: seats, per-entity usage, consolidated reporting, member management.
  Cited from `api/entitlements/matrix.py`.
- **Seats are declared and unenforced.** `Meter.SEATS` is metered and visible;
  nothing consumes it, and there is no invite flow without email (T-01). Role
  enforcement exists, but nothing can create a second user, so every
  organization is one owner and the matrix is correct but unexercised.
- **Graded features are presentation only.** `vat_report`, `dashboard`,
  `search`, `pdf_customization`, `import_legacy` and `accountant_export` are
  read by the UI and refused by **no endpoint** — calling `GET /reports/vat` or
  `GET /search` directly returns the full thing on Free. `search` was left
  ungated deliberately, not by oversight; the note is in `api/routers/search.py`.
- **Are quotes metered?** Shipped unmetered: `Meter.INVOICES` counts invoices,
  and billing someone for offers they did not win is a pricing decision, not a
  default. An allowance is one line in the matrix plus the create route. Cited
  from `api/routers/quotes.py`.
- **A quote PDF template** — the only entry left in `sales.quotes.missing`. It
  is wording (what a Belgian offer must say, in fr/nl/en), not code.
- **Downgrade and lapsed subscriptions.** The code behaviour is settled and
  tested; the legal treatment — retention after cancellation — belongs in the
  DPA before a cancellation flow is built.

---

## Parked — queued work that is not a ticket yet

Henri, leaving 2026-09-03: *"continue architectural points."* These come from
[SHELL_UI_PROPOSAL.md](SHELL_UI_PROPOSAL.md), reordered by what is unblocked.
Item 9 is now [TICKETS.md](TICKETS.md) T-19 step 1; the rest are here because
they have no `done when` yet, and the queue is not for wishes.

| # | Item | Why it is ready |
|---|---|---|
| 10 | **Measure vs full width** (proposal §2) | Record and form screens take a reading measure; list and report screens stay full width. `ia.ts` already knows which kind each node is, so this is one class with two variants chosen per route rather than per component. Touches every route — do it in one pass. |
| 11 | **Frosted cards for overlays only** (proposal §5) | `Card frosted` exists and nothing uses it. The ⌘K palette, modals and the record drawer are where the blur does real work; on a list it is an expensive way to make text harder to read. |
| 12 | **The deep field as a light-mode zone** (proposal §4) | **Blocked on a drawing.** It could read as premium or as a marketing page bolted onto an invoicing tool, and it is a visual-language commitment rather than a token change. |

*Left in the desktop dev database:* a client **Van Dijk Holding BV** (NL, VAT
number), created to verify queue item 8. That database is disposable and
rebuilds itself; the client is worth keeping, because reverse charge cannot be
looked at without a non-Belgian business on file.

---

*The per-run log that used to close this file was cut in T-24. `git log` is the
narrative of what happened; this file is the state of what is true now, and a
ledger that carries both grows past the point where anyone reads either.*
