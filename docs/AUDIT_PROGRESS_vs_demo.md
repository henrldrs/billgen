# Audit → Beta: Progress Analysis vs. the Audited Demo

**What this is.** A scored, finding-by-finding comparison between the **April 2026
audit** of the shipped demo and the **current BillGen Beta** rebuild. It answers one
question: *how much of what the audit flagged has the rebuild actually closed?*

This is the companion to [COMPARISON_demo_vs_new.md](COMPARISON_demo_vs_new.md).
That doc is a neutral **code inventory** (what class/model/DTO lives where). This doc
is a **verdict-tracking** doc (what the audit demanded → where we stand now).

- **Audited demo** = `D:\CODING\audit-v2-react-exe` — the React 19 + TypeScript,
  **localStorage-only** app (Gen 2), plus the Electron "mom" portable it was built
  into. Same app the [COMPARISON](COMPARISON_demo_vs_new.md) calls *Gen 2 (shipped)*.
- **Beta** = this repo. A **ground-up 3-layer rebuild**, not an edit of the demo.
  So "progress" here means *how the rebuild answers each audit finding*, not a diff of
  one codebase against itself.

The audit was delivered in **three tracks**, and this analysis covers all three:

| Track | Where | Subject | Verdict at audit time |
|---|---|---|---|
| **A. SaaS / commercial** | `audit-v2-react-exe/00`–`15` | "Is it ready to sell as a signed `.exe`?" | **Do not launch.** Weighted **2.54 / 5 = 51%** |
| **B. Mom / private-use** | `audit-v2-react-exe/BETA VERSION/audit 29-4/*` | "Is it safe to hand to a non-technical family user?" | **OK to ship after rebuild** (3 blockers patched) |
| **C. Electron EXE** | `audit-v2-react-exe/BETA VERSION/*.exe` + `win-unpacked` | The portable the mom-track produced | Built, smoke-tested, localStorage-backed |

---

## 1. Headline

**The rebuild closed almost the entire *engineering, data-integrity, and
compliance-plumbing* half of the audit, and left the *commercial-launch* half
(monetization, legal docs, signing, telemetry, support) essentially untouched — by
design, because those are Phase 10+.**

Indicative re-score against the audit's own 12 categories and weights (this is a
*re-estimate from the HANDOFF + source*, **not** a re-run of the full audit):

| # | Category | Weight | Audit (demo) | Beta (est.) | Δ | Why it moved |
|---|---|---|:---:|:---:|:---:|---|
| 01 | Product | 10% | 4 | 4 | → | Credit notes, payments, multi-rate VAT **added**; agenda/reminders **dropped** |
| 02 | UX / UI | 8% | 4 | 3 | ▼ | Functional SaaS + desktop shells, but not yet at the demo's glassmorphism polish |
| 03 | Technical Architecture | 8% | 4 | 5 | ▲▲ | The big one: real 3-layer split, FastAPI backend, tenancy, OpenAPI-generated FE types |
| 04 | Code Quality | 8% | 3 | 4 | ▲ | **185 Python + 33 FE tests** (audit found *zero*); strict typing; layered |
| 05 | Security | 10% | 2 | 3 | ▲ | JWT+argon2id, tenant isolation **tested**, Ed25519 license verify, no secrets in storage; still no signing/activation |
| 06 | Privacy & Compliance | 12% | 3 | 4 | ▲ | Gapless numbering **enforced**, no hard-delete, UBL.BE + structured comm; EULA/accountant still absent |
| 07 | Performance | 4% | 4 | 4 | → | N/A rebuild; server-side render from stored `Decimal` |
| 08 | Reliability & Ops | 8% | 2 | 3 | ▲ | Real DB + Alembic migrations + append-only audit; no CI/auto-update/backup-UI yet |
| 09 | Analytics & Growth | 6% | 1 | 2 | ▲ | Dashboard KPIs now from **real data** (mock removed); still no product telemetry |
| 10 | Monetization | 10% | 0 | 1 | ~ | `SubscriptionRow` table exists; **no checkout, no pricing, no plan gating** (Phase 10) |
| 11 | Customer Support | 6% | 2 | 2 | → | No support inbox, no in-app help menu — unchanged |
| 12 | Legal & Launch | 10% | 2 | 2 | → | Desktop wrapper now exists, but **no EULA/privacy/entity/EV cert/signing** |
| | **Weighted total** | 100% | **2.54 (51%)** | **~3.17 (~63%)** | ▲ | Below the audit's **70%** launch line — *by the commercial gap, not the product* |

**Reading the number.** +12 points, and every point of the gain is in engineering /
compliance / architecture. The remaining ~7 points to the 70% launch threshold are
almost entirely in categories **10 / 11 / 12** (monetization, support, legal) — the
exact things the audit called "administrative scaffolding, not feature development,"
and the exact things this rebuild hasn't started.

---

## 2. Track A — SaaS commercial: the 15 top findings

The audit's rolled-up top-15 (`00_EXECUTIVE_SUMMARY.md §2`), each against today:

| # | Audit finding | Sev | Status in Beta | Evidence |
|---|---|:---:|:---:|---|
| 1 | **No `.exe` packaging** — runs via `npm run dev` only | Crit | **◑ Partly** | Tauri desktop shell exists and compiles clean (`frontend-electron/src-tauri`, phase-9b). **Not yet** a signed NSIS installer / PyInstaller-frozen sidecar — that's Phase 12. |
| 2 | **No EV code-signing cert** | Crit | **✗ Open** | Admin task, not started. |
| 3 | **No license enforcement** — anyone runs it free | Crit | **◑ Partly** | `desktop/licensing.py` does Ed25519 verify/sign; **no activation flow, no plan gating** yet. |
| 4 | **No EULA / privacy / withdrawal-rights / mentions légales** | Crit | **✗ Open** | Legal drafting, not started. |
| 5 | **No checkout / Merchant-of-Record** | Crit | **✗ Open** | Phase 10 not started. |
| 6 | **No legal-entity decision** | Crit | **✗ Open** | Admin, not in repo scope. |
| 7 | **Persistence is `localStorage`** — breaks across reinstalls, no real backup | High | **✔ Solved** | Real relational DB: SQLAlchemy → SQLite (desktop, `%APPDATA%\BillGen`) / Postgres (SaaS), Alembic migrations. |
| 8 | **Gapless numbering not enforced** — deletion breaks the Belgian VAT guarantee | High | **✔ Solved** | `SequenceRow` advanced under row lock in the invoice txn; **no hard delete** (correct via credit note); rollback rolls the counter back. |
| 9 | **Dashboard KPIs use mock data** (`dashboardMockData.ts`) | High | **✔ Solved** | `ReportingService` + `GET /reports`; `useKpi` / `useRevenue` read real invoices. Mock file gone. |
| 10 | **No telemetry / crash reporting** beyond a 50-entry local log | High | **✗ Open** | `structlog` server logs exist; **no PostHog/Sentry**, no product analytics pipeline. |
| 11 | **No public support inbox / in-app help** | High | **✗ Open** | Unchanged. |
| 12 | **No tests at all** — `lint` is `tsc --noEmit` | High | **✔ Solved** | **185 Python (1 skip) + 33 frontend** tests. Tenant isolation, numbering, VAT math, Peppol all covered. |
| 13 | Peppol UBL 2.1 / EN 16931 **structurally done** (positive) | Med+ | **✔ Improved** | Kept, and extended: per-line VAT categories, **multi-rate** `TaxSubtotal`, discounts, **UBL.BE** profile, structured comm, BTCC, pre-export validation gate. |
| 14 | Legacy Python build still has v1 Critical bugs | Med | **✔ N/A** | Legacy is reference-only; the whole path is superseded by the rebuild. |
| 15 | **No accountant sign-off** on the PDF templates | High | **✗ Open** | Unchanged. |

**Not in the top-15 but a structural leap the audit implied:** the demo had **no
backend and no multi-tenancy**. Beta now has a full FastAPI backend, JWT+argon2id
auth, and `ContextVar`-based org isolation that is *tested* to fail closed
(`tests/api/test_tenant_isolation.py`). That single change is what moved Architecture
4→5 and unblocks the SaaS story the demo could only aspire to.

### Scoreboard

- **Solved (5):** localStorage → DB, gapless numbering, mock dashboard, zero-tests,
  Peppol depth. Plus backend + multi-tenancy (net-new).
- **Partly (2):** `.exe` wrapper (exists, not signed/packaged), license (verify exists,
  no activation).
- **Open (6):** EV cert, EULA/legal, checkout, legal entity, telemetry, support,
  accountant — i.e. **the whole commercial layer**, exactly categories 10/11/12.

---

## 3. Track B — Mom / private-use: the blocker list

The mom-track (`PRIVATE_MOM_USE_AUDIT_REACT_V201.md` + `MOM_SHIP_AUDIT_2026-04-29.md`)
was mostly *patched in place on the demo* at audit time; the rebuild now resolves the
**root causes** the patches only worked around.

| ID | Mom finding | Demo fix (Apr 2026) | Beta root-cause status |
|---|---|---|---|
| C1 | Business data only in `localStorage` (loss risk) | Added JSON backup/restore in Settings | **✔ Solved at the root** — durable DB; desktop keeps its own SQLite in `%APPDATA%\BillGen`. |
| C2 | Dev server bound to `0.0.0.0` (LAN exposure) | Rebound to `127.0.0.1`; separate `dev:lan` | **✔ Moot** — desktop is a Tauri sidecar on localhost; SaaS is a deployed service with auth. |
| H1 | No full backup/import for recovery | Added Settings backup/restore | **◑ Import yes, backup no** — legacy **import** (preview→commit) exists; a **first-class DB backup/restore UI is still open**. |
| H2 | Google Fonts fetched from internet | Removed; system fonts | **✔ Not reintroduced** — no `fonts.googleapis` in the new front ends. |
| H3 | Python-SQLite vs React-localStorage duplicate models | Documented as separate | **✔ Solved** — one canonical `core` domain ↔ `db` rows; no dual model. |
| H4 | Error stack traces stored in `localStorage` | — | **✔ Solved** — errors go to server `structlog`, not browser storage. |
| H5 | PDFs/XML are loose downloads, not app-managed | Clarified wording | **◑ Same posture** — HistoryPanel has PDF/XML **download** buttons; app still doesn't file them into `Invoices/YYYY-MM/`. |
| M1 | Reset with no backup checkpoint | Backup-before-reset gate | **~ N/A** — no destructive "reset all" in the new shells; DB is the store. |
| M2 | "Load Mock Data" could overwrite real data | Hidden behind dev flag | **✔ Solved** — no mock-data loader in the product path. |
| M3 | History lacked re-export/edit actions | Added Reuse/PDF/XML/paid | **✔ Solved** — HistoryPanel has PDF + Peppol XML download; reuse via builder. |
| M4 | Developer-facing copy ("Local-First", "UBL", specs) | Softened | **~ Improved** — cleaner shells; a full mom-facing copy pass is not a Beta goal yet. |
| M5 | Base64 logos bloat `localStorage` | Warned on >2 MB | **✔ Solved** — `Company.logo_key` stores a reference, not inline base64. |

**Net:** every mom **Critical** is solved at the root; the two that remain "◑" (H1
full-backup UI, H5 managed PDF filing) are conveniences, not data-loss risks, now that
the store is a real DB.

---

## 4. Track C — the Electron EXE

The audited artifact `FinanceFlow-BillGen-Mom-Private.exe` was **Electron wrapping the
localStorage React app** — a private, unsigned portable with no backend.

Beta replaces it with a **different desktop architecture**: a **Tauri** shell
(`frontend-electron/src-tauri`, Rust) that spawns a **Python API sidecar**
(`python -m desktop.bootstrap`) over a local SQLite DB, with auto-login
(`POST /auth/desktop-bootstrap`, gated by `desktop_mode`). So the desktop app is now
the *same* API + domain code as the SaaS app, not a separate localStorage island.

| | Audited EXE (Electron) | Beta desktop (Tauri sidecar) |
|---|---|---|
| Shell | Electron (~84 MB portable) | Tauri (Rust) + Python sidecar |
| Data | browser `localStorage` | SQLite in `%APPDATA%\BillGen` |
| Backend | none | full FastAPI, in-process sidecar |
| Auth | none | singleton desktop bootstrap |
| Signed / packaged | no (portable) | **not yet** (Phase 12: NSIS + `signtool` + PyInstaller-freeze) |
| Status | built + smoke-tested | **compiles clean**; not yet packaged into an installer |

**Trade-off to flag:** the audited EXE was a *finished portable you could double-click*.
The Beta desktop is *architecturally far ahead* but **not yet a distributable installer**
— first run compiles Rust, and there's no frozen sidecar or signed bundle. Track-C is
"better foundation, not yet shippable artifact," and Phase 12 is what closes that.

---

## 5. What the rebuild dropped or still owes (honest debts)

Progress isn't only additions. Carried forward or newly-owed vs. the audited demo:

- **Agenda / VAT-reminder feature** — a whole surface in the demo (`AgendaEvent`,
  cadence reminders). **Not ported.** If mom relied on it, it's a regression.
- **UX polish** — the demo's Tailwind-v4 + Motion + glassmorphism look scored **UX 4**;
  the Beta shells are functional but plainer (est. **3**). A design pass is unfunded.
- **Helger / Access-Point validation of the XML** — still pending on *both* sides.
  Multi-rate + discount UBL is **new and unproven**; run it through
  peppol.helger.com before relabeling "draft" → "certified" (see HANDOFF §9).
- **Historical-invoice import** — the demo importer brought old invoices across; Beta
  **deliberately refuses** to (would mint live gapless numbers). Counted, not imported.
- **The entire commercial layer** — monetization (10), support (11), legal (12) — is
  where the demo scored 0/2/2 and Beta still scores ~1/2/2. This is the whole reason
  the weighted total is ~63% and not ~75%.

---

## 6. Bottom line

- The audit said the demo was *"a good product missing its commercial layer and
  sitting on fragile localStorage foundations."*
- The rebuild **rebuilt the foundations** (DB, tenancy, backend, tests, gapless
  numbering, real KPIs, deeper Peppol) and **has not yet built the commercial layer**
  (checkout, license activation, legal docs, signing, telemetry, support).
- So the verdict arrow moves from **"do not launch — foundations fragile AND commercial
  layer empty"** to **"foundations solid; still do not launch until the commercial
  layer is built."** Same *do-not-launch* headline, but for a completely different and
  much shallower reason — and everything that remains is Phase 10+ scaffolding, not
  product engineering.

*Estimates in §1 are a re-read, not a re-run of the formal audit. Re-score properly
once Phase 10–12 land.*
