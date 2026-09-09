# The queue

The point of this file: **a session should be able to pick up work without
re-deriving the state of the repository first.** Every ticket below is written
to be executed cold — it names the files, the acceptance criteria, and the
evidence to produce — so the expensive part of a session (working out where
things stand) happens once, here, instead of every time.

**Read this before `system-architecture.html`.** The architecture document is
what you check work *against*; this is what you take work *from*.

## How a ticket works

```
ID · title
  branch       who owns it in §21
  status       open | in-progress | done | blocked
  needs        tickets that must land first
  why          what breaks while it is open
  do           the actual change, by file
  done when    the assertion that closes it — a test, a command, an endpoint
```

A ticket is **done** only when `done when` is satisfiable by someone who does
not trust you. "Implemented" is not a status. If a ticket turns out to be
wrong, close it as `done` with a note saying so — a deleted ticket loses the
reasoning that made it look right.

**Do not add a ticket without a `done when`.** A ticket you cannot verify is a
wish, and the queue is not for wishes.

---

## Open — in priority order

### T-19 · One shell — the desktop is the SaaS shell plus an adapter
    branch    Frontend              status  open
    needs     —
    why       Henri 2026-09-09: Emilia's build is the SaaS frontend wrapped
              for the desktop. Today `frontend-electron/src/DesktopShell.tsx`
              is a second implementation of
              `frontend-saas/src/pages/AppShell.tsx` (690 diff lines) and
              already lags it — SOLO_RUN item 9 is the first instance. Two
              shells means every fix is done twice or forgotten once.
    do        Step 1, one line: `variant="floating"` + `ThemeSwitcher` on
              DesktopShell. Step 2: move AppShell into `@billgen/ui` taking a
              `PlatformAdapter` { tokenStore, resolveBaseUrl, persistTheme,
              navigate, surface }; DesktopShell becomes the adapter. Move
              `lib/theme.ts` into the package — it is identical in both shells.
    done when `DesktopShell.tsx` ≤ 80 lines, both shells render from one
              AppShell, and `TopNavPopups.test.tsx` passes unchanged.

### T-20 · A sidecar that runs without Python on the machine
    branch    Desktop               status  open
    needs     —
    why       `src-tauri/src/main.rs` spawns `python -m desktop.bootstrap`
              (`BILLGEN_PYTHON` override). Emilia's laptop has no Python.
              The desktop plan named PyInstaller; the lazier option is the
              python.org *embeddable* distribution (~10 MB) shipped as a Tauri
              resource with `BILLGEN_PYTHON` pointed at it. Try that first;
              freeze only if Playwright refuses to run from it.
    done when `tauri build` produces an NSIS installer that starts the API on
              a clean Windows VM with no Python installed, and `/healthz`
              answers.

### T-21 · PDFs through the installed Edge
    branch    Backend / Desktop     status  open
    needs     —
    why       `core/pdf/renderer.py` launches Playwright's own Chromium, a
              ~150 MB download on first run that a desktop user cannot be
              asked for. Every Windows 11 machine has Edge, and Playwright
              drives it with `channel="msedge"`.
    do        One more attempt in `_chromium_pdf`, tried first on Windows:
              `p.chromium.launch(channel="msedge", args=[...])`. Keep the
              bundled-Chromium path for the container.
    done when `test_real_pdf_bytes` passes on a machine with Edge and no
              Playwright browser downloaded.

### T-22 · Emilia's license file
    branch    Desktop / Henri       status  open
    needs     T-20
    why       `desktop/licensing.py` verifies an Ed25519-signed license file
              offline (email, plan, expiry, optional hardware id). An absent
              license is still allowed (beta grace). Nothing is hosted, and
              nothing needs to be.
    do        Generate a key pair once — the private key stays with Henri and
              never enters the repo. `sign_license({...})` for her, expiry at
              the end of the beta. Turn `require_license` on in the packaged
              build so the file is what gates it; embed the public key.
    done when The packaged app refuses to start without the file and starts
              with it; `test_tampered_payload_rejected` already covers the
              signature.

### T-23 · Backup on close, restore rehearsed on her machine
    branch    Desktop               status  open
    needs     T-20
    why       Her data lives only in `%APPDATA%\BillGen`. ADR-0003's export
              exists as an endpoint and a panel; nothing runs it unasked. No
              job runner is needed on the desktop — the sidecar has a
              shutdown.
    do        On sidecar shutdown, write the backup export to
              `%APPDATA%\BillGen\backups\<date>.zip`, keep the last 30.
              During the first Teams call, restore one into a scratch
              database and compare — T-06 performed where the data is.
    done when A dated note in `docs/` says a restore was performed on her
              machine, from which file, and what was compared.

### T-01 · Transactional mail — the sending path
    branch    DevOps / SRE          status  open
    needs     T-02 (job queue)
    why       Blocker B1. **The infrastructure the application sends
              *through*, not a mailbox a human reads (T-01b, done).**
              Three kinds of mail are planned, and they are not one job —
              see the split below. This ticket is the first kind.

              **The account loop.** J-04 verification, J-07 password reset,
              SEC-08, SEC-09 recovery codes, J-12 support. Today a customer
              who forgets a password is locked out permanently, which is the
              cheapest way to lose someone who already paid.
    do        Choose an EU-hosted transactional provider. Add a
              `core/notifications/` port with a single `send(message)` and one
              adapter behind it, so the provider is swappable and `core/`
              keeps no vendor import. Secret through `Settings` FIRST, then
              `.env.example` (SEC-13).

              **Do not send through the mailbox provider.** It is rate
              limited, shares an IP reputation you do not control, has no
              bounce handling, and being flagged for bulk sending costs the
              mailbox as well as the delivery.
    done when A test sends through a fake adapter and asserts the port is
              called with a rendered message; `GET /readyz` reports mail
              reachable the way it already reports the PDF engine.

### T-01c · SPF, DKIM and DMARC on billgen.be
    branch    DevOps / Henri        status  open
    needs     T-01 (T-01b is done and is already a live sender)
    do        One SPF record covering **every** sender, DKIM for each, then
              DMARC at `p=none` to observe before enforcing.

              **The trap, repeated because it fails silently:** two SPF records on one domain is not "both work", it
              is *invalid* — receivers return a permerror and SPF fails
              outright. The LWS record and the provider's record must be
              **merged into a single record**.
    done when Mail from the application and from the mailbox both pass SPF,
              DKIM and DMARC at an external checker.

### T-01d · Invoice delivery by email
    branch    Backend / Product     status  open
    needs     T-01
    why       Henri 2026-09-04: the software should send the customer's
              invoice to *their* client. **This does not exist today** —
              invoices are generated and downloaded. `InvoiceStatus` has no
              SENT or DELIVERED state (quotes have one; invoices do not) and
              `invoice_service.py` says Peppol delivery is a separate track.

              **This is the one kind of mail where delivery is a legal fact,
              not a convenience.** Payment terms run from delivery and a
              recipient can claim non-receipt, so the provider must give
              delivery webhooks and the accepted/bounced result must land in
              the audit log beside the invoice. That is the difference between
              "we sent it" and "we can show we sent it".

              **Scope note worth deciding before building:** for Belgian B2B
              the mandate replaces PDF-by-email with structured e-invoices
              over Peppol — emailing a PDF is the thing being regulated away.
              So this is the B2C and small-client road, and Peppol is the B2B
              one. Both are real; they are not substitutes for each other.
    do        Add the delivery state to the invoice lifecycle (ADR-0002's
              pending delivery track), send through the T-01 port, write the
              webhook result to the audit log.
    done when An issued invoice can be sent, its state reflects that, and a
              bounce is visible in the activity log rather than silent.

### T-01e · Marketing email — a separate stream, on purpose
    branch    Marketing / DevOps    status  open
    needs     T-01, T-16 (privacy policy), cookie/consent work
    why       Henri 2026-09-04. Marketing mail is **not** transactional mail
              with different words, and treating it as one breaks both:

              **Legally** it is a different regime. Transactional mail is sent
              because someone asked for a password reset; marketing needs
              recorded opt-in, a working unsubscribe in every message, and a
              lawful basis the privacy policy actually states. The consent
              register already has a `marketing` category defaulting to off
              and currently running nothing — that default is correct and
              must survive this ticket.

              **Technically** the two must not share a sending reputation. A
              handful of spam complaints on a newsletter will poison the
              domain that also carries password resets and invoices — so the
              newsletter goes out on a separate subdomain or stream, and the
              transactional path stays clean. This is the single most common
              way a small SaaS breaks its own login flow.
    done when A marketing send uses a stream that is not the transactional
              one, every message carries an unsubscribe, and a test asserts
              nobody is mailed without a recorded consent decision.

### T-02 · Job queue
    branch    DevOps / SRE          status  open
    needs     —  (can be built before hosting; runs in-process first)
    why       PROD-07. Mail and Peppol transmission both need work that
              outlives a request. Sending mail inside a handler is how the
              first outage happens.
    do        Smallest thing that retries and has a dead-letter destination.
              Resist a broker until there is a second process to justify it.
    done when Kill the worker mid-job: the job is retried or lands in the
              dead-letter table. Never vanishes. A test asserts that.

### T-03 · Error tracking
    branch    DevOps / SRE          status  open
    needs     T-05 (hosting) to be useful, but can be wired before
    why       PROD-01. Nothing collects a stack trace from a running server.
              You cannot support a customer whose error you never saw — and
              you cannot know a breach began, which is what makes the 72-hour
              clock in §22 start whenever somebody happens to notice.
    done when An exception raised in a handler appears in the tracker with
              its correlation id (T-04) attached.

### T-04 · Correlation IDs
    branch    DevOps / SRE          status  open
    needs     —
    why       PROD-02. Two log lines from one request cannot be tied
              together. Cheapest item in §10 and the one that makes every
              other observability row readable. The audit engine already
              reports its absence (`scanners/operations.py`).
    do        Middleware mints or accepts a request id, binds it into the
              structlog context, returns it as a response header.
    done when Two log lines from one request share an id, and the header is
              asserted in a test.

### T-05 · Hosting — the machine
    branch    DevOps / SRE          status  open
    needs     —
    why       PROD-09. Docker targets and a prod compose exist; nothing is
              deployed. Almost nothing else can be *verified*.
              Deferred for the first beta client (2026-09-09, W3): Emilia
              gets the desktop build. This stays the SaaS answer.
    done when `/healthz` answers over TLS on a hostname that is not this
              workstation, and CI has been watched going green once.

### T-06 · Automated backup + one rehearsed restore
    branch    DevOps / SRE          status  open
    needs     T-05
    why       PROD-06, and the largest single risk in the project. Seven-year
              fiscal retention with an untested restore is the one failure
              that cannot be apologised for.
    do        Schedule the existing export (ADR-0003). Then **restore it into
              a scratch database and compare row counts and a sample invoice
              PDF byte-for-byte.** The rehearsal is the deliverable, not the
              schedule.
    done when A dated note in docs/ says a restore was performed, by whom,
              from which backup, and what was compared. Repeat quarterly.

### T-07 · Article 4 AI system inventory
    branch    AI governance         status  open
    needs     —
    why       AI-03. Enforceable since 2 Aug 2026, applies at *every* risk
              tier, and its absence is an aggravating factor in any other
              enforcement action. Hours of work.
    do        A table — model, pinned version, provider, licence, where
              inference runs, what data crosses the boundary, terms last
              reviewed, plus a role map and literacy records. Shape it so an
              HR AI-use policy can grow out of the same table (§21).
              `ai_transparency.SURFACES` is a *product-feature* registry and
              is explicitly not this.
    done when `GET /trust/ai-systems` returns the inventory, and a test
              asserts every row carries a pinned version — no floating tags
              (AI-04).

### T-08 · Art. 50 marking rendered
    branch    AI governance         status  open
    needs     —
    why       AI-02, and it is **live** — BillGen was not on the market before
              2 Aug 2026, so the December grace period never applied to it.
              Launch blocker, not backlog.
    do        A marker component beside each machine-made value, driven by
              `ai_transparency.marked_surfaces()`. Attach provenance at
              generation time, not at render — and remember PROD-13: whatever
              cache arrives must preserve it.
    done when A TVA suggestion renders its marker, and pulling the artefact
              back out of any cache still shows the provenance.

### T-09 · Wire `template_snapshot` at issue
    branch    Backend / API         status  open
    needs     —
    why       ADR-0006. The column exists, has a migration and a correct
              comment, and **no writer** — so no issued invoice can be
              reproduced against the template that produced it. Blocks the
              historical record view, and building that view first produces a
              feature confidently wrong about every invoice already issued.
    do        Write the snapshot inside `InvoiceService.issue`, in the same
              transaction that consumes the number and freezes the lines.
              Nowhere else — a snapshot written elsewhere can disagree with
              the document that was actually issued.
    done when Issue an invoice, change the template, re-render: the PDF
              matches the original. A test asserts it.

### T-10 · Move Peppol validation to issue time
    branch    Backend / API         status  open
    needs     —
    why       ADR-0006 P1. `peppol_validation` fires at XML export, so a
              PDF-only customer is never checked at all.
    done when An invoice issued by a customer who never exports XML still
              carries recorded (advisory) Peppol findings.

### T-11 · Content-Security-Policy
    branch    Security              status  open
    needs     T-05
    why       SEC-21. HSTS and X-Frame-Options are set in the Caddyfile; CSP
              is not — in an app that renders customer-controlled text into
              HTML and into PDFs through a browser engine.
    done when The header is present in a response from the deployed host, and
              the app still works with no console CSP violations.

### T-12 · Record failed sign-ins
    branch    Security              status  open
    needs     —
    why       `security_events.unrecorded()` reports this as its own blind
              spot. Nothing writes a failed login, so a hundred wrong
              passwords leave no trace and **per-account** lockout has
              nothing to count — which is the half of SEC-20 that the
              per-IP bucket cannot cover.
    done when `unrecorded()` returns one fewer action, and the security screen
              shows a failed attempt.

### T-13 · Postgres row-level security
    branch    Security              status  open
    needs     T-05
    why       SEC-16. Tenancy is real and tested but enforced in the
              repository layer, so a raw query or a future service that
              bypasses it is stopped by nothing. Belt exists; this is braces.
    done when A deliberately raw cross-tenant query returns zero rows.

### T-14 · Retention policy in code
    branch    Data / DBA            status  open
    needs     —
    why       SEC-12. The register knows retention beats erasure; nothing
              expresses the seven-year rule, a soft-delete window, or a
              post-cancellation rule. Blocks J-14.
    done when A test asserts an invoice older than the retention window is
              the only thing a purge would touch — and that nothing inside it
              is touchable.

### T-15 · Execute an erasure request
    branch    Legal / Backend       status  open
    needs     T-14
    why       CMP-02, J-14. The register is right — invoices and clients
              survive art. 17 because deleting them would be a tax offence —
              but **nothing executes a deletion**, and the clock is one month
              from the request.
    done when An erasure request anonymises what may be anonymised, retains
              what must be retained, and writes an audit entry naming both.

### T-16 · The DPA and terms
    branch    Legal counsel         status  open — waiting on Henri, not on code
    needs     —
    why       CMP-09. Seven documents, none drafted. Blocks B2B revenue
              outright (J-11). The registry deliberately holds no legal
              text: a generated DPA that reads real is worse than a missing
              one, because it would be signed.
    do        **The brief now exists** — `docs/LEGAL_BRIEF.md`, in French,
              generated from the three trust registries by
              `scripts/generate_legal_brief.py`. It carries the seven
              documents and what each blocks, the art. 30 processing
              register, live and planned subprocessors, the cookie
              categories, and six questions only counsel can answer.
              Send it. Do not hand-edit it — regenerate.
    done when `legal.undrafted()` returns fewer than seven, and each drafted
              document carries a version and an effective date.

### T-17 · Mandatory-mention sign-off
    branch    Belgian accountant    status  open
    needs     —
    why       `invoice_compliance.py` gates `issue()` and its enumeration is a
              legal claim the code cannot self-certify. A rule wrong in the
              strict direction walls a paying customer in; wrong in the loose
              direction ships an unlawful invoice.
    do        Not engineering. Take the enumeration to the accountant.
    done when The caveat at the top of the module is replaced by a name and
              a date.

### T-18 · Keep the `.txt` in sync
    branch    Docs                  status  open — one line of CI away
    needs     —
    why       It was a byte copy of the HTML with nothing regenerating it, so
              it sat eleven commits stale and a downstream analysis read it
              and reported defects already fixed. **Not deletable** — Henri
              uses it to paste the architecture into an IDE, which is a real
              workflow the HTML does not serve.
    do        `scripts/architecture_to_text.py` now renders it properly:
              headings, prose and tables, entities decoded, style and script
              dropped, prose-heavy tables emitted as records so no evidence
              is truncated. 279 KB -> 137 KB. What remains is wiring
              `--check` into CI so it can never go stale again, alongside
              `generate_legal_brief.py --check` and
              `sync-architecture --check`.
    done when CI fails on a stale `.txt` or a stale legal brief.

---

## Done

### T-24 · Phase 0 hygiene  ·  `19cfb5d`…`2707470`

    Eight commits, one per item, suite green after each. The repository was
    costing more to read than to change, and every item was mechanical.

    **The one real bug.** `_TIMELINE_ORDER` documented "an invoice sorts above
    the payment that settles it, and a void sorts last" while `reverse=True`
    ran the tie-break backwards, and the void was dated from the wall clock
    while the credit note that caused it used its own `issue_date` — so a
    backdated avoir cancelled its invoice on a different day. Both are written
    in one transaction in `credit_note_service`, which is where the void now
    takes the note's date. The test that hid this hard-coded 2026-09-09; it
    dates from `date.today()` now and asserts the tie-break directly.

    **What left the tree.** 29 `.gitkeep` and the 11 directories that held
    nothing else. Four dependencies with no imports (`stripe`, `lxml`, `httpx`
    from the API's runtime set, and the second PDF engine — ADR-0004 had argued
    against a second engine in the act of keeping one, and the golden-file test
    it asked for was never written); `uv lock` dropped 17 packages. The MinIO
    container nothing has ever connected to. An 852 KB raster the vector mark
    was traced from, and a second `.claude/` config that was a subset of the
    root one.

    **What arrived.** A root `CLAUDE.md`, 80 lines: where each kind of fact
    lives, the commands that say where things stand, the boundaries, and the
    four generated files to grep rather than read. `docs/HANDBOOK.md`, 9 KB,
    replacing 94 KB across `HANDOFF.md`, `ENVIRONMENT_REFERENCE.md` and
    `NEXT_SESSION.md` — three documents that each claimed to be the starting
    point and disagreed with each other and with the tree. Their load-bearing
    content moved rather than died: the site block and the domain facts into
    BETA_LAUNCH_PLAN §W4, the bank-account check into §W1, the Netherlands
    prospect into §W5, eight open product decisions into SOLO_RUN — three of
    them cited from source comments, now repointed.

    **What was left alone, deliberately.** `frontend-react/src/tva/types.ts`.
    The endpoints exist now, but `ExpenseResponse` nests what `ExpenseSummary`
    keeps flat and two of the five types have no generated counterpart at all,
    so it is a mapping job for the ticket that reshapes those panels, not a
    deletion. The file's header says so, so the next reader does not re-derive
    it.

### T-00a · The Art. 50 obligation date  ·  `f1f444a`
    Was 2026-12-02, planned against a comment asking for verification. Checked:
    December is the end of a grace period for systems already on the market,
    which BillGen was not. Live since 2 Aug 2026 — the module believed it had
    three months and had none. Now derived from three named constants.

### T-00b · Login timing oracle (SEC-19)  ·  this session
    `verify_password` ran only when a user row was found, so an unknown
    address answered in ~0.01 ms and a known one in ~115 ms. Measured after
    the fix: 115.5 ms vs 123.5 ms, 1.07x — indistinguishable.
    Guarded by `test_unknown_email_costs_the_same_as_a_wrong_password`.

### T-00c · Auth-specific rate limiting (SEC-20)  ·  this session
    One global per-IP budget rated `/auth/login` like browsing — 172,800
    guesses a day at 120/min. Auth paths now draw on a separate small bucket,
    charged **on failure only**, so a correct sign-in never throttles a
    paying customer. Two tests, one for each half.
    Still open: per-account lockout, which needs T-12.

### T-01b · The mailboxes — contact@ / info@  ·  2026-09-04
    Done — Henri has access to both; LWS included two with `billgen.be`.
    Two threads it leaves behind: the marketing site still needs
    `NEXT_PUBLIC_CONTACT_EMAIL` pointed at it (BETA_LAUNCH_PLAN §W4 4.1), and the
    mailbox is now a **live sender**, which is why T-01c no longer waits for
    the application to send anything.

### T-00e · The brief for counsel  ·  this session
    It was never written — not lost. Everything a lawyer needs was already in
    `core/trust/`, so `docs/LEGAL_BRIEF.md` is generated from those registries
    rather than typed: a hand-written brief would disagree with the code within
    a month, and a policy drafted from a stale brief describes a system that
    does not exist. French, because the reader is. Untranslated registry
    strings are marked « ⚠ à traduire » rather than silently passed through in
    English — which caught one wrong key on the first run.

### T-00f · The `.txt` becomes a real rendering  ·  this session
    Was a byte copy including 150 KB of CSS and JS, and could never honour
    `<meta charset>` — so it arrived as mojibake in an editor even when
    current. Now rendered: 279 KB -> 137 KB, nothing truncated.

### T-00d · The missing charset  ·  `554b9fe`
    The architecture document never declared one. Served over HTTP it was
    read as Windows-1252 and every em-dash and box-drawing character became
    mojibake. One line.

---

## Rules for this file

1. **Priority order is the file order.** Re-order rather than adding a field.
2. **A ticket names files, not intentions.** "Improve security" is not a ticket.
3. **`done when` is not optional**, and it is written before the work starts.
4. **Moving a ticket to Done keeps its reasoning**, compressed to a few lines.
   The queue is also the record of why the system is shaped as it is.
5. **Non-engineering tickets belong here too** (T-16, T-17). Work that only
   Henri can commission is still work, and leaving it out of the queue is how
   it stays unowned — which §21 says is the real failure mode.

Related: [SOLO_RUN.md](SOLO_RUN.md) is the session protocol · [MINIMAL_STACK.md](MINIMAL_STACK.md)
holds the 37 controls · `ARCHITECTURE/system-architecture.html` §10, §21, §22
are where these ids are defined.
