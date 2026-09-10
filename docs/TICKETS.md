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

### T-25 · The data directory leaves the package container
    branch    Desktop               status  open
    needs     —
    why       `desktop/paths.py:15` puts the database, the log, the JWT secret
              and the license under `%APPDATA%\BillGen`. Under MSIX that path
              is virtualised into the package container and **removed with the
              package on uninstall** — seven years of legally-binding invoices
              with it. This tree has been bitten by that virtualisation once
              already: `core/pdf/renderer.py:27` moved the browser cache into
              the project tree for the same reason. MSIX also has no installer
              UI — it installs silently, with no wizard — so the location
              cannot be asked for at install time and has to be a first-run
              choice.
    do        `app_data_dir()` resolves in order: `BILLGEN_DATA_DIR`, then a
              path recorded in a config file beside the executable, then the
              default `%USERPROFILE%\Documents\BillGen`. First run offers the
              default and a "choose another folder" control — Emilia points it
              at her `D:` drive there. For an existing install: if the old
              `%APPDATA%` database exists and the new location does not, move
              the folder once and leave a marker. Never sync in both
              directions; a split brain over an invoice series is worse than a
              missing one.
    done when A packaged build, installed and uninstalled, leaves
              `Documents\BillGen\billgen.db` on disk. `tests/desktop/` covers
              the three resolution branches, the one-way migration, and that
              `BILLGEN_DATA_DIR` beats both.
              **Half done, `6c6a1a2`:** `desktop/paths.py` resolves in four
              steps, `migrate_legacy_data()` moves an old install once and
              refuses to merge, and six tests in
              `tests/desktop/test_paths.py` cover both. The other half is
              the install-and-uninstall assertion, which cannot be made
              until T-30 produces a package to install.

### T-20 · A sidecar that runs without Python on the machine
    branch    Desktop               status  in-progress
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
              **Built and proven short of the VM, `a16d389`:**
              `scripts/build_sidecar_runtime.py` assembles a 61 MB runtime —
              the 12 MB embeddable CPython, the locked wheels, and copies of
              core/db/api/desktop — and `main.rs` prefers it over anything on
              PATH (`BILLGEN_PYTHON` still overrides). `cargo check` passes.
              The sidecar boots on it, migrates a fresh database through every
              revision and answers `/healthz`, `/auth/desktop-bootstrap` and
              the record endpoints on a `PATH` holding only `C:\Windows` and
              `C:\Windows\system32`. `scripts/check_sidecar_runtime.py` is
              19/19.

              What is left is exactly the VM: `tauri build` has never run here,
              so the NSIS installer, the resource layout it produces and the
              first launch on a machine that never had a developer on it are
              unobserved. That is Henri's box to press, and T-30 is where the
              packaging decisions land.

              **Two things the build found, neither of them the ticket's
              subject.** `cryptography` was imported by `desktop/licensing.py`
              and declared nowhere — it worked on every machine that happened
              to have it, and the first runtime built from the lockfile had no
              licence verification in it at all, which T-22 would have
              discovered inside a packaged build. `desktop/` is a workspace
              member with its own `pyproject.toml` now, so the lockfile and
              CI's audit both cover it. And the first runtime *passed* every
              smoke test while quietly importing this laptop's FastAPI and
              rendering PDFs through a Playwright that was never bundled,
              because enabling `import site` in the embeddable `._pth`
              re-enables the user site directory. That is why there is a
              checker rather than a smoke test.

### T-22 · Emilia's license file
    branch    Desktop / Henri       status  open
    needs     T-20
    why       `desktop/licensing.py` verifies an Ed25519-signed license file
              offline (email, plan, expiry, optional hardware id). An absent
              license is still allowed (beta grace). Nothing is hosted, and
              nothing needs to be.

              Two halves of this are currently zero, where the ticket assumed
              one line. **`desktop/bootstrap.py` never calls `check_license`**
              — the module is a tested library nothing invokes. And
              `hardware_id` round-trips through the signature
              (`licensing.py:44`, `:87`) without ever being compared to the
              machine running it. Henri 2026-09-09: the beta copy is bound to
              its OS install.
    do        Generate a key pair once — the private key stays with Henri and
              never enters the repo. `sign_license({...})` for her, expiry at
              the end of the beta. Add `machine_fingerprint()`: on Windows,
              `MachineGuid` from `HKLM\SOFTWARE\Microsoft\Cryptography` —
              stable across reboots and hardware swaps, changes on an OS
              reinstall, which is the binding asked for. Not the MAC (docking
              stations and VPN adapters move it) and not an IP address.
              `check_license` compares it when the payload carries one. Call it
              from `bootstrap.py` with `require_license` on in the packaged
              build; embed the public key. Write down the reissue path — a
              dead laptop must not be a dead business.
    done when The packaged app refuses to start without the file and starts
              with it; a license signed for another machine is refused on this
              one and the error names why; `bootstrap` fails closed, not open,
              when the public key is missing; `test_tampered_payload_rejected`
              already covers the signature.

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

### T-27 · The documents leave the database
    branch    Desktop / Backend     status  open
    needs     T-25
    why       Nothing is written to disk except the SQLite database — PDFs
              render on demand and are never kept. Henri 2026-09-09: the data
              folder should hold the invoices, and the backup should carry the
              documents, the contracts and the policies. Under a seven-year
              retention duty, a document that exists only while the app runs is
              a thin guarantee.
    do        On issue, write the rendered PDF to
              `<data dir>/invoices/<year>/<reference>.pdf`. **The database
              stays authoritative and the folder is written, never read back**
              — otherwise a user tidying a folder silently edits the legal
              record, and that is the one failure this must not have. A
              `Document` row (kind: invoice | contract | policy | other; path;
              sha256; created_at) registers each file so `BackupService.export`
              can carry it. One-shot re-render for anything issued before this
              lands.
    done when Issuing an invoice leaves a PDF under `invoices/<year>/`;
              deleting that file changes no endpoint's answer; the export
              carries the document rows and their hashes; a restore into an
              empty database reports which files are missing instead of
              failing.

### T-28 · A backup that can be carried
    branch    Desktop               status  open
    needs     T-23, T-27
    why       `BackupService.export` already produces readable JSON — which is
              what Henri wants for everyday access, and exactly what must not
              travel on a USB stick unprotected: it is every client's name,
              address and VAT number in one file. A beta tester needs one
              artifact she can move off the machine without becoming a breach.
    do        `GET /backup/export?encrypt=true` wraps the same JSON plus the
              T-27 documents in an archive encrypted with a passphrase —
              AES-256-GCM, scrypt KDF, salt and parameters in a plaintext
              header. `cryptography` is already a dependency. The plain export
              does not change. Restore accepts both and asks for a passphrase
              only when the header says so. **The passphrase is never stored
              and cannot be recovered**, and the UI says so before the first
              export rather than after.
    done when An encrypted export restores into an empty database with the
              right passphrase; a wrong passphrase fails with a distinct error
              and no partial write; the plain export is byte-identical to
              today's. The rehearsed restore itself is T-23's evidence, not a
              second note.

### T-29 · The guided first run — and where the data lives, said inside it
    branch    Frontend              status  blocked
    needs     T-25, T-27, T-28 — and a drawing from Henri
    why       A beta tester holding her own clients' personal data on her own
              laptop is a controller with obligations, and the app is the only
              place she will ever read about them. Today nothing in the UI says
              where the database is, what is in it, how long it is kept, or
              what a backup does and does not protect.

              Henri 2026-09-09: that explanation does not belong in a settings
              page nobody opens. It belongs in the **guided first run** — the
              authoritative walkthrough that takes the user across the app
              once, collects credentials, logo and VAT identifiers, completes
              the organization's single company, and has the beta contract
              signed in the same pass. Signing it there is what makes "you can
              always find it in Settings → Documents" a true sentence rather
              than a hope.

              The flow is already specified in `docs/onboarding feature .txt`,
              Henri's own: five steps, entity type with KBO mod-97 validation,
              progressive scaffolding by business profile rather than a tour,
              seeded data, and a first invoice inside three minutes.
    do        One wizard, shown once, resumable. It ends with: a company whose
              identifiers pass `core/rules/identifiers.py` (reuse the existing
              `GET /companies/{id}/validation` as the completion gate rather
              than a second rule set), a logo, a chosen data directory (T-25),
              and an accepted contract stored as a `Document` of kind
              `contract` (T-27) — which therefore lands in the backup (T-28).

              What the wizard says once, **Settings → Data & privacy** keeps
              permanently: the *resolved* data directory with an "open folder"
              control, what each folder holds, the retention position, the GDPR
              summary already generated from `core/trust/` into
              `docs/LEGAL_BRIEF.md`, and the backup and restore controls. Plus
              the prompt, before the first encrypted export, that the
              passphrase cannot be recovered. Every panel links to the guide
              and support section rather than restating it — one wording, one
              place to correct it.
    done when The wizard cannot be completed with a company that fails
              validation; the accepted contract appears as a `Document` row and
              in `GET /backup/export`; the settings section shows the path
              `app_data_dir()` actually resolved, asserted by a test rather
              than hard-coded; the first run shows once and not again; and
              every legal sentence on screen is generated from `core/trust/`
              rather than typed into a component. Blocked until the layout is
              drawn — new screens are Henri's (SOLO_RUN § Boundaries).

### T-30 · The shipped package — MSIX, slimmed, and legal
    branch    Desktop               status  open
    needs     T-20, T-21, T-25
    why       As it stands the sidecar would ship around 200 MB, most of it a
              Chromium the app should never download on a beta tester's
              connection; it would ship readable source; and a redistributed
              build carries third-party licences it names nowhere.
    do        Bundle the embeddable Python as a Tauri resource. Exclude
              `psycopg[binary]` — the desktop is SQLite-only and never imports
              it — and Playwright, package and browsers both: since T-21 the
              desktop prints through the installed Edge's own command line and
              imports nothing (`build_sidecar_runtime.py` already leaves both
              out). Trim the stdlib (tkinter, test, idlelib, turtle, ensurepip,
              pydoc_data). `python -OO -m compileall`, ship `.pyc` without
              `.py`: safe **here** because `api.d.ts` is generated at build
              time from an unstripped tree, so §11c's docstring exception does
              not bite the desktop artifact — it still binds the SaaS image.
              Strip `#` comments in the packaging step only (§11c: comments
              must not ship, and must not be deleted). Generate
              `THIRD-PARTY-NOTICES.txt` from `uv.lock`. `tauri.conf.json:30`
              targets `nsis` today; add the MSIX target.
    done when The installed package is under 120 MB; the build output contains
              no `.py` outside the resource loader; the notice file names every
              package in `uv.lock`; the app starts on a clean Windows VM with
              no Python and no Playwright browsers; and a fresh checkout still
              has every comment it has today.

### T-31 · Sign in with Google, then Microsoft
    branch    Backend / Frontend    status  open
    needs     —
    why       The hosted beta targets 100 clients and 10 concurrent, so scale
              decides nothing here; hours, subprocessors and outage surface do.
              ADR-0004 rejected a managed IdP and called the self-rolled auth
              tenant-safe and tested — one OIDC provider does not overturn
              that, and a managed IdP would be a third subprocessor against a
              list BETA_LAUNCH_PLAN wants kept at two. The real prize: a
              Google-verified sign-in **cannot be locked out by a forgotten
              password**, which takes the edge off ADR-0004's own "a hosted
              product where a forgotten password is a permanent lockout is not
              shippable" while T-01 is still open.
    do        A `user_identities` table — `(provider, subject)` primary key →
              `user_id` — beside the existing `user_credentials`, where a
              password is already one credential kind and not a column on the
              user (`db/models/credential.py:11`). Two endpoints per provider:
              `/auth/{provider}/start` (PKCE + state) and
              `/auth/{provider}/callback` (verify the id_token against the
              provider's JWKS, find-or-create, then the **existing**
              `_issue_pair()`). The provider answers only "which human is
              this"; BillGen still mints the token carrying `org_id` and
              `role`, so `core/tenancy.py` and every isolation test are
              untouched. Trust the `email` claim only when `email_verified`.
              Google first; Microsoft/Entra is the same path with a different
              discovery document. Apple deferred — €99/yr, an ES256 client
              secret that expires every six months, and a private-relay address
              that is a poor business contact on an invoice.
    done when A Google sign-in creates user, organization and owner membership
              on first use and reuses all three on the second; a password user
              signing in with the same verified address links rather than
              duplicates; a forged id_token is refused;
              `tests/api/test_tenant_isolation.py` passes unchanged.

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

### T-21 · PDFs through the installed Edge  ·  *feat: PDFs print through the installed Edge*
    `core/pdf/renderer.py` launched Playwright's own Chromium: a ~150 MB
    download on first use, behind a 110 MB Python package the sidecar runtime
    had already stopped shipping (T-20). The ticket's `do` said
    `p.chromium.launch(channel="msedge")`, which drops the download and keeps
    the package. Henri chose the other half, 2026-09-10: Edge prints a page to
    PDF **from its own command line**, so the desktop needs neither.

    `_edge_pdf` writes the document to a temporary directory and runs
    `msedge --headless --print-to-pdf=… --no-pdf-header-footer` on a profile of
    its own — without `--user-data-dir` the command is handed to whatever Edge
    the user already has open, which prints nothing and returns at once, and
    two renders at a time would do the same to each other. Found through the
    registry's App Path, then the usual install locations; `BILLGEN_PDF_BROWSER`
    names one explicitly, and a path that does not exist means "no browser",
    never "some other browser". Playwright stays as the container's path;
    `html_to_pdf` tries Edge first and the 503 names every failed attempt.

    **Still one engine** (DOC-05): Edge *is* Chromium. Printed from the same
    HTML, the two launchers put every glyph at the same coordinates to the
    tenth of a point and the same fills at the same rects — checked with
    pdfplumber on this machine, not assumed. What makes that hold is that
    neither launcher is told the paper: the command line has no switch for it,
    and Playwright now prefers the CSS page size, so each template's `@page`
    rule is the single source of size and margins. A guard test asserts every
    template has one.

    `done when` met: `test_real_pdf_bytes` passes with
    `PLAYWRIGHT_BROWSERS_PATH` pointed at an empty directory; the same run
    with Edge hidden as well fails cleanly, naming Playwright's missing
    executable — so it was Edge that rendered. `tests/core/pdf/` pins the
    lookup, the command line, the fallback order and the error text in
    twelve tests that launch nothing; a thirteenth prints through the real
    Edge where there is one. `check_sidecar_runtime.py` now asserts the
    runtime **renders** with no Playwright in it, and does.

    Left where it was: the Edge on a desktop is whatever Windows Update left
    there, so the golden-file test DOC-05 still lacks now guards against
    version drift from two sides rather than one. Nothing is loaded from disk
    on either path — the templates embed their one asset as a data: URI — so
    the command line carries no `--allow-file-access-from-files`.

### T-19 · One shell — the desktop is the SaaS shell plus an adapter  ·  `a8fc530`, `5cdcc54`
    `frontend-electron/src/DesktopShell.tsx` was a second shell: a tab state
    machine over eleven panels, no router, no IA, 284 lines. It lagged the web
    shell the moment either changed — SOLO_RUN item 9 was the standing instance
    — and it silently lacked the template studio, Client 360, invoice detail
    and every report screen the web app had. For a build that is meant to *be*
    the SaaS frontend wrapped for the desktop, that was the whole gap.

    **Step 1** (`a8fc530`) closed the standing divergence: `variant="floating"`
    and the ThemeSwitcher, two props.

    **Step 2** moved the shell into `@billgen/ui` — `shell/ProductShell.tsx`,
    `shell/routes.tsx`, the template studio and the dev tier switch with it,
    plus `lib/theme.ts`, which was byte-identical in both shells apart from a
    comment. `frontend-saas` and `frontend-electron` now differ by a router and
    an adapter, and `DesktopShell.tsx` is **35 lines**, all of them the adapter.

    **What the adapter turned out to be**, against the five fields the ticket
    guessed at: `{ surface, account? }`. `tokenStore`, `resolveBaseUrl` and
    `persistTheme` are bootstrap concerns that `lib/api.ts` and `main.tsx`
    already own on both surfaces — threading them through the shell would have
    made the shell the place platform differences re-accumulate. `navigate` is
    not a difference either: the desktop got a `MemoryRouter` (no address bar
    to reflect, no server to ask for a deep path on reload) and then
    `useNavigate` is the same call in both places.

    So the two real differences are: which IA surface to render, and whether
    there is a session to end. The desktop passes `surface="desktop"` — which
    finally makes true the comment `ia.ts` has carried since 2026-08-25, that
    "frontend-electron consumes them via routableNodes('desktop')" — and an
    account with no `onLogout`, so the menu simply has no such entry.

    Named `ProductShell`, not `AppShell`: the design system already exports an
    `AppShell` layout primitive that every surface imports `as Shell`, and two
    different AppShells out of one barrel is how a consumer gets the wrong one.

    **Verified in a browser on both surfaces**, which is the only way this kind
    of change is verified. `frontend-electron` under plain Vite against the
    desktop-mode API (`npm --workspace @billgen/desktop run dev:sidecar`, port
    1421, new — `lib/api.ts` already had the no-Tauri fallback this needs):
    floating bar with the language and theme controls, IA nav, **Catalog →
    Invoice templates renders the template studio**, "+" renders the builder
    with the real client list, and the account menu carries "Desktop (Windows)"
    and no "Log out". On 5183 the same shell carries "Log out" and no desktop
    section. Every request 200, preflight included.

    **Two follow-ups, both Henri's on first sight of the shell** (`f105a36`,
    and the MVP surface after it). Giving the desktop the whole IA meant a
    handed-over build offered 124 nodes of which 29 are wired, with an amber
    "partially wired" dot over a Clients screen that works. A packaged build
    now offers `MVP_SURFACE` — §MVP's list, enforced rather than described —
    and the interface language stopped following the company's *document*
    language, which would have opened Emilia's app in Dutch.

    `TopNavPopups.test.tsx` untouched and green, as the ticket required.
    `scaffold/routes.test.ts` had to follow the moved sources, and grew: the
    shadowing guard now runs for **both** apps, because the desktop
    hand-declares the invoice builder beside the generated routes exactly as
    the web app does and can shadow a path the same way — on the surface nobody
    is watching.

### T-32 · The partner tier — granted, never bought  ·  `1ebb784`
    Beta testers need the template studio, which is gated on
    `pdf_templates_premium`: False on free and starter, True on business. The
    first instinct is to put them on `business`, and it makes two things
    permanently untrue — "how many Business organizations are there" stops
    being answerable, and a partnership that ends looks like churn.

    Henri asked whether it could be a *role* instead. It cannot: `role`
    (owner/admin/member) is authz inside an organization and
    `api/authz/matrix.py` keeps role names out of the routers deliberately;
    entitlements are resolved from `PlanTier` on the organization or its
    subscription. So it had to be a tier.

    `PlanTier.PARTNER` carries Business's features and quotas with two
    deviations Henri set: `COMPANIES: 1`, because a beta tester runs one
    business, and therefore `multi_company: False` — leaving it True with a
    quota of one would draw a company switcher whose every use is refused, and
    a control that cannot work is worse than an absent one.

    **It is absent from `TIER_ORDER` on purpose**, and that is the load-bearing
    part. Two things read that list and both are about selling: `GET /plans`
    renders exactly it, and `cheapest_tier_with()` walks it to answer "upgrade
    to X". A tier that is granted has no price, so a paying Starter customer
    hitting a quota must never be pointed at it. Four tests pin this: the
    capability, the single company (quota *and* flag), the absence from both
    selling paths, and that a partner's own 402 still names a tier that can
    actually be bought.

    Two knock-ons worth knowing. The licence file already carries `plan` in its
    signed payload, so an offline desktop licence can say `partner` and seed the
    organization's tier with no server involved — which is what T-22 needs. And
    `tTier` falls back to title-casing an unknown wire value, so "Partner"
    renders correctly in all four languages with no new copy to review; a
    partner viewing the plans comparison sees the four purchasable tiers with
    none marked current, which is accurate.

### T-26 · Goods or services — Article 39bis becomes reachable  ·  `8fb7064`
    `core/rules/vat.py` returned REVERSE_CHARGE for every intra-EU B2B sale,
    because nothing told it what kind of supply it was. `VATCategory.INTRA_EU`,
    its Article 39bis mention in four languages and its compliance check all
    existed and were unreachable: a Belgian seller shipping goods to a Dutch
    business was issued an invoice citing Article 51 §2.

    `SupplyKind` (goods | services) lands on `core/models/tax.py` beside
    `VATCategory`, because it is a fiscal fact and not a catalogue label. The
    product carries it, the invoice, credit-note and quote lines freeze a copy
    at composition, and `pick_category` splits the intra-EU B2B case on it.
    Everything defaults to `services`, which is the answer every caller was
    already getting, so the migration backfills existing rows with the
    treatment their documents were issued under.

    Two things it deliberately is not. It is **not the catalogue distinction**
    Henri described — a €100/week transport package and a cleaning job are both
    services in VAT terms; `billing_type` and `category` are what separate a
    packaged offer from labour by measure. And it is **not yet user-visible**:
    the field is on the API and defaults correctly, the control to set it
    belongs with the catalogue panel.

    Still owed: the accountant's confirmation of the mapping, now question 5 of
    the hour in BETA_LAUNCH_PLAN §W1. `belgian_legal.py` already said the
    wording needs a licensed sign-off, and this decides which article a real
    cross-border invoice carries.

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
