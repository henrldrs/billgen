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

### T-01 · Transactional mail provider
    branch    DevOps / SRE          status  open
    needs     T-02 (job queue)
    why       Blocker B1. No send path exists anywhere in api/ or core/.
              It alone blocks J-04 (verification), J-07 (reset), J-12
              (support), SEC-08 and SEC-09 — five journey stages behind one
              vendor decision, which makes it the highest-leverage open item
              in the tree.
    do        Choose a provider (EU-hosted, since the DPA story is simpler and
              §10 G5 already leans that way). Add a `core/notifications/`
              port with a single `send(message)` and one adapter behind it,
              so the provider is swappable and `core/` keeps no vendor import.
              Wire the secret through `Settings` FIRST, then `.env.example` —
              never the other way round (SEC-13).
    done when A test sends through a fake adapter and asserts the port is
              called with a rendered message; `GET /readyz` reports mail
              reachable the way it already reports the PDF engine.

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
    branch    Legal counsel         status  open
    needs     —
    why       CMP-09. Seven documents, none drafted. Blocks B2B revenue
              outright (J-11). The registry deliberately holds no legal
              text: a generated DPA that reads real is worse than a missing
              one, because it would be signed.
    do        **Not an engineering ticket.** Commission it. The registry says
              which document blocks what; take that list to the jurist.
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

### T-18 · Delete or generate `system-architecture.html.txt`
    branch    Docs                  status  open
    needs     Henri's call — it is a tracked file
    why       It is a byte copy of the HTML with a `.txt` extension, and
              nothing regenerates it. It sat eleven commits stale and is
              plausibly what a downstream analysis read, which is how a fixed
              defect came back as a finding. A `.txt` also cannot honour the
              `<meta charset>`, so it renders as mojibake even when current.
    done when Either the file is gone, or `sync-architecture` writes it.

---

## Done

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
