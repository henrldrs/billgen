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

### T-34 · Mother's upgrade — her invoices come with her
    branch    Backend / Desktop     status  open
    needs     **one real export from her old app** — FinanceFlow BillGen's
              JSON backup, the whole `{app, keys}` blob. Henri produces it in
              minutes; nothing in this repository can stand in for it.
    why       Henri 2026-09-11: she is on the old BillGen and should be on
              this desktop build. The old app's export carries her invoices
              under `billgen-invoices-<companyId>`, and
              `core/imports/legacy_backup.py` **counts them and imports none**
              ("not imported in v1" — `invoices_detected`). An upgrade today
              brings her companies, clients and services and drops every
              invoice she has ever issued, under a seven-year retention duty
              — and, worse, the new install would start her numbering from 1
              on a series that already exists.
    do        Extend `ImportService` to carry invoices as **already-issued
              history**, the way `BackupService.restore` inserts them: status
              ISSUED, the legacy reference verbatim, `sequence_global`
              assigned in legacy order, dates and totals as recorded, lines
              as recorded (or one line per invoice if the old app kept only
              totals — that is a fact her export decides). Then set the
              company's `invoice` counter past the last legacy number so the
              next invoice she issues continues the series. Nothing is
              re-rendered and no number is minted; these documents were
              issued by another program and this one is their archive.

              The field mapping cannot be written before her file is in
              hand: the only legacy invoice in this tree is a three-field
              stub the tests invented. Do not guess it. `preview` must report
              per invoice what mapped and what did not, so the first run
              against her file is a report, not a write.
    done when Her real export, previewed then committed into an empty
              organization on the desktop build, yields the same number of
              invoices the old app shows, each with its original reference
              and total; the next invoice she issues takes the number after
              her last one; and a test holds an anonymised copy of her
              export's *shape* so the mapping cannot silently rot.

### T-35 · The GDPR panel on Client 360 gets its server
    branch    Backend               status  open
    needs     —
    why       Henri 2026-09-11, looking at Client 360 on the desktop build:
              "is this finished for you?" The panel is drawn — Export data,
              Erase personal data — and its ledger names what is missing:
              per-client export, erasure, consent records. `core/trust`
              already serves the legal texts, the consent *categories* and the
              privacy register; nothing stores an acceptance and nothing
              answers the two buttons. Until it does, the block is hidden on
              the beta surface (see T-19 follow-up), which is honest and is
              not the same as done: a client is a data subject, and a
              controller who cannot export or erase on request is out of
              Article 15/17 the day someone asks.
    do        `POST /clients/{id}/privacy/export` — every record that names
              the person (client row, contact fields, notes, invoices as
              *references and totals*, payments), as JSON, audited.
              `POST /clients/{id}/privacy/erase` — blanks the personal fields
              on the client record and keeps every invoice byte-for-byte:
              Belgian law retains invoices seven years, so "delete this
              client" can never mean "delete these invoices", and the
              response says so in the wording `core/trust` already holds.
              Consent records: a `consent_decisions` table (user, category,
              granted, version of the text, recorded_at, source) behind
              `POST /consent` and `GET /consent`, using the `ConsentDecision`
              shape `core/trust/consent.py` already defines and never stores.
              Then the panel: enable the two buttons on the beta surface and
              drop the scaffold block.
    done when Export returns the client's data and the invoices it names;
              erasure leaves the client's invoices unchanged (asserted
              byte-for-byte on `GET /invoices/{id}` and on the T-27 file) and
              the audit log records both; a consent decision recorded is read
              back with the text version it was given for; and Client 360
              renders the panel with no scaffold banner under `exposure="mvp"`.

    **2026-09-11, Henri's screenshot.** Three scaffold banners on Client 360 on
    a handed-over build: `MVP_SURFACE` gates screens, and a scaffold *block*
    inside a wired screen was reached by no list. Two fixes, both in
    `frontend-react`. The "Totals" block was a stale scaffold — `GET
    /clients/{id}/stats` had existed since 2026-08-28 and the block still
    named it as missing — so it prints the server's figures now (four of the
    five drawn; average days to pay waits on a label in every language, and
    this repo does not write Dutch copy). And `ScaffoldBlock` reads the
    build's exposure through a provider the routes set, and under `"mvp"`
    renders nothing: not disabled, not greyed, absent — a customer is not owed
    a ledger of what her software lacks. `Scaffold.test.tsx` holds the rule,
    `Client360Panel.test.tsx` the figures. Tags & groups therefore no longer
    ship; the GDPR panel's server is T-35.

### T-25 · The data directory leaves the package container
    branch    Desktop               status  open
    needs     —
    why       `desktop/paths.py:15` puts the database, the log, the JWT secret
              and the license under `%APPDATA%\BillGen`. Under MSIX that path
              is virtualised into the package container and **removed with the
              package on uninstall** — seven years of legally-binding invoices
              with it. This tree has been bitten by that virtualisation once
              already: `core/pdf/renderer.py:152` moved the browser cache into
              the project tree for the same reason. MSIX also has no installer
              UI — it installs silently, with no wizard — so the location
              cannot be asked for at install time and has to be a first-run
              choice. **Since T-30: the MSIX half of that reasoning is
              weaker than it looked — Tauri cannot produce an MSIX at all, and
              the NSIS installer it does produce has a UI. The answer below is
              still the right one (Documents survives an uninstall either way);
              it is simply no longer forced by the packaging.**
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

### T-23 · Backup on close, restore rehearsed on her machine
    branch    Desktop               status  open
    needs     T-20
    why       Her data lives only in the data directory T-25 resolves
              (`Documents\BillGen` unless she chose otherwise). ADR-0003's export
              exists as an endpoint and a panel; nothing runs it unasked. No
              job runner is needed on the desktop — the sidecar has a
              shutdown. **That last sentence turned out to be wrong; see
              `done when`.**
    do        On sidecar shutdown, write the backup export to
              `<data dir>\backups\<date>.zip`, keep the last 30. (Built on
              start *and* on a clean exit — the reason is in `done when`.)
              During the first Teams call, restore one into a scratch
              database and compare — T-06 performed where the data is.
    done when A dated note in `docs/` says a restore was performed on her
              machine, from which file, and what was compared.
              **Built short of that note, and not where the ticket said.**
              `desktop/backups.py` writes `<data dir>/backups/<date>.zip` — a
              zip of ADR-0003 JSON, one member per organization plus a manifest
              naming which member restores — and keeps the newest thirty,
              deleting only files it wrote itself.

              The ticket's premise is the part that did not survive contact.
              *"The sidecar has a shutdown"* is false in the build that
              matters: `src-tauri/src/main.rs` handles `ExitRequested` with
              `child.kill()`, which on Windows is `TerminateProcess` — no
              signal, no handler, no lifespan shutdown. A backup written only
              on close would have run on this workstation, passed review, and
              never once run on Emilia's machine. So it runs at both ends:
              **on start** if today has no archive yet (the run that always
              happens, capturing the state the last session left), and **on a
              clean exit**, overwriting today's with the newer state. A hard
              kill loses nothing the next start does not pick up.

              12 tests: `tests/desktop/test_backups.py` for the archive and the
              rotation, and `tests/api/test_desktop_backup_rehearsal.py`, which
              takes a zip the sidecar wrote and restores a member of it through
              `POST /backup/restore` — right reference, right total, and the
              series continuing rather than reissuing a number.

              What is left is exactly the note: a restore **on her machine**,
              from a file that travelled, into an install that had lost its
              data. [RESTORE_LOG.md](RESTORE_LOG.md) is where it goes, with the
              format and the in-repo rehearsal already in it. A restore that
              has only ever run against a database the test made is a belief
              with good manners.

### T-29 · The guided first run — and where the data lives, said inside it
    branch    Frontend / Backend    status  in-progress
    needs     T-27, T-28 (done). **The drawing is no longer needed** — Henri
              lifted that rule on 2026-09-11; the wizard is built from
              `docs/onboarding feature .txt` on the standard structure. What
              it still needs from him: **the legal texts.** `core/trust/
              legal.py` is a registry with every document undrafted and no
              bodies; a partnership contract is not registered at all.
              The acceptance step is data-driven and gates on nothing until
              a text is drafted (versioned, with a body), so the mechanism
              ships now and the texts drop in when they exist.
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
              rather than typed into a component.
              **Backend half done, 2026-09-11** (*feat: the first run has a
              ledger*). `GET /onboarding` derives the state on every call —
              no step counter a browser can lose: completed_at, the company
              and whether it passes the same `validate_company_identifiers`
              the validation endpoint uses (problems named by field), the
              required texts and which are accepted, client and product
              counts, and the **resolved** data directory. `POST /onboarding/
              acceptances` records a per-user, per-version acceptance and
              writes the text as accepted into `<data dir>/contracts/` as a
              `contract` Document — so it is in the backup. `POST
              /onboarding/complete` stamps the organization and refuses,
              naming every blocker, while the company fails validation or a
              required text is unaccepted; a second completion is not a
              second stamp. Migration `f3a9d2c7b815`; 7 tests in
              `tests/api/test_onboarding.py`, one of which drafts a text
              into the registry for its own duration, because none is.
              **Wizard and gate done, later the same day** (*feat: the
              guided first run*). `OnboardingWizard` at `onboarding/wizard`
              on the design system's Stepper: language & look (the app's own
              switchers), the company (the existing `CompanyForm`, then the
              server's verdict field by field), the published legal texts
              to accept — data-driven, and honest that today the list is
              empty — a first client and service (optional, counted by the
              server), and the finish, which is the server's `complete` and
              on refusal names each blocker. `FirstRunGate` in both shells
              sends an organization with no `completed_at` to the wizard and
              fails open on error; migration `a7c41e9d5f02` stamps every
              organization that already owned a company, so no dev database
              or earlier install is sent to a wizard for a setup it has done.
              Copy in four languages; the Dutch is drafted, not native-read.
              5 wizard tests, 201 frontend tests, `onboarding/wizard` is on
              the beta surface and `nav: false` — reached by not having
              finished it.

              Left, each named in the wizard's docstring: the feature
              toggles of the spec's step 3 (no `organization.modules`
              model), logo upload (B2), the sample-invoice extraction (no AI
              surface), Settings → Data & privacy, and the data-directory
              choice, which needs a restart story with the Tauri shell. And
              the texts: until `core/trust/legal.py` carries a drafted,
              versioned body, the legal step gates on nothing.

### T-30 · The shipped package — slimmed, legal, and not MSIX
    branch    Desktop               status  open
    needs     T-20 (the VM)
    why       Everything in this ticket except one thing is done and measured;
              what is left needs `tauri build` on a machine that is not this
              one. The original text is preserved below the line, because two
              of its instructions were wrong and the reasoning for them is
              worth keeping.
    do        Press the button: `npm run tauri build` in `frontend-electron`,
              then install the NSIS output on a clean Windows VM with no Python
              and no Playwright browsers, and start it.
    done when The app starts on that VM and `/healthz` answers. Everything else
              this ticket asked for is asserted by
              `python scripts/check_sidecar_runtime.py`, 25/25 today, which is
              runnable by anyone who does not trust this note.

              **Done and measured.** The runtime is **62.4 MB** before the
              installer compresses it, against the 120 MB the ticket set.
              `scripts/build_sidecar_runtime.py` now compiles everything under
              `python/` and `app/` with `-OO` to a `.pyc` beside the source and
              deletes the source: **0 `.py` files in the build output**, 1211
              modules compiled, 0 that failed to compile and kept their source.
              `THIRD-PARTY-NOTICES.txt` names all 57 third-party packages in
              `uv.lock` with the licence each declares — zero undeclared — and
              distinguishes shipped from development-only from
              deliberately-excluded, which are different answers to different
              questions and were one wrong answer in the first draft.

              **Three things the ticket got wrong, each found by measuring.**

              *The stdlib trim is already done.* T-30 named tkinter, test,
              idlelib, turtle, ensurepip and pydoc_data. The python.org
              embeddable distribution ships **none of the first five**; its
              whole stdlib is a 4.1 MB zip of 563 members, and only
              `pydoc_data` (4 of them) is in there. Rewriting a stdlib zip to
              save kilobytes would trade a real risk for nothing.

              *Stripping comments is not a step.* §11c says comments must not
              ship and must not be deleted from the tree. A build that ships no
              source ships no comments, and this script only ever writes into
              `runtime/`, so a checkout keeps every comment it had. The
              requirement is satisfied by the `.pyc` step, not beside it.

              *Shipping bytecode does not save space — it costs 1.2 MB.* Even
              with docstrings stripped, the `.pyc` for this dependency set comes
              out slightly larger than the `.py` it replaces. What it buys is a
              build that ships no readable source. The manifest records it as a
              delta, not a saving, because it is not one.

              **MSIX is not a Tauri bundle target.** The ticket said
              "`tauri.conf.json:30` targets `nsis` today; add the MSIX target".
              `tauri-utils` 2.11's `BundleType` deserializer accepts exactly
              `deb`, `rpm`, `appimage`, `msi`, `nsis`, `app`, `dmg` — anything
              else is "unknown bundle target" and the build fails before it
              starts. So `"msix"` in that file is not a slower path to a
              package, it is a broken build.
              `tests/desktop/test_packaging.py` now asserts every configured
              target is one Tauri accepts, so the next person to try learns it
              in a second rather than on the VM.

              If MSIX is still wanted, it is a *second* step over the installer
              Tauri does produce (`makeappx` / the MSIX Packaging Tool), and it
              is worth asking first whether it is wanted at all: NSIS has an
              installer UI, which removes the premise T-25 was built on — that
              the location cannot be asked for at install time. T-25's answer
              is still the right one, it is simply no longer forced.

              **The trap the bytecode step set, and how it was caught.**
              Alembic finds revisions by matching `*.py` in `versions/`. A
              bytecode-only build therefore finds **zero revisions**, and
              `upgrade head` *succeeds* against an empty database — nothing
              errors until the first query. The fix is Alembic's `sourceless`
              mode, written into the **packaged** `alembic.ini` only: turned on
              in a checkout it also reads `versions/__pycache__`, and bytecode
              from a deleted migration returns as a phantom revision. That was
              tried first, and `a8764bd4120a_drift_check` — gone from the tree
              for who knows how long — came back as a second head and broke the
              migration tests on the spot. Both halves are now guarded:
              `check_sidecar_runtime.py` runs the migrations for real inside
              the packaged runtime and asserts the schema exists, and
              `tests/desktop/test_packaging.py` asserts the repository's
              `alembic.ini` leaves it off.

              **And one this script set for itself.** A compiled runtime cannot
              be rebuilt in place: `prune` strips `.pyc`, pip skips packages
              whose dist-info says they are installed, and the sources are
              gone — leaving *empty package directories* and
              `ImportError: cannot import name 'Field' from 'pydantic'
              (unknown location)`. The build now detects a compiled runtime and
              cleans first.

    ─────────── the ticket as written, for the reasoning ───────────

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

### T-33 · Two tenants, one document path  ·  *fix: each organization gets its own document folder on a host*
    Measured before it was fixed: two organizations, each with a company
    named the way the fixtures name them, both issued `ACME-BC07012026`, and
    one file was left on disk — the second tenant's PDF over the first's. The
    database was never wrong (`documents` is unique per organization); the
    folder was.

    The fix is the deployment shape the ticket asked for, not a path rewrite.
    `DOCUMENT_LAYOUT` is `per-organization` by default: `get_document_archive`
    — the single dependency all six call sites go through — returns the
    app's archive **scoped** to the organization the tenant middleware bound,
    so a host writes `<DOCUMENT_ROOT>/<org-id>/invoices/<year>/<ref>.pdf` and
    a rebuild in A repairs A's files only. The desktop sets it to `flat`: one
    organization, and `Documents\BillGen\invoices\` is where Henri wants
    her to find them. It is its own setting rather than a reading of
    `desktop_mode`, which also means "mint a credential-less account" and
    should not grow a third meaning.

    The registered path never carries the segment. What each tenant sees in
    `GET /documents` is the same relative path a desktop install writes, so a
    backup taken on a host restores onto a laptop, and the other way, with
    no translation — asserted.

    Evidence: `tests/api/test_documents_per_organization.py` (2) — the
    exact collision, two files; and a rebuild that cannot reach the other
    tenant's folder. `tests/desktop/test_bootstrap.py` asserts the desktop
    sets `flat`. 666 collected exit 0.

### T-28 · A backup that can be carried  ·  *feat: one file she can take off the laptop*
    `BackupService.export` already produced readable JSON, which is what Henri
    wants for everyday access and exactly what must not travel on a USB stick:
    it is every client's name, address and VAT number in one file. The plain
    export is untouched — the portable archive **wraps** it rather than
    replacing it, so a person who cannot run a restore can unzip the file, take
    `backup.json` out and hand it to the endpoint that already existed.

    `core/backup/sealed.py` is the format: an eight-byte magic, a plaintext
    JSON header, then AES-256-GCM over a zip. Three choices in it are load
    bearing and each is a test.

    **The header is readable on purpose.** A restore has to know it needs a
    passphrase before asking for one, and a person holding this file in three
    years has to be able to see what it is without the program that wrote it.
    Readable is not the same as authoritative: the header is the AAD, so
    editing the salt or dropping scrypt's cost to 2 produces a decryption
    failure rather than a cheaper file to attack.

    **The cost parameters travel in the file**, not in this module. Raising
    them later applies to new archives and orphans none of the old ones —
    asserted by sealing under deliberately cheap parameters and opening it.

    **A wrong passphrase and an altered file are one error.** AES-GCM cannot
    tell them apart, and a message that guessed would be a message that is
    sometimes wrong about whether a backup is intact.

    The documents travel too, which is what makes this the archive and the
    plain export only a register. Packing is the **one** legitimate read of the
    T-27 folder, and it is safe for the reason T-27 recorded hashes at all:
    every file is checked against the sha256 the register captured at issue,
    and bytes that no longer match are named in the manifest rather than
    carried under the original's name. On restore the bytes are written back
    driven by the restored register, never by the archive, so a file under a
    name the database has never heard of is not dropped into anyone's folder.

    **Two deviations, both deliberate.** The ticket said
    `GET /backup/export?encrypt=true`; a passphrase in a query string ends up
    in browser history, proxy logs and referrers, and this one opens every
    client record the organization has — so it is a POST with the passphrase
    in the body, and the archive comes back as the response. Restore likewise
    takes the file as the request body with the passphrase in a header
    (`POST /backup/restore/file`), sniffs the first eight bytes, and asks for a
    passphrase only when the archive says it needs one. The JSON
    `POST /backup/restore` is unchanged.

    The ticket's last line — "the UI says so before the first export rather
    than after" — is a screen, and screens are Henri's. What landed instead is
    the half that does not depend on one: `acknowledge_unrecoverable` must be
    true or the API refuses to produce the archive, and
    `GET /backup/passphrase-notice` serves the one wording every screen and
    every error should use. A promise a screen makes is a promise someone can
    edit; this is the API refusing to write a file nobody can open until the
    caller says they know that.

    Evidence: `tests/core/backup/test_sealed.py` (14) and
    `tests/api/test_backup_portable.py` (10) — right passphrase restores with
    the documents; wrong passphrase is a distinct 409 **and leaves the
    organization empty**, because decryption happens before anything touches
    the database; the plain export's rows are identical to the archive's
    member. 656 collected exit 0, `ruff check` clean.

    Found on the way and not fixed here: **T-33**, two tenants colliding on one
    document path. Measured, not reasoned — two organizations issued the same
    reference and one file was left on disk.

### T-27 · The documents leave the database  ·  *feat: an issued invoice leaves a file behind*
    The rule the whole ticket turns on is the one that is easiest to erode
    later, so it is stated in three places and asserted in one: **the folder is
    written and never read back**. `api/routers/documents.py` therefore has no
    download endpoint. An invoice is served by rendering it from the database,
    which means a person who tidies, renames or deletes inside the archive
    loses a copy and changes nothing legal —
    `test_deleting_the_file_changes_no_endpoint_answer` is that sentence as an
    assertion. The moment any endpoint answers from a file, somebody with a
    file manager is editing a VAT record.

    Three seams, one each in `core/`, `db/` and `api/`. `core/documents/` is
    the archive port — `write` and `exists`, no `read` — with a filesystem
    implementation that stages beside the target and `os.replace`s it, so a
    crash leaves the previous file or none, never half a PDF that hashes to
    something the register does not know. `core/models/document.py` is the row:
    kind, path, sha256, byte_size, and what it is *of*. `DocumentService` ties
    them together and holds the two rules that are not obvious from either.

    **Archiving never fails an issue.** The gapless number is burned inside
    `InvoiceService.issue`'s transaction; by the time anything renders, the
    invoice is legally issued and no missing browser may undo that. The issue
    route catches everything, logs `invoice.archive_failed`, and returns the
    invoice — `test_a_broken_pdf_engine_does_not_fail_an_issue`.

    **A document is rendered once.** An invoice that already has a *row* is
    never re-rendered, so a template edited next year cannot quietly restyle a
    document issued this one. `POST /documents/rebuild` — the one-shot for a
    history that predates this, and the repair for a deleted file — re-renders
    only what has no file at all, and counts a copy whose bytes came out
    different as `rehashed` rather than hiding it.

    The backup carries the register at schema 3, not the bytes; the bytes are
    T-28's, encrypted. A restore into an empty database lists the paths it
    cannot find in `missing_documents` and **completes**: the records are back,
    some copies are not, and failing on a folder it was never handed would be
    the wrong end of that trade.

    Where the folder is comes from outside `core/`: `DOCUMENT_ROOT`, which the
    desktop sets to `paths.app_data_dir()` so the documents live inside the
    directory T-25 moved out of the package container. **Unset is a working
    configuration** — archiving off, every endpoint unchanged, nothing on disk
    — which is what the test suite and a bare `uvicorn` get, and what a
    production start now warns about.

    Evidence: `tests/api/test_documents.py` (8) and
    `tests/core/documents/test_archive.py` (8); 620 collected, exit 0; migration
    `e2f7c9b41a55`; `ruff check` clean; the architecture document regenerated to
    102 endpoints across 25 routers. `create_app`'s 26 `include_router` lines
    became `_ROUTERS`, a tuple, because adding the 26th put the function over
    ruff's statement ceiling — the mount *order* is what matters and a tuple
    keeps it visible.

### T-22 · Emilia's license file  ·  *feat: the packaged build refuses to start unlicensed*
    Two halves of this were zero where the ticket assumed one line, and both
    are the same mistake: `desktop/licensing.py` was a **tested library nothing
    called**. `bootstrap.py` never invoked `check_license`, and `hardware_id`
    round-tripped through the signature without ever being compared to the
    machine running it. A licence check no caller reaches is a comment.

    `machine_fingerprint()` reads Windows' `MachineGuid` from
    `HKLM\SOFTWARE\Microsoft\Cryptography` — 64-bit view explicitly, because a
    32-bit interpreter is redirected to Wow6432Node and would read a *different*
    GUID, verifying under one build and not the other for a reason nothing in
    the error would name. It is SHA-256'd to 128 bits before it goes anywhere:
    the value ends up in a file that travels by email, and comparing two
    fingerprints is all the app ever needs. Grouped in fives when shown, so it
    can be read down a phone line. Not the MAC address — docking stations and
    VPN adapters move it — and not an IP.

    `bootstrap.enforce_license()` runs **before the migrations and before the
    port**: an unlicensed start should not touch her database. The strict policy
    comes from `is_packaged()` — the interpreter running from inside the runtime
    the installer carries, asserted by both `runtime/MANIFEST.json` and
    `sys.executable` — with `BILLGEN_REQUIRE_LICENSE` forcing it either way, to
    rehearse the packaged behaviour from a checkout and to start a rescue build.
    A refusal prints `BILLGEN_LICENSE error=…` on stderr and exits 2, because
    the Tauri side otherwise reports only "sidecar did not report a port".

    **It fails closed on its own build.** A packaged build with no
    `desktop/license_key.pub` cannot verify anything, so it refuses rather than
    letting the requirement become decorative; `check_sidecar_runtime.py` now
    asserts a real runtime ships the key and answers `True` to both halves of
    the policy, so a build that quietly lost it fails the checker instead of
    Emilia's laptop. A licence bound to a machine whose fingerprint cannot be
    read is refused for the same reason.

    `scripts/license_tool.py` is Henri's — `keygen` (which refuses a path inside
    the repository), `fingerprint`, `sign`, `inspect`. **The private key was not
    generated here**: it is his to create and back up, and until he runs
    `keygen` no packaged build will start, which is the correct state for a repo
    that has never held a signing key. [LICENSING.md](LICENSING.md) is the
    operational half — issuing, the three dead-laptop cases, and the portable
    licence (`--machine` omitted, short expiry) that keeps a stuck customer
    working without ever sending her the private key or a check-removed build.

    `done when` met, rehearsed end to end against a scratch key pair outside the
    tree: `python -m desktop.bootstrap` with `BILLGEN_REQUIRE_LICENSE=1` refuses
    with no licence and refuses one signed for another machine, naming both
    fingerprints, and starts with the right one. `tests/desktop/` is 40 tests —
    the machine comparison, the portable case, both fail-closed paths, the
    fingerprint's stability and opacity, and the policy switch.
    `test_tampered_payload_rejected` already covered the signature; a new
    sibling covers the obvious forgery this ticket invited, editing
    `hardware_id` to the machine in front of you.

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

    **Found 2026-09-11, while T-30 was being verified, and fixed the same day.**
    The render that had passed all day started failing with "exited cleanly
    and wrote no PDF", and it was not the build. On Windows 11 startup boost
    keeps a windowless `msedge.exe --no-startup-window` alive; while it lives,
    a headless launch hands the print job to it and returns in 0.1 s, and the
    PDF appears about a second later — written by a process the renderer
    never started, into a temp directory it had already deleted. The private
    `--user-data-dir` this ticket relied on does not stop the hand-off (nor
    does disabling the feature; every variant measured on Edge 152.0.4191.66
    behaved the same). The renderer now waits for the file after the launcher
    returns; the reproduction is in the suite and starts the background
    instance itself. On a customer laptop that instance is the normal state,
    so this would have been "PDFs do not work" on Emilia's machine and
    "works for me" on this one.

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
