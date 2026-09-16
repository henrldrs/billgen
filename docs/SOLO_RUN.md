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
| 10 | T-25 · the data directory leaves the package container | `IN PROGRESS` | `6c6a1a2`. `desktop/paths.py` resolves in four steps and moves a legacy install once; six tests. The other half — install a package, uninstall it, find the database still there — cannot be asserted until T-30 builds one. |
| 11 | T-26 · goods or services | `DONE` | `8fb7064`. Article 39bis was unreachable: every intra-EU B2B sale came back reverse-charged because nothing said what kind of supply it was. Owed: the accountant confirms the mapping (BETA_LAUNCH_PLAN §W1, question 5). |
| 12 | T-32 · the partner tier | `DONE` | `1ebb784`. Beta testers get Business capability with one company, granted rather than sold, and kept off `TIER_ORDER` so no paying customer is ever told to upgrade to a plan with no price. |
| 13 | T-19 · one shell | `DONE` | `a8fc530`, `5cdcc54`. The desktop's 284-line second shell is a 35-line adapter over the shared `ProductShell`, and the Tauri build now reaches the template studio and every report screen it never had. Browser-verified on both surfaces. |
| 14 | T-19 follow-up · the beta surface and the language | `DONE` | `f105a36`. A handed-over build offers only `wired` nodes — 29, not 124 — and the interface language stopped following the company's *document* language. Both were Henri's catch on the first look at the shell. Narrowed again to `MVP_SURFACE` on his instruction: §MVP's list is enforced now, not described. |
| 15 | T-20 · the sidecar brings its own Python | `IN PROGRESS` | `a16d389`. 61 MB embeddable runtime, built from `uv.lock`; boots and answers with no Python on PATH; `check_sidecar_runtime.py` 19/19. The VM and `tauri build` are Henri's to run. |
| 16 | T-21 · PDFs through the installed Edge | `DONE` | Ships in *feat: PDFs print through the installed Edge*. Edge's own command line, on Henri's instruction, rather than the ticket's `channel="msedge"`: the desktop needs neither Playwright's 150 MB download nor its 110 MB package. `test_real_pdf_bytes` green with Playwright's browsers hidden; the two launchers agree on every glyph's coordinates; the rebuilt runtime renders with no Playwright in it. |
| 17 | T-22 · Emilia's license file | `DONE` | Ships in *feat: the packaged build refuses to start unlicensed*. The two halves that were zero: `bootstrap` never called `check_license`, and the signed `hardware_id` was never compared to anything. Rehearsed end to end against a scratch key pair — strict mode refuses with no licence and refuses one signed for another machine, naming both fingerprints, and starts with the right one. **The signing key is Henri's to generate** (`scripts/license_tool.py keygen`); until he does, no packaged build starts, which is the correct state for a repo that has never held one. [docs/LICENSING.md](LICENSING.md) is the reissue path. |
| 18 | T-27 · the documents leave the database | `DONE` | Ships in *feat: an issued invoice leaves a file behind*. Issuing writes `<DOCUMENT_ROOT>/invoices/<year>/<ref>.pdf` and registers path, hash and size; the folder is written and never read back, so deleting a file changes no endpoint's answer. Backup schema 3 carries the register, and a restore names what is missing instead of failing. 16 new tests. |
| 19 | T-23 · backup on close | `IN PROGRESS` | Ships in *feat: the sidecar backs the database up without being asked*. `desktop/backups.py` writes `<data dir>/backups/<date>.zip` and keeps thirty. Not on close alone: the shell `child.kill()`s the sidecar, so a close-only backup would never have run on her machine — it runs on start (always) and on a clean exit (overwriting today's). 12 tests, including a real restore of a sidecar-written archive through the API. The remaining half is the note in [RESTORE_LOG.md](RESTORE_LOG.md), which needs her laptop. |
| 20 | T-28 · a backup that can be carried | `DONE` | Ships in *feat: one file she can take off the laptop*. `core/backup/sealed.py`: AES-256-GCM over a zip of the same ADR-0003 JSON plus the T-27 document bytes, scrypt-derived, with a readable header bound as AAD so editing it breaks the tag. Wrong passphrase is a distinct 409 that leaves the organization empty — decryption runs before anything touches the database. Two deliberate deviations (POST, not a passphrase in a URL) and the UI half left to T-29, replaced by an API that refuses to write an unrecoverable file until the caller acknowledges it. 24 tests. |
| 21 | T-30 · the shipped package | `IN PROGRESS` | Ships in *feat: the installer carries bytecode, notices and no source*. 62.4 MB against a 120 MB budget; 0 `.py` in the build output; 57 packages named with their licences. Three of the ticket's instructions were wrong and are written up in it — the stdlib was already trimmed, comment-stripping is subsumed by shipping no source, and bytecode *costs* 1.2 MB. **MSIX is not a Tauri bundle target**, so `nsis` stays. `check_sidecar_runtime.py` is 25/25 and now migrates a database for real inside the runtime. What is left is Henri pressing `tauri build` and installing it on a clean VM. |
| 22 | T-33 · two tenants, one document path | `DONE` | Ships in *fix: each organization gets its own document folder on a host*. Measured collision — two organizations, one file — closed by `DOCUMENT_LAYOUT=per-organization` scoping the archive to the bound tenant; the desktop sets `flat`. Registered paths carry no segment, so backups move between layouts. 2 tests. |
| 23 | T-34 · Mother's upgrade | `BLOCKED` | Queued at the top on Henri's priority (2026-09-11). The old app's export carries her invoices and the importer counts them and imports none. **Needs one real export from her FinanceFlow BillGen** before the mapping can be written — the only legacy invoice in the tree is a three-field stub. |
| 24 | Client 360 on the beta surface | `DONE` | Ships in *fix: scaffold blocks stay off a handed-over build, and the totals are the server's*. Henri's screenshot showed three scaffold banners on a shipped screen. Totals wired to the `GET /clients/{id}/stats` that already existed; `ScaffoldBlock` renders nothing under `exposure="mvp"`. GDPR's server is T-35; tags no longer ship. 196 frontend tests. |
| 25 | T-29 · the guided first run, backend half | `IN PROGRESS` | Ships in *feat: the first run has a ledger*. `GET /onboarding` derives the state; acceptances are per user per version and written as `contract` Documents into her data folder; `POST /onboarding/complete` refuses while the company fails validation or a required text is unaccepted. The legal registry is entirely undrafted, so the acceptance step gates on nothing until Henri supplies texts — the mechanism is real, the texts are his. Wizard, first-run gate and Settings → Data & privacy are next. 7 tests. |
| 26 | T-29 · the guided first run, the wizard | `IN PROGRESS` | Ships in *feat: the guided first run*. Five steps on the Stepper, state re-read from `GET /onboarding` after every act, `FirstRunGate` in both shells, migration `a7c41e9d5f02` stamps organizations that already had a company. Left: toggles, logo, Data & privacy, data-directory choice — and Henri's texts, without which the legal step gates on nothing. 5 tests; 201 frontend. |
| 27 | T-35 · the GDPR panel gets its server | `DONE` | Ships in *feat: a client is a data subject*. Export, erasure that stops where the invoice starts (name, VAT, address, contact person stay; email, phone, notes go; the invoice JSON, the re-rendered PDF and the archived file asserted byte-identical), and consent records kept append-only. The last scaffold on Client 360 is gone. 5 tests; 202 frontend. |
| 28 | T-29 · the first run asks who is accepting | `IN PROGRESS` | Ships in *feat: the first run asks who is accepting*. The desktop bootstrap mints "Local user" for "My Business", so an accepted contract named nobody. A profile step asks for both and the server refuses to finish while either is a placeholder; the e-mail is left alone because it is the bootstrap's lookup key. Compliance check the same day filed T-36 and T-37 and added two conditions to T-34. |
| 29 | The download hub | `DONE` (his to press) | Ships in *feat: the installer has somewhere to come from*. Two repos — source stays private, `billgen-desktop` public carries Releases only. `release.yml` builds on `windows-latest`, **which is the clean VM T-20 and T-30 are open on**, verifies with `check_sidecar_runtime.py`, and opens a draft release only on a tag Henri pushes. Setup is four steps in [DISTRIBUTION.md](DISTRIBUTION.md); T-38 filed for the signing certificate. |
| 31 | The desktop signs in | `DONE` | Ships in *feat: the desktop signs in, and the tour follows the first run*. Until now the window went from a spinner into the dashboard and never said whose copy it was. `DesktopSignIn` (shared package, testable without Tauri) on a new `AuthPage` frame the web login and signup now use too: the account it opens as, the business, the plan, the data folder, one button, an "open automatically next time" switch, and language + theme under the card. Sign out in the account menu returns to it — the tokens were only ever in memory. 5 tests. Browser-verified on the 8010/1421 pair. |
| 32 | The guided tour (onboarding spec, step 5) | `DONE` | Same commit. `GuidedTour` in the design system — a spotlight cut from a dimmed backdrop by one box-shadow, a coach card, keyboard driven, degrades to a centered card when an anchor is missing. Six stops from `shell/tourSteps.ts` (top bar, +, search, company/language/theme, the numbers, the account menu); the selectors are asserted against the real shell in `tourAnchors.test.tsx`. Owed once, by the wizard's finish (`lib/tour.ts`, localStorage — a screen fact, not an organization fact; the reasoning is in the file); replayed from the account menu. 6 tests. |
| 33 | The dashboard's cards | `DONE` | Ships in *feat: the dashboard's cards, and the settings that keep what the first run says*. From `docs/dashboard nice to have.txt`, only what the server answers: the four KPIs gain hints and a fifth, the VAT to set aside this quarter (`GET /reports/vat` for the current quarter); a first card with the two actions when nothing is issued yet; quick actions; recent activity as "what happened to what" in the right column. The agenda, forecast, hourly rate and "safe to spend" are left out and the panel's docstring says why. 3 tests. |
| 34 | Settings — T-29's settings half and T-28's UI half | `DONE` | Same commit. **Appearance**: theme light/dark/system (system is now the default for a fresh install), density, text size, reduced motion, translucency — token remaps on `<html>`, applied pre-paint by both shells (`lib/preferences.ts`). **Account**: name and business name editable through the wizard's two calls; e-mail read-only with the reason. **Data & privacy**: the resolved folder and what each sub-folder holds, the art. 30 register with retention, what an erasure keeps, subprocessors, the legal texts with their acceptance state (accept from here with `source: settings`), the way to backups. **Backup**: the sealed export with the server's passphrase notice before the field and the acknowledgement the API demands; restore from a `.billgenbak` through the file endpoint, passphrase in a header. The settings index is tiles in the interface language on a handed-over build, the rail is translated and pruned to what the build offers; `settings/account` and `settings/privacy` join `MVP_SURFACE`. 9 tests. Left from T-29: the folder opener (a Tauri plugin), the data-directory choice, toggles, logo. |
| 35 | The alerts card | `DONE` | Ships in *feat: the dashboard says what needs attention*. `GET /alerts` had a rules engine since 2026-08-28 and no screen. `AlertsPanel` sits under the KPI bar: one sentence per code from the server's `context`, worst first, the counts in the header, the one action per row that makes it go away (the invoice, the client, the company profile). The top bar's bell carries the critical + warning count and scrolls to the card. Alerts refetch after any successful write (one rule in `BillGenProvider`). `dashboard.alerts` is wired; **held off the beta surface** by `alertsOffered` in `ia.ts`, because CLAUDE.md's §MVP line keeps the alerts panel out of the first release — one boolean to ship it. 4 tests. |
| 36 | T-44 · + on a phone | `DONE` | Ships in *fix: on a phone the create button is on the screen*. First item from the 2026-09-15 UX review Henri accepted ("all rest you start building"); T-45…T-49 filed from the same review. CSS only; browser-measured at 375 and 320, desktop unchanged. 229 frontend tests. |
| 37 | T-45 · who owes you, and by when | `DONE` | Ships in *feat: the invoice list names who owes you, and by when*. Client and due-date columns; the overdue badge with its age, derived the way the reports derive it; a draft's "no number yet"; the duplicate select gone; the TOTAL header over its column, which was a specificity bug in the design system. Browser-measured on the desktop pair. Found underneath: the Overdue tab has always been empty — filed as T-51. 237 frontend tests. |
| 38 | T-51 · the Overdue tab has always been empty | `DONE` | Ships in *fix: the Overdue tab has something in it*. Nothing ever stored `overdue`, so the filter compared a column that never held it. The rule is on the model now, the service derives the filter, the response says `effective_status` beside `status` the way quotes do, and both list panels badge from the calendar. Seen in the browser: two rows on a tab that had never shown one. |
| 39 | T-46 · the navigation speaks the interface language | `DONE` | Ships in *feat: the navigation speaks the interface language*. `ia.ts` carries no labels; a node's name is a message keyed by its key, resolved per language by `navLabel`, with the English one derived for the ledger. Bar, popups, palette, crumbs, tiles, titles, tabs, badges, the activity feed's record kinds, the alerts card's field names and plurals. Two guard tests and one that mounts the shell under `nl`. Browser-verified. French and Dutch await Henri's native read. |
| 40 | T-47 · the sheet leads with the action its status calls for | `DONE` | Ships in *feat: the invoice sheet leads with the action its status calls for*. Status in the chrome; exports left, one status-chosen primary right, the corrections behind More with Void last in danger ink; `Menu` opens upward and hears Escape on its trigger; one shared `InvoiceStatusBadge`. Browser-verified. |
| 30 | Vanta evaluated | `DONE` (not now) | Ships in *docs: vanta proves controls are written down, not that they hold*. Recorded as T-00g with the trigger to revisit. Two tickets filed from it: T-39 secret scanning (dependency audit already ran in CI — only secrets were missing) and T-40 an external pentest, Henri's to commission after T-05. |

**This ledger's own list is closed.** Items 6–8 were the three the handover
note sanctioned explicitly: *"None of these invents a screen; each connects a
control that is already drawn."* That sanction is what made them safe to do
without Henri, and it extends to nothing else — see § Boundaries. From item 9
on, work comes from [TICKETS.md](TICKETS.md) and this table only records what
happened to it.

### Health, as of the last run

| | |
|---|---|
| Python | **687 collected, exit 0** — 16 new in T-27, 12 in T-23, 24 in T-28, 5 in T-30, 3 for the Edge hand-off found under T-21, 2 in T-33, 7 in T-29, 5 in T-35, 3 for the first run's profile step, 5 in T-51; `tests/desktop/` is 56 | 
| Frontend | **246 passed** (`npm run test`, 42 files), typecheck clean across all four workspaces |
| `ruff check` | clean. CI runs `ruff check .` only — the tree is *not* `ruff format` clean and was not before, so do not reformat it as a side errand |
| Architecture doc | **in sync** — both `sync-architecture --check` and `architecture_to_text.py --check` green at 113 endpoints across 27 routers (regenerated 2026-09-16; the file count moved, nothing else) |
| Migrations | head is `b8d2f6a1c930` (consent records). The packaged build reads them as bytecode — `sourceless` is set in the *packaged* `alembic.ini` only, never the repository's (T-30). A dev database from before 2026-09-09 needs `alembic upgrade head`, and a desktop install migrates itself on boot |
| ROADMAP_IA | tables refreshed 2026-09-15 from `ia.ts`: 115 areas, 36 wired, 31% |
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
- ~~**New screens.**~~ Lifted 2026-09-11 — Henri: "ignore the no screens
  without drawing, that command was for something else; use the standard
  structure for UI to build the new things." Screens come from his `.txt`
  specs and the design system. What stays out is scope (§MVP), not drawings.
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

- **The default theme follows the operating system now** (2026-09-13). A
  fresh install with nothing stored resolves `system`; his onboarding spec
  lists dark as "the default Satoshi/Emerald theme" and the settings spec
  says "OS system sync", and the second is what a laptop that goes dark at
  sunset expects. One line in `lib/theme.ts` (`storedTheme`) if he wants
  dark. A stored choice from before keeps meaning what it meant.
- **Sign-in on every launch, or straight in.** The desktop shows its sign-in
  screen by default and offers "open automatically next time" as a switch.
  The reverse default — straight in, with the screen reachable only through
  sign-out — is one boolean in `frontend-electron/src/App.tsx`.

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
