# Next session — TODO

Rewritten 2026-08-28 at the end of an unattended backend session; the previous
version was consumed. Delete it once this one is consumed too. It is a handover
note, not a permanent document. The permanent map is
[HANDOFF.md](../HANDOFF.md), the board is [ROADMAP_IA.md](ROADMAP_IA.md), and
the measured picture is
[ARCHITECTURE/system-architecture.html](ARCHITECTURE/system-architecture.html)
— **v0.10, generated against the previous session's HEAD and now one session
stale.** Regenerating it is on the list below.

**State:** Python **392** passed (was 298), frontend 157 passed, ruff clean,
typecheck clean. This session's commits are **all unpushed** — see §1.

Every new endpoint was also exercised live against the desktop dev pair on
:8010 (`python scripts/dev_desktop_api.py`), not only under pytest — alerts on
the seeded data, a quote created, sent, accepted and converted to a draft
invoice. That quote is still in `var/billgen.desktopdev.db` if you want
something to look at; that database is disposable and rebuilds itself.

**Your own `var/billgen.dev.db` needs a migration.** The desktop dev DB uses
`create_all` and picked the quote tables up on its own; the day-to-day one does
not:

```bash
python -m alembic upgrade head
```

---

## 0. The one-line summary

**The backend backlog is now the part that needs other people.** Everything on
the previous list that could be written without an SMTP server, an Access Point
contract or a payment provider has been written: roles are enforced, the VAT
rule is wired, search, alerts and the payments total exist, and quotes have
their own numbering series. What is left is B1 (email), transport, checkout and
blob storage — and a Postgres bug that would have failed the first CI run.

---

## 1. FIRST — push (`BGEN-OPS-01`) · one command, needs Henri

The remote now exists (`origin` → `github.com/henrldrs/billgen`, and `main` was
in sync with it at the start of this session — the previous note's "the repo has
no remote" is out of date). **Everything since `e893b59` is sitting unpushed on `main`** — eight commits that change behaviour, plus the documentation ones that describe them (`git log --oneline e893b59..HEAD`).

They were not pushed because pushing runs CI and publishes work Henri has not
read, and this session ran while he was asleep. It is one command:

```bash
git push origin main
```

**Two documents disagree about whether CI has ever run, and this session cannot
settle it.** The previous note and the header comment in
`.github/workflows/ci.yml` both say it has never executed; the deployment record
says the 2026-08-27 push ran it for the first time. `gh` is not installed here
and nothing local carries a run result, so **check the Actions tab first** — and
fix whichever of those two comments turns out to be stale.

It matters for §3. The Postgres leg runs the suite against a real Postgres, so
`create_all` runs there — and that is exactly what the duplicate constraint name
would have broken, at the first fixture, in every API test. If that leg has
already gone green, the reasoning in §3 is wrong and the rename is merely
tidier; if it went red, §3 is the likeliest reason.

That leg is also the first real test of the gapless-numbering row lock and of
`quota_guard`'s lock — both no-ops on SQLite.

---

## 2. What shipped 2026-08-28 (do not rebuild it)

The commits that changed something, each with its reasoning in its own message:

1. **Roles stop being decoration** (`api/authz/`). A `viewer` could void an
   invoice; every write endpoint was open to every member. Endpoints now declare
   a *permission*, never a role name — the sibling of `api/entitlements` and
   shaped like it. 403 and 402 stay apart, and the permission check is declared
   **before** the quota check so a viewer on a spent allowance is told the true
   thing. `/users/me` carries the permission list so the UI can hide the button;
   hiding is UX, the server refuses regardless.
2. **`GET /vat-treatment`.** `core/rules/vat.pick_category` had existed since the
   domain was written and no route called it, so every line shipped `category:
   "S"`. Intra-EU B2B (reverse charge, Article 51 §2 mention) and export outside
   the EU are now answerable. Advisory, not enforced — the caller knows things
   the data does not. Nothing downstream needed changing: the PDF context already
   derives mentions from line categories and the UBL builder already emits
   `TaxExemptionReason`.
3. **`GET /search?q`.** Invoices, quotes and credit notes by reference, clients
   by name/email/VAT, products by name/category. LIKE metacharacters are escaped
   — unescaped, a typed `%` returns the whole database.
4. **Three report endpoints.** `GET /reports/payments` — the total the payments
   screen deliberately refused to print; its period is the day the money
   *arrived*, so it and `/reports/invoices` legitimately disagree across a
   quarter boundary. `GET /reports/clients` — the table
   `/clients/{id}/stats` would be called once per row to build.
   `GET /reports/products` — volume and mix by invoice *line*, free-text lines
   included, deliberately carrying no share of any invoice-level discount, so
   it sums higher than net revenue and must not be shown beside it unlabelled.
5. **`GET /alerts`.** Four rules on the server: overdue (partial payments leave
   only the remainder), forgotten drafts, business clients with no VAT number,
   and the company's own identifiers. Codes and context dicts, no prose — the
   sentence is the frontend's. Stores nothing, schedules nothing.
6. **The Postgres constraint fix** — see §3.
7. **Quotes.** Own series (`Q-{prefix}{YYYY}/{NNNN}`, sequence scope `quote`),
   full state machine, derived expiry, and `convert` producing a **DRAFT**
   invoice so the gapless number is still consumed only by `issue()`. Wired into
   the authz matrix, the backup (schema_version 2, v1 files still restore) and
   search. Migration `165748c8c55f`; `alembic revision --autogenerate` reports no
   drift.
8. **Two guards found while reviewing the above.** A route-walking test that
   fails the suite if any new POST/PATCH/PUT/DELETE declares no permission —
   six exemptions, each with its reason written next to it. And a fix: the
   restore report counted quotes and then dropped them on the wire, because
   `RestoreReportResponse` had not grown the field.
9. **The gap ledger re-read.** Six `ia.ts` nodes claimed backend gaps this
   session closed — the exact failure mode the last note ended on. One of them,
   Client 360's "Risk flags", was half true: `GET /reports/clients` exists now
   but carries the money half and not the risk half, and the block says so.

---

## 3. The bug that was about to eat the first CI run

`invoices` and `credit_notes` each declare two unique constraints whose first
column is `organization_id`. The `uq` naming convention keys off the first
column only, so **both came out with the same name**:

    CONSTRAINT uq_invoices_organization_id UNIQUE (organization_id, company_id, reference),
    CONSTRAINT uq_invoices_organization_id UNIQUE (organization_id, company_id, sequence_global),

SQLite accepts that. PostgreSQL rejects the statement outright, so `create_all`
in the CI Postgres leg and the initial migration on the first Postgres
deployment would both have failed. Renamed in the models and in the initial
migration, which has only ever been applied to SQLite development databases
where the names are cosmetic.

**Not verified against a real Postgres** — `docker` is not installed on this
machine, so the evidence is the compiled DDL (`CreateTable(...).compile(dialect=
postgresql.dialect())`, which emits both constraints under one name), not a
failing run reproduced here. If the Actions tab shows the Postgres leg green
before 2026-08-28, this diagnosis is wrong and worth un-writing.

---

## 4. Open decisions — cheap now, expensive later

Carried over, minus the two this session settled (roles are now enforced; the
VAT category has a route). Still needing Henri:

1. **Approve or redraw the §11b nav cut for the remaining ten sections.**
   One reading, then a session of route work. Proposal ~100 entries → ~45.
2. **Tier naming final?** `free / starter / business / business_pro`.
3. **The Business Pro shell — decided in principle, unbuilt.** Needs design:
   seats, per-entity usage, consolidated reporting, member management.
4. **Seats are declared and unenforced.** `Meter.SEATS` is metered and visible;
   nothing consumes it, and there can be no invite flow without **B1**.
   *Related:* role enforcement now exists, but there is still no way to create a
   second user — so every organization is one owner, and the matrix is correct
   but unexercised in production.
5. **Graded features are presentation only — still undecided.** `vat_report`,
   `dashboard`, `search`, `pdf_customization`, `import_legacy`,
   `accountant_export` are read by the UI and refused by **no endpoint**. Anyone
   calling `GET /reports/vat` or the new `GET /search` directly gets the full
   thing on Free. `GET /search` was left ungated on purpose rather than by
   oversight; the note is in `api/routers/search.py`.
6. **Are quotes metered?** Shipped unmetered. `Meter.INVOICES` counts invoices,
   and billing someone for offers they did not win is a pricing decision, not a
   default. If quotes should have an allowance it is one line in the matrix plus
   a dependency on the create route.
7. **A quote PDF template.** The only entry still in `sales.quotes.missing`.
   It is wording (what a Belgian offer must say, in fr/nl/en), not code.
8. **Downgrade / lapsed-subscription contract.** Code behaviour is settled and
   tested. The legal treatment — retention after cancellation — belongs in the
   DPA before a cancellation flow is built.

---

## 5. Backend still open — everything left needs someone else

- **B1 — email.** Highest fan-out, and now the single biggest unblock: password
  reset, verification, sending an invoice, sending a *quote*, payment reminders,
  team invites, support inbox.
- **Peppol transport.** A procurement clock, not a coding task. See the previous
  note's §2: contact Access Point resellers, and you do not need to *be* one.
- **Checkout / Merchant-of-Record.** The provider is an adapter that writes
  `SubscriptionRow`; `resolve_tier()` already prefers it over
  `Organization.plan_tier`.
- **B2 — blob storage.** All 7 Documents areas, company branding, company
  documents. `Company.logo_key` is still a dangling reference.
- **Recurring invoices** — Starter+ in the matrix, with no model, scheduler or
  job runner behind it. The first thing here that needs a *runner*, not an
  endpoint.
- **Pro-forma invoices** — same shape as quotes and now much cheaper: the
  precedent for a second series that must not touch the invoice sequence is
  written, tested, and one migration old.

## 5b. Frontend work the backend just unblocked

Not backend, but this is where the value now is — four screens over endpoints
that exist:

- The alerts panel on the dashboard (`GET /alerts`).
- The ⌘K palette wired to `GET /search` (it still only navigates pages).
- A total on the payments report (`GET /reports/payments`), and the two report
  screens that now have endpoints behind them (`/reports/clients`,
  `/reports/products`).
- The whole quotes section (`sales.quotes`), which is now backend-complete.
- And the composer defaulting its VAT category from `GET /vat-treatment`,
  which is the one that changes what the product is legally capable of.

---

## 6. Watch items

- **`quota_guard`'s concurrency guarantee is unproven** until CI runs against
  Postgres (§1). On SQLite `with_for_update()` is a no-op.
- **The dev pair cannot produce a 402.** `scripts/dev_desktop_api.py` runs with
  `DESKTOP_MODE=true` and `_exempt()` skips every entitlement check. The fix is
  a second dev pair in non-desktop mode with an ordinary signup, not a change to
  `_exempt`. **The same flag does *not* hide the new 403s** — `api/authz` has no
  desktop exemption, because the desktop build bootstraps its single user as
  `owner`, which holds every permission.
- **`QuoteService.convert` spans two transactions.** The draft invoice is
  written by `InvoiceService`, then the quote is marked converted. If the second
  fails, the visible outcome is a draft beside a quote still reading `accepted`;
  the fix is to delete the draft and convert again.
- **`PdfService(branded=...)` defaults to `True`.** A call site that forgets it
  shows a footer rather than silently giving away the paid feature.
- **The invoice allowance is consumed at draft creation, not at issue** —
  deliberate. `POST /quotes/{id}/convert` creates a draft and is *unmetered*, so
  a signed offer is never refused for a commercial reason.
- **The architecture report is one session stale** (v0.10, previous HEAD). It
  will now under-report the backend by five endpoints and a whole aggregate.
- **This document's own failure mode.** A gap ledger is only as true as its last
  reading, and nothing re-reads it automatically. `ia.ts` was re-read on
  2026-08-28; `docs/ARCHITECTURE/` was not.
