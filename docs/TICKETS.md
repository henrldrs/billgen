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

*T-45…T-49 come from the UX review of 2026-09-15
(https://claude.ai/artifact/J5ZHGSoaL5yAcCjeea7SCZ), which Henri accepted the
same day: "all rest you start building". They sit above the launch tickets
because each is a defect a first beta user meets on day one.*

### T-48 · Navigation is a choice — two styles per platform
    branch    Design system / Henri   status  open
    needs     Henri's review of the prototypes in the UX review artifact
    why       Decided 2026-09-15: the guide offers the choice. Mobile: the orb
              or a bottom bar. Desktop: the drum or the top bar. Both read the
              same `ia.ts` tree; neither may be the only way in.
    do        `NavOrb`, `NavDrum`, `BottomBar` in `henrioutai-ui`, shown first in
              `/_preview`; a `navStyle` preference in `lib/preferences.ts`; a
              stop in `shell/tourSteps.ts` that offers it; top bar keeps T-44's
              narrow-screen rules as its fallback.
    done when Each style renders the same destinations as `links` in
              `ProductShell` (one test over all four); every style is operable by
              keyboard alone with `aria-current="page"` on the active node; the
              preference survives a reload.

### T-49 · Amounts set in a tabular sans, identifiers stay mono
    branch    Design system / Henri   status  open
    needs     Henri — changes the rule written in `fonts.css`
    why       Geist Mono gives `,` `.` and `€` a digit's width, so "€2,758.80"
              reads as terminal output. The two-face split stays (Henri,
              2026-09-15: deliberate); what changes is which face sets money.
    do        Bundle Geist (sans, OFL) beside Geist Mono; `.bg-num` → Geist 600
              with `tabular-nums`; a new identifier class keeps Geist Mono for
              IBAN, VAT number, invoice reference, structured communication.
    done when `tokens.test.ts` pins the amount face and the identifier face
              separately; a KPI value computes to Geist in the browser.

### T-38 · The installer is unsigned, and Windows says so
    branch    DevOps / Henri        status  open
    needs     BETA_LAUNCH_PLAN W1 (the registered entity)
    why       `.github/workflows/release.yml` produces an NSIS installer with
              no Authenticode signature, so SmartScreen greets every download
              with *"Windows protected your PC"* and an unverified publisher.
              For a **compliance product** that is the worst possible first
              impression: the one thing it sells is that it can be trusted with
              a fiscal record, and the first screen says the opposite.

              `distribution/README.md` tells the truth about the warning rather
              than pretending — which is the right thing to do and is not a
              fix. A person who has to be talked past a security warning has
              already been taught to click through security warnings.
    do        An OV or EV code-signing certificate in the registered company's
              name — EV clears SmartScreen reputation immediately, OV earns it
              over downloads. The certificate lives on a token or in a cloud
              signing service; GitHub Actions signs with it in the release
              workflow (`tauri.conf.json` has a `windows.signCommand` hook, or
              sign the NSIS output directly before the publish step).

              **The private key must never be a repository secret in plain
              form.** Azure Trusted Signing or a similar HSM-backed service is
              the shape to prefer: the workflow asks it to sign, and the key
              never exists where a workflow can print it.
    done when A freshly downloaded installer shows a named publisher instead of
              "Unknown", and `Get-AuthenticodeSignature` reports `Valid` on a
              machine that has never seen BillGen.

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

              **Two conditions the compliance check added (2026-09-11).**

              *Before the file moves:* one e-mail from her asking for the
              migration and saying the file holds her clients' details. She is
              the controller; that sentence is the instruction, and it is the
              whole basis needed. Work from a copy **outside** the repository
              — `docs/legacy/` is ignored as of `2b67dac`, because a git
              history outlives a deletion and this tree has a remote — and
              delete it when this closes.

              *Before she switches:* invoice count, last reference, totals and
              the next number issued all match the old app. **Nothing is
              decommissioned until all four do** — and if the history is not
              imported, she must keep the old export readable for the balance
              of the seven years, because the retention duty is hers and a
              migration does not discharge it. Brief Q7 is the accountant's
              half of this.

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

              **Profile registration, 2026-09-11** (*feat: the first run asks
              who is accepting*). Henri: the first run is the app's own
              configuration pass, not only his setup — it registers the
              profile. He was right, and the gap had teeth:
              `POST /auth/desktop-bootstrap` mints the local singleton as
              **"Local user" for "My Business"**, so a contract accepted
              through the wizard would have been signed by nobody, for
              nothing. A profile step now asks for both, and the server
              refuses to finish while either is still the placeholder.

              The e-mail is deliberately **not** asked for: it is the key
              `desktop_bootstrap` finds its singleton user by, and changing it
              would mint a second user and a second organization on the next
              launch — `test_renaming_the_organization_survives_the_next_bootstrap`
              is that trap, held open. The placeholder strings live in
              `core/services/onboarding_service.py` and the bootstrap imports
              them, so the refusal cannot drift from what the bootstrap
              writes; a test asserts the two still agree.

              **The settings half, and the tour, 2026-09-13** (*feat: the
              dashboard's cards, and the settings that keep what the first
              run says*; *feat: the desktop signs in, and the tour follows
              the first run*). Settings → Data & privacy is built
              (`DataPrivacyPanel`, on the beta surface): the folder
              `GET /onboarding` resolved and what each sub-folder holds,
              the art. 30 register with its retention column, what an
              erasure keeps, the subprocessors, every legal text with its
              acceptance state — acceptable from there with
              `source: settings` — and the way to the backups; the
              passphrase prompt before the first sealed export is in
              `BackupPanel` with the server's own sentence. The spec's step
              5 tour exists: six coach marks over the real shell, owed once
              when the wizard finishes, replayable from the account menu.
              And the desktop got the sign-in screen the walkthrough
              assumed: whose copy this is, on what plan, where the data is.

              Left, each named in the wizard's docstring: the feature
              toggles of the spec's step 3 (no `organization.modules`
              model), logo upload (B2), the sample-invoice extraction (no AI
              surface), the data-directory choice, which needs a restart
              story with the Tauri shell, and an "open folder" control,
              which needs a Tauri opener plugin the shell does not carry
              (the path can be copied meanwhile). The step order is T-37.
              And the texts: until `core/trust/legal.py` carries a drafted,
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

### T-39 · Secret scanning — the half of supply-chain hygiene CI lacks
    branch    Security              status  open
    needs     —
    why       The `audit` job in `.github/workflows/ci.yml` already runs
              `pip-audit` and `npm audit`, advisory by design (ADR-0004
              deviation, reasoned in the job's comment). **Nothing looks for a
              committed secret.** This repo is about to hold the reasons one
              would be committed: the licence signing key (T-22,
              `scripts/license_tool.py keygen`), a code-signing credential
              (T-38), mail provider keys (T-01). `.gitignore` covers `.env`;
              it does not cover a key pasted into a test or a script.

              **This one is a gate, not advisory.** The dependency audit is
              advisory because a CVE published upstream is unrelated to the
              change under test. A secret in the diff *is* the change under
              test — failing that build is exactly right.
    do        A `secrets` job in `ci.yml` running gitleaks over the pushed
              range, no `continue-on-error`. A `.gitleaks.toml` only if the
              first run needs an allowlist — each allowlisted path with a
              comment saying why it is not a secret (test fixtures, the
              public half of the licence key).

              Once, by hand: a **full-history** scan. Anything it finds is
              rotated, not merely deleted — a secret in history stays in
              every clone that already exists.
    done when A branch carrying a planted fake key fails CI on the `secrets`
              job; and a dated line in this ticket's Done entry records the
              full-history scan and what, if anything, was rotated.

### T-13 · Postgres row-level security
    branch    Security              status  open
    needs     T-05
    why       SEC-16. Tenancy is real and tested but enforced in the
              repository layer, so a raw query or a future service that
              bypasses it is stopped by nothing. Belt exists; this is braces.
    done when A deliberately raw cross-tenant query returns zero rows.

### T-40 · An external penetration test
    branch    Security / Henri      status  open — his to commission
    needs     T-05 (something to test), T-11, T-13
    why       Every security control in this repo was written and tested by
              the same hands. The tests prove the controls do what their
              author thought of; a pentest is the only check here on what the
              author did *not* think of. A T3 product — fiscal documents and
              the personal data of customers' customers — sold to people who
              cannot evaluate this themselves.

              This is the money the Vanta evaluation (Done, T-00g) redirected:
              a compliance platform proves controls are *documented*; a tester
              finds whether they *hold*.
    do        Not engineering. A scoped test of the hosted SaaS — auth,
              tenancy isolation, the invoice and document paths, the API
              surface as classified in MINIMAL_STACK B2. Commission it after
              hosting, CSP and RLS land, so the report is about the product
              being sold rather than about gaps already queued.
    done when A dated report from a named tester is in `docs/`, and every
              finding is either a ticket in this file or a written, signed
              acceptance of the risk.

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

              [LEGAL_REFERENCE_PACK.md](LEGAL_REFERENCE_PACK.md) (T-41) is
              comparison notes against Google's terms and two named
              competitors, gathered 2026-09-13 — not a draft, but a map of
              what shape other companies' documents take before counsel
              writes BillGen's own.
    done when `legal.undrafted()` returns fewer than seven, and each drafted
              document carries a version and an effective date.

### T-42 · The register names two US subprocessors and no transfer mechanism
    branch    Compliance            status  open
    needs     —
    why       `core/trust/personal_data.py:152` gives `Subprocessor` four
              fields — name, purpose, location, in_use — and none of them is
              the transfer basis. Two are live and both are American: GitHub
              (`location="United States"`) and Vercel
              (`location="United States / EU edge"`), and Vercel is not
              incidental — it hosts the pre-sale site **and its capture
              form**, so an e-mail address typed by a visitor today is a
              Chapter V transfer with nothing written down about what makes
              it lawful.

              `LEGAL_BRIEF.md` half-sees this: it says of the *planned*
              subprocessors that "plusieurs d'entre eux posent en réalité la
              question du mécanisme de transfert", then prints the two live
              ones in a table with a location column and no such question.
              None of Q1–Q8 asks counsel about transfers. So the one
              sentence that notices the problem is attached to the
              subprocessors that do not exist yet, and not to the two that
              do.

              This blocks `privacy` specifically, and blocks it by
              construction: `legal.py:93` requires the privacy policy to
              match the register "field for field", and art. 13(1)(f) wants
              the transfer and its safeguard named. A field the register
              does not carry is a sentence the policy cannot honestly write.
    do        A transfer basis on `Subprocessor` — adequacy decision, SCCs,
              derogation, or none-needed-because-EU — plus the safeguard's
              own reference where one applies. Fill it for GitHub and Vercel
              from **what their DPAs actually say**, not from what is
              assumed: this is the module that already warns its own list is
              "assembled from what the repository shows… Nothing here has
              been confirmed against a signed contract." Then add the
              transfer question to the brief's counsel questions, so the
              generated document asks about the live case rather than the
              planned one.
    done when Every `in_use=True` subprocessor outside the EU carries a named
              transfer basis, asserted in `tests/core/trust/test_registries.py`
              the way `test_planned_subprocessors_are_not_presented_as_live_ones`
              already guards the in_use split; and `LEGAL_BRIEF.md`
              regenerates with a counsel question about the mechanism.

### T-43 · The entity sells two things; the registry knows about one
    branch    Legal counsel / Henri status  open — waiting on Henri, not on code
    needs     T-16
    why       `core/trust/legal.py:3` opens with *"Seven documents decide
              whether BillGen can be sold to a business."* That is true of
              BillGen. It is not true of the legal person doing the selling.
              [BETA_LAUNCH_PLAN.md](BETA_LAUNCH_PLAN.md) settled the entity
              question at W2 — *"BillGen and henriOutai are noms commerciaux
              over one legal person"*, one invoice per client, from
              henriOutai — so the registry covers the software half of a
              business whose **other half invoices first**.

              Not hypothetical. W2 already carries two consultancy
              engagements: 2.1 (Emilia — consultancy scope and price), 2.3
              (mother — scope sheet and tariffs, tariffs done) and 2.4, her
              invoice, *drafted and held only until the BCE number exists*.
              None of the three has a contract in any registry, and
              `legal.undrafted()` cannot report a document it does not
              model — so the queue's own completeness check reads clean over
              a gap it was never given eyes for.

              The clause with the sharpest edge is the one the software
              documents have no reason to contain: a consultancy that walks
              people through Belgian administration needs **no guarantee of
              result before the administration**, in writing. A refused
              application or a missed deadline is the foreseeable case, not
              the exotic one. The nearest existing equivalent — the beta
              convention's *"absence de garantie de conformité fiscale"*
              (brief Q6) — disclaims the software's output, not a service
              rendered by a person.

              Source for the pack this came from: Henri's own legal/fiscal
              compilation of 2026-09-15 (§6.3), held outside this tree and
              deliberately not copied into it — it is mostly personal, and a
              git history outlives a deletion (the T-34 rule).
    do        The scoping decision first, because it decides where the rest
              goes: is the consultancy contract a document in
              `core/trust/legal.py` — which makes that module's opening
              sentence false and the seven eight — or is it out of scope,
              with the docstring saying so and naming what does track it?
              T-41 kept the registry to BillGen's own paperwork for the AI
              clause; the same reasoning points the same way here, but the
              consequence differs: an AI clause folded into `terms` still
              ends up drafted, whereas a consultancy contract ruled out of
              scope ends up tracked nowhere unless this ticket says where.

              Then the drafting itself, which is counsel's and belongs with
              T-16's engagement rather than beside it — object of the
              engagement, remuneration (forfait / hourly / per dossier is
              still undecided), confidentiality, limitation of liability and
              the no-guarantee-of-result clause above.
    done when The scoping decision is recorded where a cold session finds it
              — one line in `legal.py`'s docstring — and a consultancy
              contract is tracked somewhere with a `done when` of its own.
              The assertion that matters in the meantime: **W2's 2.4 invoice
              does not leave before a contract exists**, because an invoice
              is the first document that implies terms nobody wrote.

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

### T-37 · The first run asks before it tells  ·  *feat: the first run names the texts on the step that collects an identifier*
Closed by the ticket's own alternative, not its `do`: **the gate did not
move.** Reordering the steps is the product call the ticket reserves for
Henri; the compliance half needs no decision. The company step — the one that
collects a sole trader's KBO number, VAT number and IBAN — now carries a
notice under its hint that names every text the run will ask her to accept,
with their versions, and a "Read them first" control that opens the legal
step and comes back on Back. With nothing published (the registry's state
today) the notice says so and says where what she types stays. **Asserted in
the wizard test:** on the company step the sentence names "Terms of Service
v1.0"; the control lands on the legal step with its accept button; Back
returns; with no texts there is no control and the plain sentence. **Seen in
the browser** under NL on the desktop pair: "Nog geen tekst vereist uw
aanvaarding; wat u hier invult, blijft bij uw gegevens." under the company
hint. If Henri decides the texts should gate before the company step after
all, `STEP_KEYS` in `OnboardingWizard.tsx` is still the one line. 253
frontend tests.

### T-36 · The register describes a product we are not shipping  ·  *fix: the register names the deployment it describes, and the one dataset a desktop sends us*
`core/trust/personal_data.py` no longer states processor status as a fact of
the product: the `subject` comment and the `clients` note say **hosted →
processor, DPA required; desktop → the customer is the controller, BillGen is
a software supplier, DPA out of scope except for support** (Q6's backup sent
for a diagnosis). The `licensing` dataset joins the register — e-mail, plan,
hardware fingerprint, expiry; subject the customer; basis contract; retention
the life of the licence; erasure erase; source `desktop/licensing.py` — with
the note that on a desktop install it is the only dataset that reaches us.
The brief's generator carries the same split into its element 1 and Q5
("en mode hébergé" / "en version bureau"), and `LEGAL_BRIEF.md` is
regenerated and `--check` green. **Guards:** the register test cross-checks
the dataset's fields against `LicenseInfo`'s own — a field added to the
licence payload without a word in the register fails; a second asserts the
`clients` note names both deployments; the API test finds `licensing` under
`GET /trust/privacy/register` with its source. 41/41 in `tests/core/trust`
and `tests/api/test_trust.py`.

### T-50 · The content uses the screen the top bar already spans  ·  *feat: the content uses the screen the top bar already spans*
`lib/preferences.ts` gained `containerWidth: fluid | boxed`, fluid by default,
written as `data-bg-width` on `<html>` the way density is (a default sets no
attribute). Under fluid the `wide` column — lists, reports, the dashboard —
drops its 1400px cap and takes the bar's own inset as its inline padding, so
its edges sit under the bar's inner edges; boxed keeps the column as it was.
Forms and record pages take the `default` reading measure whichever is
chosen: `shell/contentWidth.ts` names the prefixes (the builder, an invoice
or client record, company, settings, billing, onboarding, legal, help) and
`ProductShell` picks the class per route — SOLO_RUN's parked item 10, one
class with two variants. Settings → Appearance offers Fluid / Boxed with a
hint that says which screens it moves. **Browser-measured at 1920px** on the
desktop pair: fluid, the dashboard's content edges at x=40 and 1865 against
the bar's inner content edges at 41 and 1864 (its outer edge is at 17);
boxed, the column is 1400px, from 253 to 1653. The preference survives a
reload (`lib/preferences.test.ts`), an unknown stored value falls back to
fluid, and the panel writes and clears the attribute
(`AppearancePanel.test.tsx`); `contentWidth.test.ts` pins which routes keep
the measure. 251 frontend tests.

### T-47 · The invoice sheet leads with the action its status calls for  ·  *feat: the invoice sheet leads with the action its status calls for*
The sheet's chrome carries the status beside the title — `DocumentSheet` grew
a `meta` slot, kept out of the heading so the dialog's accessible name stays
the reference — through `InvoiceStatusBadge`, one component the invoice list,
the receivables report and the sheet now share (the third copy of the overdue
rule was about to be written). The strip is two groups: what leaves the sheet
on the left (open, PDF, Peppol), and on the right the one primary action the
status calls for — Issue for a draft, Record payment for anything still owed,
nothing for a paid or voided invoice — with the corrections behind More:
Credit note, a separator, Void last in danger ink; a draft's Delete sits
there too. `Menu` gained `placement="above"` for a trigger at the foot of the
viewport, and its trigger now hears Escape — focus lands there after Shift+Tab
out of an open popup, and Escape did nothing; stopped at the trigger so the
sheet behind the menu does not close with it. **Tests:** an overdue invoice's
sheet has exactly one `.bg-button--primary`, "Record payment"; Void is absent
from the strip and from the DOM until More opens, then last, after the
separator, with the danger class; a draft leads with Issue and a paid invoice
leads with nothing; Escape on the focused, open trigger closes the popup and
keeps focus (in `TopNavPopups.test.tsx`, where the popups live). **Seen in the
browser** on the desktop pair under NL: "Te laat · 44 dagen" beside the
title; the exports group ends at x=659 and the decisions group starts at 820;
one primary, "Betaling registreren"; Meer opens upward (popup bottom 656 over
a trigger at 664) with Creditnota · — · Annuleren. 246 frontend tests.

### T-46 · The navigation speaks the interface language  ·  *feat: the navigation speaks the interface language*
`ia.ts` declares no labels any more: 131 string literals became messages keyed
`nav.<node key>`, and `navLabel(lang, key)` resolves them — the settings
children through the `settings.label.*` entries the rail already had, the
dashboard and settings sections through their titles, so no word exists twice.
The English `label` every consumer of the tree reads (the ledger, the roadmap
tables, the palette's keywords, the scaffold pages) is derived from the same
table at module load, which is why `ROADMAP_IA.md` did not move. The top bar,
its popups, the account menu, the palette's labels and section headers, the
breadcrumbs, the section tiles, the page titles and the status tabs all read
`navLabel`; the five status badges take a translated child through
`statusLabel`; the activity feed names its record kinds (`tEntity`); the
alerts card names fields (`tField`) and counts with both plural forms (`tn`
over `key.one` / `key.other`), and `dashboard.paidCount` gained its second
form. French and Dutch drafted without a native read — 117 nav names, 16
record kinds, 13 field names, 8 counted phrases — flagged in the file for
Henri. **Guards:** `ia.test.ts` fails on a literal `label: "` in `ia.ts`
and on any node that lacks a name in any of the four languages;
`navLanguage.test.tsx` mounts the real shell under `nl` and finds none of
the English section or status words in the bar, the tabs, or the badges;
the activity test finds no `document_template`; the alerts test finds
"2 críticos" and "Número de IVA" where "2 crítico" and `vat_number` were.
**Seen in the browser** on the desktop pair under NL: Dashboard · Verkoop ·
Klanten · Catalogus · Rapporten; "Verkoop › Facturen"; Concepten ·
Uitgegeven · Betaald · Deels betaald · Te laat · Geannuleerd; badges
"Concept", "Betaald", "Te laat · 44 dagen". Left English on purpose: the
scaffold kit's pages (dev builds only) and the design system's own
`STATUS_LABELS`, which every panel now overrides. 243 frontend tests.

### T-51 · The Overdue tab has always been empty  ·  *fix: the Overdue tab has something in it*
Found under T-45. `InvoiceStatus.OVERDUE` was a member nothing ever assigned:
`effective_status()` derived it for the reports, the KPIs and the alerts, but
`InvoiceService.list` handed `status=overdue` to the repository, which compared
the stored column and answered `[]` on every database there has ever been — so
the Overdue tab and the Receivables overdue report sat empty under a KPI that
said 2. The rule now lives on the model as `Invoice.effective_status(today)`;
the reporting function delegates to it; the service reads the issued and
partially paid rows for `status=overdue` and keeps the ones the calendar calls
late. **The stored statuses filter as stored** — an overdue invoice is still an
issued one, and "outstanding" (issued + partially paid) has to keep it — which
is the one place this closes differently from the ticket's `do`. The response
carries `effective_status` beside `status`, the split `QuoteResponse` already
makes and for the same reason; `GET /invoices` and `GET /invoices/{id}` take
`today`, as the quote reads do, so a test never depends on the clock. Both list
panels badge from the calendar, so the wire's "issued" never reaches the eye
on an overdue row. **Seen in the browser** on the desktop pair: the Overdue
tab lists OUT-KZ07012026 and OUT-BC07012026, "Te laat · 33 dagen" and "44
dagen"; the report screen shows the same two under "Achterstallig 2"; the API
answers one of them as of 2026-08-10 and both today. Two API tests, three
model tests; `openapi.json` and `api.d.ts` regenerated (the file is written
with `ensure_ascii=False` — the first regeneration escaped every § and — into
a 174-line diff for a one-field change).

### T-45 · The invoice list names who owes you, and by when  ·  *feat: the invoice list names who owes you, and by when*
Reference · Client · Date · Due · Total · Status. The client index is the
company's clients query, the shape `ReceivablesPanel` already used; a draft's
reference cell says "No number yet" instead of repeating its badge; overdue is
derived from the calendar by `lib/invoiceStatus.ts`, the screen-side twin of
`effective_status()` in the reporting service, and the badge carries its age.
The in-panel Status select is gone — the route's tabs were the filter. The
TOTAL header sat left over right-aligned money because `.bg-table th` at
(0,1,1) beat `.bg-table__th--num` at (0,1,0); the fix is the element in the
selector, in `henrioutai-ui`. **Measured in the browser** on the desktop pair:
the header computes `text-align: right`, its sort button ends 5px from the
header's right edge and starts 57px from its left; the two past-due invoices
read "Te laat · 33 dagen" and "Te laat · 44 dagen" under NL; no `<select>` on
the screen. 16 tests in `HistoryPanel.test.tsx` (two fixtures had a due date
that quietly went past — they now say "on time" relative to today), 5 in
`invoiceStatus.test.ts`. Found underneath it and filed: nothing stores
`overdue`, so the Overdue tab has always been empty — T-51.

### T-44 · On a phone, + was off the screen  ·  *fix: on a phone the create button is on the screen*
At 375px the top bar asked for 769: its action cluster never wrapped, so Search,
the bell, + and the account menu sat past the right edge — and + is the only
creator in the product. Narrow-screen rules in `henrioutai-ui/.../components.css`
give way in order of cost: the title (visually hidden, still the h1), the name
inside the company switcher, the theme switcher's words (gone entirely under
400px — it stays in Settings), the section links' icons. The language toggle
keeps its size on purpose. **Measured in the browser:** `scrollWidth` equals
the viewport at 375 and 320; + spans 229–273 at 320; the bar is 122px, not
172 (100 on a beta build, which renders no scaffold dots); desktop unchanged.

### T-41 · A reference pack for the seven documents, and the eighth the registry doesn't have  ·  2026-09-13
    The research half: [LEGAL_REFERENCE_PACK.md](LEGAL_REFERENCE_PACK.md)
    compares Google's Terms of Service and its separate Generative AI
    Prohibited Use Policy against Billit's and Moneybird's terms — named
    against `BETA_LAUNCH_PLAN.md`'s own competitor benchmark. It records what
    each competitor's liability cap looks like and, at Billit, what a
    competitor's terms leave out entirely (DPA, subprocessors, SLA, any AI
    clause) — the exact gaps T-16 must not repeat. Dexxter and Accountable
    did not yield a fetchable page this pass and are flagged for a second
    attempt when T-16 is actually drafted.

    The decision half, made rather than left open: AI-generated output stays
    disclosed **inside** `terms` rather than becoming an eighth
    `LegalDocument`. Google splits its Generative AI policy out because
    Gemini is used far outside any one product's terms; every BillGen AI
    surface today (`ai_transparency.py`) is narrow, human-confirmed and
    already carries its own Art. 50 marking, and lives entirely inside the
    product `terms` already covers. Recorded as a note on the `terms` entry
    in `core/trust/legal.py` rather than as prose in a new document — the
    registry still holds no legal text, only the shape of a claim.

    Evidence: `test_ai_usage_is_disclosed_inside_terms_not_a_separate_document`
    in `tests/core/trust/test_registries.py` — asserts no `ai_usage` document
    exists, the registry still counts seven, and the reasoning is on the
    `terms` note. `python scripts/generate_legal_brief.py --check` passes
    against the regenerated brief; 26/26 in `tests/core/trust/`.

### T-00g · Vanta — evaluated, not now  ·  2026-09-13
    Henri asked whether Vanta suits BillGen. It answers a different question:
    it collects evidence that controls are *documented*, for a SOC 2 or ISO
    27001 auditor, and finds no defects. At this stage it would cost
    ~€10–25k/yr plus a separate audit, report most controls N/A for a one-person
    org, and certify nothing of the regime that actually binds this product —
    GDPR as a processor, the Belgian e-invoicing mandate and Peppol
    conformance, seven-year retention, AI Act art. 50. SOC 2 is an American
    buyer's ask; the TPE market sends no questionnaires.
    **Revisit when** a buyer blocks a contract on ISO 27001 — then Vanta,
    Drata or Secureframe are interchangeable, Sprinto or Scytale cheaper for
    EU scope. **The money goes instead to:** a rehearsed restore (T-06, T-23),
    counsel for the DPA (T-16), secret scanning (T-39), a pentest (T-40).
    `docs/MINIMAL_STACK.md` remains the security posture document.

### T-35 · The GDPR panel on Client 360 gets its server  ·  *feat: a client is a data subject*
    The last scaffold on Client 360, and the one whose absence had a legal
    clock on it. `core/services/privacy_service.py` answers the two buttons
    the panel was drawn with and keeps the consent decisions `core/trust/
    consent.py` had shaped since it was written.

    **Where erasure stops is where the invoice starts.** The templates print
    the client's name, VAT number, address, postal code, city — and one of
    them the contact person — and Belgian law keeps an issued invoice seven
    years. Blanking any of those would change what `GET /invoices/{id}/pdf`
    renders for a legally frozen document. So erasure blanks email, phone and
    notes, keeps the rest, and the response names both lists with the
    register's reason. Asserted three ways: the invoice JSON, the re-rendered
    PDF and the T-27 file are byte-identical after an erasure. The audit
    entry records *which fields held a value*, never what they held — an
    audit trail that preserved the address it was erasing would be an
    erasure in name only.

    Export (`POST /clients/{id}/privacy/export`) is the client row, the
    invoices, credit notes, quotes and payments that name them, the activity
    about the record, and what the register says is retained regardless. A
    read shaped as a POST because handing a person's data over is an event
    worth an audit entry; every member may read a client, so every member
    may export one. Erasure declares `privacy.erase`, an admin permission:
    no undo, like voiding.

    Consent: `consent_records`, append-only — a change of mind is a new row
    and the newest is in force — behind `GET /consent` and `POST /consent`,
    normalised through the categories' defaults and refusing a category
    that does not exist. Retained on erasure, as the register says: proof a
    choice was made is the one thing an erasure must not destroy.

    The panel: `PrivacyBlock` in Client 360 — export saves the JSON through
    the app's download path; erase asks first, in words that say what stays
    and why, then tells the server. No scaffold banner remains on that
    screen under any exposure.

    Evidence: `tests/api/test_privacy.py` (5), the erase flow in
    `Client360Panel.test.tsx`; migration `b8d2f6a1c930`; 678 collected exit
    0, 202 frontend tests, ruff and typecheck clean.

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
