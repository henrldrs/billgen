# Solo run — the resumable ledger

**This file is the first thing to read when a session starts with no memory of
the last one.** It exists because a session can end mid-task — a usage limit, a
closed laptop, a crash — and the work has to survive that without Henri
re-explaining anything.

The permanent map is [HANDOFF.md](../HANDOFF.md). The handover note is
[NEXT_SESSION.md](NEXT_SESSION.md). This is neither: it is the **live state of
one continuing run**, updated as items are finished rather than rewritten at
the end.

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
git log --oneline origin/audit-engine-and-scaffolds..HEAD
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
4. **Do not push.** See § Boundaries. Ten commits are waiting for Henri; adding
   to that pile is correct, publishing it is not.

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

**The queue is empty.** Items 6–8 were the three that NEXT_SESSION §SELF sanctions explicitly: *"None of
these invents a screen; each connects a control that is already drawn."* That
sanction is what makes them safe to do without Henri, and it does **not** extend
to anything else in §5b.

### Health, as of the last run

| | |
|---|---|
| Python | **553 collected, exit 0** |
| Frontend | **175 passed** (`npm run test`, 29 files), typecheck clean across all four workspaces |
| `ruff check` | clean. CI runs `ruff check .` only — the tree is *not* `ruff format` clean and was not before, so do not reformat it as a side errand |
| Architecture doc | **stale** — four commits landed after the last sync (`sync-architecture --check` will say so) |
| ROADMAP_IA | regenerated 2026-09-04 from `ia.ts`: 115 areas, 34 wired, 30% |
| Unpushed | everything on `audit-engine-and-scaffolds` since `2e15e79` — count it with the first command in the resume protocol rather than trusting a number here, which is stale the moment the next commit lands |

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
- **`docs/billgen.bat`** is still an untracked accidental copy of the root
  launcher. Deleting a file is not something to do unasked; it is one `rm` when
  he says so.

---

## Log

Append one block per run. Newest last.

### 2026-09-03 — solo run

Started from NEXT_SESSION §SELF. Items 1–4 of that list are closed, plus one
that was not on it and one Henri added mid-session.

- **Item 1 was already done.** The dev database was at head. The previous note
  assumed otherwise; it cost one command to find out.
- **Item 2 was mostly already done, and could not be proven before.** The rename
  had landed in the models *and* the migrations, but the evidence was a
  hand-compiled DDL snippet quoted in a note. It is now a test that compiles all
  21 tables under the postgres dialect on every run — which matters precisely
  because development and the fast CI leg are SQLite, and SQLite accepts the bug.
- **The suite was not green when this run started.** `test_every_write_endpoint_
  declares_a_permission` was failing, and for the worse of the two possible
  reasons: not "an endpoint is unguarded" but "the walk found no endpoints at
  all". Fixed, and pinned so it cannot recur quietly. With the walk restored the
  invariant holds — every write endpoint declares a permission, and the ten
  exemptions are still exactly the ten argued for in the list above them.
- **The architecture report needed less than the note feared.** Its generated
  blocks were already current; only file counts had drifted.
- **Henri asked mid-session for billgen.be's colours and background in the
  app.** Brought in as additive tokens, with the canonical-green question
  written down rather than answered.

- **Queue item 6 landed, and the browser caught what the tests did not.** The
  palette wiring typechecked and the suite went green with it — and the app
  crashed on first load with "rendered more hooks than during the previous
  render", because `useSearch` had been placed below `if (isLoading) return`.
  This file already carried that exact lesson four lines further down in
  AppShell, written by whoever hit it the first time. Two conclusions worth
  keeping: a hook added to a component with early returns goes at the top by
  default, and a UI change is not verified until it has been loaded.

- **Queue item 7 needed a backend change to be honest.** The report endpoint
  only understood a named `period`, while the screen filters its rows by
  `paid_from`/`paid_to` — so the only total it could have printed was of the
  quarter *around* the fortnight on screen. It now takes the same window the
  list takes, and refuses a period beside one rather than picking a winner
  silently. `openapi.json` and `api.d.ts` were regenerated with it.

- **Queue item 8 was the one with legal consequences.** Every invoice line
  shipped `category: "S"`, so an invoice to an EU business with a VAT number
  charged them 21% Belgian VAT they do not owe and carried no Article 51 §2
  mention. The composer now defaults the category from the server and moves the
  rate with it — a reverse-charged line taxed at 21% is a contradictory
  document — and shows the mention, because a silent zero-rating is a legal
  claim the person composing it should be able to see. Rates the user chose
  deliberately are left alone.

### Henri's session, 2026-09-03 (evening)

Answered in his own words, so the reasoning survives:

- **Invoice lines come from the catalog** (`1aef1c7`). Two defects there were
  invisible to a green suite and obvious on load — a price rendered as
  `850.000000` and a duplicate `21.00%` rate option. Both were decimals arriving
  in a different spelling than the UI compares against; there is now one
  `servedSpelling` helper because three endpoints serialise the same rates three
  ways.
- **The AI Studio reference keeps its archive** (`fda6f97`), not two copies.
- **The two palettes became the two themes** (`b2a21c3`). Dark mode is the
  site's sapphire field, light mode is its paper, the € motif and the frosted
  card are in `@henrioutai/ui`, and `/_preview` → *Palette + grounds* is where
  to look at all of it.
- **[SHELL_UI_PROPOSAL.md](SHELL_UI_PROPOSAL.md)** — five proposals for
  reorganising the shell around the new vocabulary. Not built; it needs his eye,
  and item 4 needs a drawing.

*Watch item:* `InvoiceDetailPanel.test.tsx` "renders the header, the lines and
the frozen totals" failed once under parallel load at 1947ms and passes alone at
642ms. It is a timing flake, not a regression — but if it recurs, that test is
waiting on a client-name lookup and should be given an explicit `findBy` rather
than a longer timeout.

### Henri at the keyboard, 2026-09-03 (late)

He was watching this time, which changed the shape of the work: two of these
were corrections to something he had just seen on screen.

- **The top bar floats** (`e38e7c6`), and the theme toggle sits beside the
  language one. Two corrections inside ten minutes: the bar was opaque white on
  warm paper (a rounded version of the bar he disliked), and `overflow: hidden`
  clipped every nav popup to it. The second was a repeat of a mistake this
  codebase had already made and written down one level lower.
- **A catalog item can be created from the invoice** — the overlay, seeded from
  whatever is already typed on the line.
- **Paper warmed to `--brand-logo-paper`** rather than `#ffffff`: the washes are
  local, so on a pure white base everything between them stayed white and the
  ground read cool next to the beige it is meant to be.
- **The flaky test was not flaky.** `InvoiceDetailPanel` makes two sequential
  round trips against Testing Library's 1000ms default; the budget is now 5s
  globally, in `src/test/setup.ts`, with the reasoning next to it.

### Queued for the next session — the architectural points

Henri, leaving 2026-09-03: *"continue architectural points."* These come from
[SHELL_UI_PROPOSAL.md](SHELL_UI_PROPOSAL.md), reordered by what is now unblocked.

| # | Item | Why it is ready |
|---|---|---|
| 9 | **Desktop shell parity — one line** | `frontend-electron/src/DesktopShell.tsx` already imports the same `AppShell` and `TopNav`, so it picked up the € texture for free but still renders the old solid bar. It needs `variant="floating"` and the `ThemeSwitcher`, exactly as `frontend-saas/src/pages/AppShell.tsx` has them. Start here: it is the cheapest item on the list and it stops the two shells diverging. |
| 10 | **Measure vs full width** (proposal §2) | Record and form screens take a reading measure; list and report screens stay full width. `ia.ts` already knows which kind each node is, so this is one class with two variants chosen per route rather than per component. Touches every route — do it in one pass. |
| 11 | **Frosted cards for overlays only** (proposal §5) | `Card frosted` exists and nothing uses it. The ⌘K palette, modals and the record drawer are the surfaces where the blur does real work; on a list it is an expensive way to make text harder to read. |
| 12 | **The deep field as a light-mode zone** (proposal §4) | **Blocked on a drawing.** It could read as premium or as a marketing page bolted onto an invoicing tool, and it is a visual-language commitment rather than a token change. |

### Answered while he was here

- **Desktop is already wired and reuses everything.** `frontend-electron` is
  two files and 344 lines (`App.tsx` + `DesktopShell.tsx`); the 24 panels, 76
  design-system components, API client, hooks and types all come from the
  shared packages. Nothing there was built from scratch and nothing needs to be.
- **Mobile does not exist, and the answer depends on the choice.** A responsive
  web build or PWA reuses everything, the same way desktop does — a third shell
  of a few hundred lines. React Native reuses the portable half (5 lib files, 2
  hooks, 2 types, 3 providers — the API client, formatting, translations and
  every query) but **not** the 76 design-system components, which are DOM and
  CSS. The business logic ports either way; only the view layer forks.

**Nothing else is queued.** The three sanctioned wirings are done, and what remains
in NEXT_SESSION §5b — the alerts panel and the quotes section — are new screens
that rule 2 puts on Henri's side. A next unattended session should not invent
work from §5b; the honest options are the two report screens that now have
endpoints (`/reports/clients`, `/reports/products`, same shape as item 7), or
nothing.

*Left in the desktop dev database:* a client **Van Dijk Holding BV** (NL, VAT
number), created to verify item 8. That database is disposable and rebuilds
itself; the client is worth keeping, because reverse charge cannot be looked at
without a non-Belgian business on file.

### Henri at the keyboard, 2026-09-04

Two streams ran in this one working tree at the same time — an L4 trust session
and this one — which is worth recording as a working condition rather than as an
incident. It went fine, and the thing that made it fine was that neither stream
touched the other's files except three: `api/main.py`, `openapi.json` and
`api.d.ts`. Those three were enough to make a clean commit impossible without
splitting them by hand. **If it happens again, agree who owns `api/main.py`
first** — it is the file every backend feature has to touch, and it is the only
real contention point in this repo.

Four commits, in dependency order, `550188a`..`ac1e319`.

- **A decoration re-levelled every overlay in the application.** Henri saw a nav
  popup behind the dashboard cards; the cause was `3c938e2` giving the content
  column a `z-index`, which trapped the drawer, the modals and the palette
  inside a layer of 1 while the nav sat at 40. The menu was the only symptom
  anybody noticed. Fixed by putting the texture in a negative band under an
  `isolation: isolate` shell, so nothing else needs a `z-index` at all.
  **The rule: a decorative layer goes below the content, never above it by
  lifting the content.** Lifting the content re-levels every overlay at once.

- **The invoice record became a document.** His call, and the right one — the
  drawer showed a three-line summary of an invoice in a column narrower than the
  invoice's own table. It is now a centred sheet of paper with the real line
  table. Two traps on the way, both of the same family as the ones already
  written down here: `bg-doc__*` was a namespace the Template Studio already
  owned, and two unnamed tables broke three tests, which is an accessibility bug
  arriving as a test failure.

- **`issue()` grew a legal gate.** The load-bearing irreversible transition had
  never checked whether the document it was freezing was a lawful VAT invoice.
  It does now, before the number is allocated, refusing blockers and reporting
  advisories. **Five existing tests broke and every one was right to** — the
  fixtures had been building documents Belgian law forbids, because nothing had
  ever looked. That is the same lesson as §17b: a green suite proved the code
  ran, not that what it produced was correct.

- **L4 turned five undecided questions into tested registries**, and found a
  live bug doing it: `session.revoke` was written to the audit log as a string
  the `AuditAction` enum did not list, so one revocation made `GET /activity`
  return 422 for that organization permanently. Found against a running server.

*Open, and Henri's:* the architecture doc needs regenerating (four commits
stale); `template_snapshot` is a **dead column** — it exists on the invoices
table and in `db/models/invoice.py` and nothing reads or writes it, which is
what blocks the record sheet from rendering the template the client actually
received; and `docs/billgen.bat` is still an untracked accidental copy.


### Five reference documents folded in, 2026-09-04

Henri dropped five files in `business model/themed/` and asked for their
concerns to be absorbed into the architecture rather than copied into the repo.
Four are distinct (`ai-act-blueprint.md` and `blueprint.md` are byte-identical).
None was committed; all three findings below came from checking their claims
against the code rather than from believing them.

**The one that matters: a compliance date in the code was wrong, and wrong in
the unsafe direction.** `core/trust/ai_transparency.py` planned against
2026-12-02 and carried a comment asking for that date to be verified against the
published text. It was verified, and 2 December is the end of a *watermarking
grace period for systems already on the market* when Art. 50 became applicable
on 2 August 2026. BillGen was not on the market then, so it never had a grace
period. The module believed it had three months of runway; it had none, and had
been in breach for a month. The constant is now derived from three named facts —
`TRANSPARENCY_APPLICABLE_FROM`, `WATERMARK_GRACE_END`,
`PLACED_ON_MARKET_BEFORE_OBLIGATION` — so the reasoning sits next to the number
and the December date is kept visible as *the thing it is not*.
**The lesson: a constant with a "confirm this" comment is a bug with a timer on
it.** That comment was correct, honest, and load-bearing, and it still sat there
for weeks. If a value is flagged unverified, verifying it is the work — the flag
is not the mitigation.

`template_snapshot` was independently re-found and is now written down as
[ADR-0006](ARCHITECTURE/ADR-0006-invoice-conformity-layers.md) rather than as a
line in this log, together with the P0–P3 conformity ordering it belongs to. P0
is built (`invoice_compliance.py`), **P1 is built but fires at XML export rather
than at issue** — so a PDF-only customer is never Peppol-checked at all — and
P2 (PDF ↔ domain ↔ UBL ↔ database consistency) does not exist.

`docs/MINIMAL_STACK.md` went from 13 layers to **37 items in nine sections**,
each with BillGen's status and a path as evidence. The 24 additions are the
ones a diagram does not show and an incident does: schema lifecycle, async work,
secrets, dependency provenance, correlation IDs, alerting, security logging,
runbooks, model pinning, evaluation, AI transparency. Three came out worse than
expected — **no job queue at all** (and both email and Peppol transmission need
one), **no correlation ID** (two log lines from one request cannot be tied
together), **no Article 4 AI inventory** (live since 2 Aug 2026, applies at
every risk tier, hours of work, and its absence is an aggravating factor in any
*other* enforcement action). Two came out better: `api/config.py`'s
`validate_for_boot` and the `security_events.unrecorded()` blind-spot reporting
are both stronger than the old 13-layer table gave them credit for.

*Deliberately not adopted:* `schema.sql` is a pgvector RAG corpus for a
henriOutAI product — it does not belong in an invoicing database, and the ADR
says so and takes only the forty-line `registry.*` shape from it. The Belgian
blueprint's seven research agents are likewise a separate product; if built,
they open a pull request against `core/rules/` for a human to accept, never a
runtime dependency of the issuing path. **The blueprint's own golden rule is the
argument**: a research system must not silently rewrite production legal rules,
and those rules are what an accountant signs off on.

*Open, and Henri's:* the three ADR-0006 work items in order (wire the snapshot
at issue, move P1 to issue time, then build P2); the Art. 4 inventory; and
whether the marketing readiness quiz stays rule-based — it is cheaper to keep it
rule-based than to disclose it.

### The queue arrives, and two security holes close, 2026-09-04 (late)

Henri's question was the right one: *why re-check state every session instead
of leaving a list?* So [TICKETS.md](TICKETS.md) now exists, the resume protocol
points at it, and the architecture document points at it too — with the reason
they are separate files written down, because it is the thing that will be
argued about later. **A state document that also holds a to-do list stops being
trustworthy as either.** The architecture says what is true; the queue says
what to do about it. Eighteen open tickets, in priority order, each naming its
files and the assertion that closes it.

The rule that matters in that file: **no ticket without a `done when`, written
before the work starts.** A ticket you cannot verify is a wish.

Two holes found by reading `api/security/` and `api/middleware/` rather than
the docs, and both closed the same session:

- **SEC-19, the login timing oracle.** The reply shape was already identical
  for an unknown address and a wrong password — someone had thought about
  enumeration. The *timing* was not: `verify_password` ran only when a user row
  was found, so an unknown address answered in about a millisecond and a known
  one took the full Argon2id verify. Measured after the fix: **115.5 ms against
  123.5 ms, 1.07×.** Before it, roughly a thousandfold. That endpoint was
  answering "is this person a BillGen customer" to anyone who asked in a loop —
  a disclosure about *the customer's* business, not ours. The test asserts the
  deliberate spend rather than the wall clock, because a timing assertion on a
  shared CI runner is a flake generator.
- **SEC-20, the untiered rate limit.** One global per-IP budget rated
  `/auth/login` exactly like scrolling invoices — 172,800 guesses a day from one
  address at 120/min. Auth paths now draw on a separate small bucket, checked
  *before* the request so a caller over the limit never reaches the hasher, and
  charged **on failure only**. The second half is the one worth remembering:
  a limiter that counted successes would throttle a paying customer out of
  their own account, so there is a test for exactly that.

Both fixes are half-measures in the same specific way, and the file says so:
per-account lockout needs a record of failed sign-ins that nothing writes
(T-12). An IP bucket does not stop one guess per account across many addresses.

*What did not change:* the good news from the same audit, recorded because it
is evidence rather than reassurance — **Argon2id**, not bcrypt; JWT decode pins
`algorithms=[HS256]`, closing algorithm confusion; CORS defaults to a named
origin with an explicit guard against `*`; and zero raw SQL, so injection is
closed by the shape of the code rather than by anyone remembering to escape.
