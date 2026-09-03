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
"already done" from "never started" without reading the diff.

| # | Item | State | Evidence |
|---|---|---|---|
| 1 | Migrate the day-to-day dev database | `DONE` | Already at head `a40b35409ffe`; nothing to apply. The previous note assumed it was behind. |
| 2 | Settle §3, the duplicate constraint name | `DONE` | `b5ebe4e`. Models and migrations were already renamed; verified by compiling all 21 tables under the postgres dialect. Guard test added — the suite runs on SQLite, which accepts the bug. |
| 3 | The authz guard had stopped seeing the routes | `DONE` | `b5ebe4e`. Not on the original list — found by running the suite. See § What changed underneath us. |
| 4 | Regenerate the architecture report | `DONE` | `14bcd89`. In sync. Only file counts moved; the engine and the route walk agree on 92 endpoints / 23 routers. |
| 5 | The mark's palette and the site's grounds, as tokens | `DONE` | `bcc3401`. Henri's ask mid-session. Additive only — no existing token changed value. |
| 6 | ⌘K palette → `GET /search` | `QUEUED` | The palette is `henrioutai-ui/src/components/CommandPalette.tsx`, already controlled and already opened on ⌘K by `frontend-saas/src/pages/AppShell.tsx`. It only navigates pages today. The clearest win in NEXT_SESSION §5b. |
| 7 | A total on the payments report → `GET /reports/payments` | `QUEUED` | One number on a screen that already exists. |
| 8 | The composer's VAT category default → `GET /vat-treatment` | `QUEUED` | A default value, not new layout. §5b calls this the one that changes what the product is legally capable of. |

Items 6–8 are the three NEXT_SESSION §SELF sanctions explicitly: *"None of
these invents a screen; each connects a control that is already drawn."* That
sanction is what makes them safe to do without Henri, and it does **not** extend
to anything else in §5b.

### Health, as of the last run

| | |
|---|---|
| Python | **483 collected, exit 0** |
| Frontend | **159 passed** (`npm run test --workspace @billgen/ui`) |
| `ruff check` | clean. CI runs `ruff check .` only — the tree is *not* `ruff format` clean and was not before, so do not reformat it as a side errand |
| Architecture doc | in sync, v0.11 |
| Unpushed | 10 commits on `audit-engine-and-scaffolds` |

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
- **The top bar redesign.** Wanted: a floating glass bar, opaque at rest, going
  translucent over the gradient once scrolled. Design work, needs his eye.
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
- **`files_docs` reads 120, up from 21**, and the prose beside it in the
  architecture report still says "Down from 356 files". The number is correct:
  94 of those 120 files are the unzipped AI Studio prototype in `docs/`. The
  sentence is about documentation and no longer describes what is counted.
  Rewording is judgement, so it was left.
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

Left for the next run: queue items 6, 7 and 8 — the three sanctioned wirings.
