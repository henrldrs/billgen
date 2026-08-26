# Next session — TODO

Written 2026-08-26 at the end of the entitlement session. Delete this file once
it is consumed; it is a handover note, not a permanent document. The permanent
map is [HANDOFF.md](../HANDOFF.md) and the board is
[ROADMAP_IA.md](ROADMAP_IA.md).

**State:** Python 298 passed, frontend 107 passed, ruff clean, four workspaces
typecheck. Last three commits: `5211609` (six screen-unblocking reads),
`3332a70` (B4 entitlement layer), `5991fa8` (Peppol counts documents).

---

## 0. The one-line summary

**The backend is roughly twenty endpoints ahead of the UI.** Two sessions of
server work landed and *not one screen reads any of it*. The highest-value work
next session is frontend, not more endpoints — with one exception, which is
item 1.

---

## 1. FIRST — push the repo (`BGEN-OPS-01`) · blocked on Henri

Still the only total-loss risk on the board. Everything else assumes work that
is backed up and continuously tested.

**Pre-push audit is done and the repo is clean:** no private keys, no
`sk_live`/`AKIA`/`ghp_`/Slack tokens in tracked content; `.gitignore` covers
`.env`, `*.pem`, `*.key`, `*.billgenlic`, `backups/`, `var/`, `*.db`; the three
tracked env files are all templates. 1,146 objects, 1.48 MiB.

GitHub account: **`henrldrs`**. `gh` is **not installed** on this machine, so
the repo cannot be created from a session. Either:

- **A.** Henri creates an empty **private** repo `billgen` (no README, no
  gitignore, no licence) and pastes the URL → next session adds the remote,
  pushes `main` + the phase tags, and watches CI.
- **B.** `winget install --id GitHub.cli`, then `gh auth login` (opens a
  browser, so Henri must run it) → next session does all of it.

**Expect the first CI run to be an experiment.** `.github/workflows/ci.yml` has
never executed. It needs no secrets beyond the built-in `GITHUB_TOKEN`, and it
runs the Python suite twice — SQLite **and Postgres**. That Postgres run is the
first real test of two things SQLite cannot prove:

- the gapless-numbering row lock (`.with_for_update()` in
  `db/repositories/sqlalchemy_repositories.py`), and
- **the new quota guard's lock** (`api/entitlements/service.quota_guard`),
  which is what stops two concurrent requests both creating the 50th invoice.

A red first run is information, not a regression.

---

## 2. The frontend backlog — every endpoint below exists and has a hook

Ordered by value. All of it is `@billgen/ui` panels plus routes in
`frontend-saas` (and, where it makes sense, `frontend-electron`).

### 2a. The entitlement UI (new, and it gates everything commercial)

- **Generic 402 handler in both shells.** `isEntitlementError(err)` is already
  exported from the ApiClient and the body is one uniform shape. Wire it once,
  at the React Query / mutation boundary, into an **upgrade modal** that reads
  `required_tier`, `feature` and `message` off the error. There must be **no
  per-feature payment logic anywhere in React** — that was the whole point of
  the 402 contract.
- **Usage meters** from `useEntitlements()` — "7 of 10 invoices this month".
  Free and Starter users should see the ceiling *before* they hit it.
- **Plan badges / disabled states** driven by `features` from the same hook.
  Remember this is UX only: the server refuses independently.
- **Pricing / upgrade screen** from `usePlans()` — the full matrix is served so
  there is no second copy to maintain in TypeScript.

### 2b. Screens for backend that has been sitting unused

| Screen | Endpoint(s) / hook | Note |
|---|---|---|
| **VAT report** | `useVatReport()` | The most valuable screen in the product and still screenless. Must render `covers: "output_vat_only"` honestly — sales only, not a filable return. Grade the view off `features.vat_report`. |
| **Company edit form** | `useUpdateCompany()`, `useCompanyValidation()` | Closes B3 on screen. Show per-field VAT/IBAN/BIC verdicts inline; `missing_for_peppol` tells the user what still blocks e-invoicing. |
| **Credit notes** | already fully wired | Cheapest feature on the board — the backend has been complete for months. |
| **Client 360** | `useClientStats()`, `useClientTimeline()` | Header numbers + commercial history. Note the timeline is **not** the audit log. |
| **Payments report** | `usePaymentsList()` | Cross-invoice listing with date window. |
| **Invoices report** | `useInvoiceReport()` | Counts/money per effective status + monthly series. Kill the browser-side aggregation. |
| **Duplicate button** | `useDuplicateInvoice()` | One button on invoice detail. |
| **VAT-rate + template pickers** | `useVatRates()`, `usePdfTemplates()` | `21/12/6/0` is still hardcoded in TypeScript. Delete it. |
| **Catalog Services / Archived** | `useProducts({status, billingType})` | Server filters now; stop fetching everything. |

### 2c. Layer-6 experience work

Untouched and blocks on nothing — see [ROADMAP_IA.md §7](ROADMAP_IA.md).
`.bg-panel` never got the premium pass `.bg-card` got; `ChartWrapper` and
`HelpBubble` exist and have never been rendered.

---

## 3. Open decisions — cheap now, expensive later

1. **Tier naming is final?** `free / starter / business / business_pro`, taken
   from Henri's `ENTITLEMENTS` dict. He said "yes" to keeping it, but the
   earlier message floated `organization` for the fourth. Renaming is trivial
   until a real subscription references the string.
2. **The Business Pro shell (decided in principle 2026-08-26, unbuilt).**
   Henri: *"the max plan is for someone who would have multiple users under
   their billing instead of individually paying each user a membership… the
   owner of billing can see the multi user frontend instead of a single user
   like the others."* So the top tier's differentiator is **an administration
   surface for the billing owner**, not a better VAT screen. Encoded as
   `team_administration: True` (Business Pro only) and
   `vat_report: "consolidated"`. **Nothing renders either.** Needs design:
   what does the billing owner see that a single-user account does not — seats,
   per-entity usage, consolidated reporting across companies, member
   management?
3. **Seats are declared and unenforced.** `Meter.SEATS` is in the matrix and
   reported on `/entitlements`, but nothing consumes it because there is no
   invite flow — and there cannot be one without **B1** (email). Signup always
   creates a *new* org, so today every org has exactly one member.
4. **Roles are modelled and unenforced.** `core/models/user.py` has
   `Role = owner | admin | member | viewer`, the JWT carries it, `api/deps.py`
   exposes `current_role` — and it is read in exactly one place (`/users/me`,
   to display it). **A `viewer` can void an invoice today.** When roles do get
   enforced they must also be gated: `roles_permissions` is Business+ in the
   matrix. Note `docs/ROADMAP_IA.md` §6.11 still claims `OrgMembership`
   "carries no role enum" — that line is **stale and wrong**; fix it.
5. **Downgrade / lapsed-subscription contract.** The code's behaviour is
   settled and tested (over-limit keeps every record, refuses only new
   creation). The *legal* treatment — retention after cancellation — belongs in
   the DPA before a cancellation flow is built.

---

## 4. Backend still open, in rough value order

- **B1 — email.** Highest fanout in the product: password reset, verification,
  send invoice, payment reminders (BE three-step escalation), team invites,
  support inbox. Unblocks item 3 above.
- **Checkout / Merchant-of-Record.** Deliberately deferred. The provider is an
  adapter that writes `SubscriptionRow`; `resolve_tier()` already prefers it
  over `Organization.plan_tier` when its status is active/trialing/past_due, so
  nothing else has to change.
- **B2 — blob storage.** All 7 Documents areas, company branding.
  `Company.logo_key` is a dangling reference *right now*.
- `GET /alerts` — server-side rules engine (overdue, clients missing VAT).
- `GET /search?q` — the palette navigates pages; it cannot find an invoice by
  number, which is what people actually reach for it to do.
- **Quotes** — own numbering series, must not touch the invoice sequence.
- Recurring invoices — `recurring_invoices` is Starter+ in the matrix and there
  is no model, no scheduler, no job runner behind it.
- Peppol **transport** (Access Point). The XML is Helger-validated and nothing
  transmits it.

---

## 5. Watch items from this session

- **`quota_guard`'s concurrency guarantee is unproven** until CI runs against
  Postgres (item 1). On SQLite `with_for_update()` is a no-op.
- **`PdfService(branded=...)` defaults to `True`.** A new call site that
  forgets to pass it shows a footer rather than silently giving away the paid
  feature. Keep that default if the constructor is ever refactored.
- **The invoice allowance is consumed at draft creation, not at issue** — a
  deliberate choice, because issuing is legally load-bearing and must never
  fail for a commercial reason. A deleted draft frees its slot.
- **`docs/ROADMAP_IA.md` §1 census** was updated for the none→partial moves
  (Client history, Payments) but **not** for the entitlement layer. Billing is
  still scored `0 wired / 0 partial / 8 none`; several of those are now
  partial. Re-score it.
