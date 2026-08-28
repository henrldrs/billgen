# BillGen Professional Audit — audit-003

**Overall risk: RED**

- Target: `BillGen BETA` at `fee420e06e4713376a1f018bfe7ee695f78faf2f` (working tree dirty)
- Branch: `audit-engine-and-scaffolds`
- Run: 2026-08-28T16:31:37+00:00 → 2026-08-28T16:34:35+00:00
- Findings: 20

## Scorecard

| Domain | Score | Findings |
|---|---|---|
| Legal/VAT | n/a — | 5 |
| Accounting | 100/100 ██████████ | 0 |
| GDPR | 56/100 ██████ | 3 |
| Architecture | 95/100 ██████████ | 2 |
| Security | 41/100 ████ | 5 |
| Document Engine | 100/100 ██████████ | 0 |
| Peppol Readiness | 87/100 █████████ | 3 |
| Performance | n/a — | 0 |
| Resilience | 94/100 █████████ | 1 |

> **Legal/VAT — n/a.** The scanner reported it could not reach a conclusion here. Any findings listed are items to confirm, not defects found.

> **Performance — n/a.** No deterministic scanner covers this domain. Spec §8.6 requires an authorized environment and a load generator; running one is a human decision, so this scores n/a rather than 100.

## Not assessed

Absence of evidence is not evidence of compliance (§1). Nothing below was checked, and none of it is scored as passing.

- Belgian VAT / e-invoicing: 7 rule(s) (BE-EINV-001, BE-EINV-002, BE-VAT-001, BE-VAT-002, BE-VAT-003, BE-VAT-004, BE-VAT-005) have implementation code present but unverified. A pattern match is not a legal conclusion (§1, §5), so this domain is not scored. Run the legal-vat agent over evidence/legal-rules.json to close them.
- Known vulnerabilities (§8.3): this engine performs no network lookup, so no advisory database was consulted. Run the ecosystem's own advisory scanner and attach its output as evidence.
- Error detection (§8.8): no error-tracking integration was found in the tree. If one is configured at the platform level instead, attach that configuration as evidence.
- Dynamic testing (§8.6 performance, §8.5 restore drill, §8.2 live cross-tenant probe): not run. These mutate or load a running system and require --authorize-dynamic against an environment you are permitted to test. Performance therefore scores n/a, not 100.

## Systemic findings (§9)

### [SYS-DATA-LIFECYCLE] Data lifecycle — retention, erasure and recovery — 3 findings from 2 agents describe one mechanism

**CRITICAL** · confidence 0.75

```
Raised independently by architecture, gdpr:
  - [GDPR-002] No endpoint implements data-subject export (HIGH)
  - [GDPR-003] No endpoint implements data-subject deletion (HIGH)
  - [RES-001] No recovery time or recovery point objective is documented (MEDIUM)
```

Each finding is individually survivable; together they describe a mechanism with no compensating control. §9: the correlated severity is higher than any single part, because a fix to one part leaves the failure mode intact.

*Recommendation:* Treat as one piece of work with one owner. Fixing these separately across agents' recommendations tends to produce partial coverage that reads as done.

## Findings

### HIGH (8)

#### `GDPR-001` 7 required privacy document(s) not present in the repository

- **Severity** HIGH · **Confidence** 0.95 · **Type** recommendation · **Agent** gdpr
- **Location** `docs`

**Evidence.** Not found: cookie_policy, dpa, incident_response, privacy_policy, retention_policy, security_policy, subprocessors

**Impact.** §7 expects a controller to be able to show its processing record, retention periods, subprocessors and breach procedure. None of these can be audited from code alone, and their absence here is a gap in the audit, not a pass.

**Recommendation.** Keep these in the repository beside the code they describe, so §7.2's code-vs-policy comparison has two sides to compare.

**Verify.** Re-run; the missing list should shrink.

**Sources.** Spec §7.1 data inventory questions · Spec §7.2 code-vs-policy consistency

#### `ARCH-AUTHZ-004` POST /invoices/preview declares no permission

- **Severity** HIGH · **Confidence** 0.85 · **Type** security_best_practice · **Agent** architecture
- **Location** `api/routers/invoices.py:64`

**Evidence.** preview authenticates, but no permission dependency appears among ['InvoicePreviewRequest'].

**Impact.** Authentication is not authorization. Any signed-in member of any role can perform this write.

**Recommendation.** Declare the permission this write requires, so the role matrix governs it rather than the absence of a check.

**Verify.** Authenticate as the lowest-privilege role and call POST /invoices/preview; expect 403.

#### `GDPR-002` No endpoint implements data-subject export

- **Severity** HIGH · **Confidence** 0.75 · **Type** recommendation · **Agent** gdpr
- **Location** `api/routers`

**Evidence.** No registered route matched the export pattern across 84 endpoints.

**Impact.** A data-subject request must be satisfiable within a statutory deadline. Without an endpoint it is a manual database operation, which does not scale and is not logged.

**Recommendation.** Implement export as an audited, tenant-scoped operation.

**Verify.** Exercise the export flow end to end for one user.

#### `GDPR-003` No endpoint implements data-subject deletion

- **Severity** HIGH · **Confidence** 0.75 · **Type** recommendation · **Agent** gdpr
- **Location** `api/routers`

**Evidence.** No registered route matched the deletion pattern across 84 endpoints.

**Impact.** A data-subject request must be satisfiable within a statutory deadline. Without an endpoint it is a manual database operation, which does not scale and is not logged.

**Recommendation.** Implement deletion as an audited, tenant-scoped operation.

**Verify.** Exercise the deletion flow end to end for one user.

#### `ARCH-PUBWRITE-001` POST /auth/desktop-bootstrap is a write reachable without authentication

- **Severity** HIGH · **Confidence** 0.70 · **Type** security_best_practice · **Agent** architecture
- **Location** `api/routers/desktop.py:12`

**Evidence.** The auth middleware (api/middleware/tenant.py) exempts this path via its public allowlist ['/', '/auth/', '/docs', '/healthz', '/openapi.json', '/readyz', '/redoc'], and desktop_bootstrap accepts POST.

**Impact.** An unauthenticated caller can invoke a state-changing endpoint. Whether that is intended depends on the endpoint; login and signup are, most others are not.

**Recommendation.** Confirm each allowlisted write is deliberately public, and that it is rate-limited and does not accept a tenant identifier from the caller.

**Verify.** Call POST /auth/desktop-bootstrap with no Authorization header and confirm the response is the intended public behaviour.

#### `ARCH-PUBWRITE-002` POST /auth/logout is a write reachable without authentication

- **Severity** HIGH · **Confidence** 0.70 · **Type** security_best_practice · **Agent** architecture
- **Location** `api/routers/auth.py:71`

**Evidence.** The auth middleware (api/middleware/tenant.py) exempts this path via its public allowlist ['/', '/auth/', '/docs', '/healthz', '/openapi.json', '/readyz', '/redoc'], and logout accepts POST.

**Impact.** An unauthenticated caller can invoke a state-changing endpoint. Whether that is intended depends on the endpoint; login and signup are, most others are not.

**Recommendation.** Confirm each allowlisted write is deliberately public, and that it is rate-limited and does not accept a tenant identifier from the caller.

**Verify.** Call POST /auth/logout with no Authorization header and confirm the response is the intended public behaviour.

#### `ARCH-PUBWRITE-003` POST /auth/signup is a write reachable without authentication

- **Severity** HIGH · **Confidence** 0.70 · **Type** security_best_practice · **Agent** architecture
- **Location** `api/routers/auth.py:29`

**Evidence.** The auth middleware (api/middleware/tenant.py) exempts this path via its public allowlist ['/', '/auth/', '/docs', '/healthz', '/openapi.json', '/readyz', '/redoc'], and signup accepts POST.

**Impact.** An unauthenticated caller can invoke a state-changing endpoint. Whether that is intended depends on the endpoint; login and signup are, most others are not.

**Recommendation.** Confirm each allowlisted write is deliberately public, and that it is rate-limited and does not accept a tenant identifier from the caller.

**Verify.** Call POST /auth/signup with no Authorization header and confirm the response is the intended public behaviour.

#### `EINV-001` Structured invoices are generated but no transmission path exists

- **Severity** HIGH · **Confidence** 0.70 · **Type** recommendation · **Agent** legal-vat
- **Location** `core/einvoicing`

**Evidence.** core/einvoicing builds structured documents and validates them, but no send/transmit/access-point code was found.

**Impact.** §5.3 requires generation and delivery to be distinct states. With no transmission, a customer who believes the product files their e-invoices is mistaken, and the obligation is unmet with no error to signal it.

**Recommendation.** Model delivery as its own state with its own failures, and never let a generated document display as sent.

**Verify.** Generate an e-invoice and assert its status is not 'sent' until an access point acknowledges it.


### MEDIUM (3)

#### `RES-001` No recovery time or recovery point objective is documented

- **Severity** MEDIUM · **Confidence** 0.90 · **Type** recommendation · **Agent** architecture
- **Location** `docs`

**Evidence.** No RTO/RPO statement was found in any document in the tree.

**Impact.** §8.5 requires the objectives to be established first and the architecture compared against them. Without a stated RTO, no resilience investment can be shown to be sufficient — or shown to be excessive, which for an early-stage product is the more common and more expensive error.

**Recommendation.** State the acceptable downtime and acceptable data loss, then compare backup frequency against the RPO. Do not add replication until the RTO demands it.

**Verify.** Point to the document stating RTO and RPO.

#### `ARCH-PUBLIC-001` Auth middleware exempts the whole '/auth/' prefix

- **Severity** MEDIUM · **Confidence** 0.80 · **Type** security_best_practice · **Agent** architecture
- **Location** `api/middleware/tenant.py`

**Evidence.** The public allowlist in api/middleware/tenant.py exempts every path beginning '/auth/', not a fixed set of paths. Any route added under that prefix later is unauthenticated by default, with no code change to review.

**Impact.** A future endpoint under this prefix ships without authentication and nothing in the diff says so.

**Recommendation.** Enumerate the public paths exactly, so adding a public route is a visible edit to the allowlist.

**Verify.** Add a test asserting every registered route under '/auth/' is intentionally public.

#### `OBS-001` No request or correlation identifier is threaded through logs

- **Severity** MEDIUM · **Confidence** 0.75 · **Type** recommendation · **Agent** architecture
- **Location** `api`

**Evidence.** No correlation/request/trace id marker was found.

**Impact.** §8.8 asks whether the team can distinguish a customer-specific failure from a global outage. Without a per-request id, one user's failing invoice cannot be traced across the API, the PDF renderer and the delivery attempt.

**Recommendation.** Generate an id per request and log it at every layer.

**Verify.** Trigger one failure and retrieve every log line for it by id.


### INFORMATIONAL (8)

#### `ARCH-DOC-001` 7 endpoint(s) documented in system-architecture.html do not exist in the router tree

- **Severity** INFORMATIONAL · **Confidence** 0.30 · **Type** recommendation · **Agent** architecture
- **Location** `docs/ARCHITECTURE/system-architecture.html`

**Evidence.** The document names these, and no registered route matches after parameter normalisation: DELETE /auth/sessions, GET /reports/export, POST /auth/password, POST /email/test, POST /invoices/{}/send, POST /privacy/delete-account, POST /privacy/export

**Impact.** These appear only in prose, not in the generated inventory, so most will be deliberate gap mentions rather than false claims. Each still deserves one human glance: a route named with the wrong path reads exactly the same as a route that does not exist yet.

**Recommendation.** Either mark each as planned rather than built, or delete it. A document that mixes both without saying which is which cannot be used for either purpose.

**Verify.** Re-run this audit; documented_but_absent should be empty or explicitly annotated as planned.

#### `LEGAL-BE-EINV-001-C` Confirm structured e-invoice generation is visible — needs legal confirmation

- **Severity** INFORMATIONAL · **Confidence** 0.20 · **Type** assumption · **Agent** legal-vat
- **Location** `api/entitlements/__init__.py`

**Evidence.** Code matching this rule's signal exists in 183 place(s), e.g. api/entitlements/__init__.py, api/entitlements/deps.py, api/entitlements/matrix.py, api/entitlements/usage.py. A pattern match shows the topic is addressed somewhere; it does not show the rule is met. Only a reading of the implementation against the source can conclude that.

**Impact.** Until confirmed, this requirement is unverified. It is not a finding and it is not a pass.

**Recommendation.** Have the legal agent read these files against https://finances.belgium.be/fr/entreprises/tva/facturation/facturation-electronique and record the conclusion.

**Verify.** Generate a structured invoice and validate it against the format's business-rule set.

**Sources.** https://finances.belgium.be/fr/entreprises/tva/facturation/facturation-electronique · rules/belgium-e-invoicing.json :: BE-EINV-001

#### `LEGAL-BE-EINV-002-C` Confirm participant identifier handling is visible — needs legal confirmation

- **Severity** INFORMATIONAL · **Confidence** 0.20 · **Type** assumption · **Agent** legal-vat
- **Location** `core/einvoicing/ubl_builder.py`

**Evidence.** Code matching this rule's signal exists in 24 place(s), e.g. core/einvoicing/ubl_builder.py, core/einvoicing/ubl_validator.py, core/rules/belgian_peppol.py, tests/core/rules/test_identifiers.py. A pattern match shows the topic is addressed somewhere; it does not show the rule is met. Only a reading of the implementation against the source can conclude that.

**Impact.** Until confirmed, this requirement is unverified. It is not a finding and it is not a pass.

**Recommendation.** Have the legal agent read these files against https://docs.peppol.eu/poacc/billing/3.0/ and record the conclusion.

**Verify.** Attempt delivery to an unregistered recipient; expect a clear pre-issue failure.

**Sources.** https://docs.peppol.eu/poacc/billing/3.0/ · rules/belgium-e-invoicing.json :: BE-EINV-002

#### `LEGAL-BE-VAT-001-C` Mandatory invoice mentions are not visibly validated — needs legal confirmation

- **Severity** INFORMATIONAL · **Confidence** 0.20 · **Type** assumption · **Agent** legal-vat
- **Location** `core/einvoicing/__init__.py`

**Evidence.** Code matching this rule's signal exists in 18 place(s), e.g. core/einvoicing/__init__.py, core/einvoicing/ubl_validator.py, core/pdf/context.py, core/rules/__init__.py. A pattern match shows the topic is addressed somewhere; it does not show the rule is met. Only a reading of the implementation against the source can conclude that.

**Impact.** Until confirmed, this requirement is unverified. It is not a finding and it is not a pass.

**Recommendation.** Have the legal agent read these files against https://finances.belgium.be/fr/entreprises/tva/facturation and record the conclusion.

**Verify.** Issue an invoice with the VAT number removed; expect refusal.

**Sources.** https://finances.belgium.be/fr/entreprises/tva/facturation · rules/belgium-vat.json :: BE-VAT-001

#### `LEGAL-BE-VAT-002-C` Confirm gapless sequential numbering mechanism is visible — needs legal confirmation

- **Severity** INFORMATIONAL · **Confidence** 0.20 · **Type** assumption · **Agent** legal-vat
- **Location** `api/entitlements/service.py`

**Evidence.** Code matching this rule's signal exists in 234 place(s), e.g. api/entitlements/service.py, api/routers/backup.py, api/routers/expenses.py, api/routers/invoices.py. A pattern match shows the topic is addressed somewhere; it does not show the rule is met. Only a reading of the implementation against the source can conclude that.

**Impact.** Until confirmed, this requirement is unverified. It is not a finding and it is not a pass.

**Recommendation.** Have the legal agent read these files against https://finances.belgium.be/fr/entreprises/tva/facturation and record the conclusion.

**Verify.** Issue invoices concurrently and assert a contiguous series with no duplicates.

**Sources.** https://finances.belgium.be/fr/entreprises/tva/facturation · rules/belgium-vat.json :: BE-VAT-002

#### `LEGAL-BE-VAT-003-C` Credit notes do not visibly reference the corrected invoice — needs legal confirmation

- **Severity** INFORMATIONAL · **Confidence** 0.20 · **Type** assumption · **Agent** legal-vat
- **Location** `core/pdf/context.py`

**Evidence.** Code matching this rule's signal exists in 10 place(s), e.g. core/pdf/context.py, core/services/pdf_service.py, db/migrations/versions/3d8a27f7f865_initial_schema.py, db/repositories/mappers.py. A pattern match shows the topic is addressed somewhere; it does not show the rule is met. Only a reading of the implementation against the source can conclude that.

**Impact.** Until confirmed, this requirement is unverified. It is not a finding and it is not a pass.

**Recommendation.** Have the legal agent read these files against https://finances.belgium.be/fr/entreprises/tva/facturation and record the conclusion.

**Verify.** Attempt to create a credit note with no original invoice; expect refusal.

**Sources.** https://finances.belgium.be/fr/entreprises/tva/facturation · rules/belgium-vat.json :: BE-VAT-003

#### `LEGAL-BE-VAT-004-C` Confirm VAT identification number validation is visible — needs legal confirmation

- **Severity** INFORMATIONAL · **Confidence** 0.20 · **Type** assumption · **Agent** legal-vat
- **Location** `core/services/company_validation.py`

**Evidence.** Code matching this rule's signal exists in 6 place(s), e.g. core/services/company_validation.py, core/tva/classification.py, core/tva/validation.py, tests/core/services/conftest.py. A pattern match shows the topic is addressed somewhere; it does not show the rule is met. Only a reading of the implementation against the source can conclude that.

**Impact.** Until confirmed, this requirement is unverified. It is not a finding and it is not a pass.

**Recommendation.** Have the legal agent read these files against https://ec.europa.eu/taxation_customs/vies/ and record the conclusion.

**Verify.** Enter a number failing the modulo-97 check; expect rejection.

**Sources.** https://ec.europa.eu/taxation_customs/vies/ · rules/belgium-vat.json :: BE-VAT-004

#### `LEGAL-BE-VAT-005-C` Confirm retention period is enforced or documented for issued documents — needs legal confirmation

- **Severity** INFORMATIONAL · **Confidence** 0.20 · **Type** assumption · **Agent** legal-vat
- **Location** `.claude/commands/audit.md`

**Evidence.** Code matching this rule's signal exists in 14 place(s), e.g. .claude/commands/audit.md, docs/ARCHITECTURE/ADR-0002-invoice-lifecycle.md, docs/CORE_FEATURES_AND_DATA_INTERACTIONS.md, docs/NEXT_SESSION.md. A pattern match shows the topic is addressed somewhere; it does not show the rule is met. Only a reading of the implementation against the source can conclude that.

**Impact.** Until confirmed, this requirement is unverified. It is not a finding and it is not a pass.

**Recommendation.** Have the legal agent read these files against https://finances.belgium.be/fr/entreprises/tva/declaration-tva/conservation-des-documents and record the conclusion.

**Verify.** Run an erasure request against a customer with issued invoices; assert the invoices survive and are pseudonymised only where lawful.

**Sources.** https://finances.belgium.be/fr/entreprises/tva/declaration-tva/conservation-des-documents · rules/belgium-vat.json :: BE-VAT-005


## Roadmap (§15)

**P0 — must fix — high-confidence critical** (1)

- `SYS-DATA-LIFECYCLE` Data lifecycle — retention, erasure and recovery — 3 findings from 2 agents describe one mechanism — CRITICAL, confidence 0.75

**P1 — before professional launch** (8)

- `GDPR-001` 7 required privacy document(s) not present in the repository — HIGH, confidence 0.95
- `ARCH-AUTHZ-004` POST /invoices/preview declares no permission — HIGH, confidence 0.85
- `GDPR-002` No endpoint implements data-subject export — HIGH, confidence 0.75
- `GDPR-003` No endpoint implements data-subject deletion — HIGH, confidence 0.75
- `ARCH-PUBWRITE-001` POST /auth/desktop-bootstrap is a write reachable without authentication — HIGH, confidence 0.70
- `ARCH-PUBWRITE-002` POST /auth/logout is a write reachable without authentication — HIGH, confidence 0.70
- `ARCH-PUBWRITE-003` POST /auth/signup is a write reachable without authentication — HIGH, confidence 0.70
- `EINV-001` Structured invoices are generated but no transmission path exists — HIGH, confidence 0.70

**P2 — premium / scale improvements** (11)

- `RES-001` No recovery time or recovery point objective is documented — MEDIUM, confidence 0.90
- `ARCH-PUBLIC-001` Auth middleware exempts the whole '/auth/' prefix — MEDIUM, confidence 0.80
- `OBS-001` No request or correlation identifier is threaded through logs — MEDIUM, confidence 0.75
- `ARCH-DOC-001` 7 endpoint(s) documented in system-architecture.html do not exist in the router tree — INFORMATIONAL, confidence 0.30
- `LEGAL-BE-EINV-001-C` Confirm structured e-invoice generation is visible — needs legal confirmation — INFORMATIONAL, confidence 0.20
- `LEGAL-BE-EINV-002-C` Confirm participant identifier handling is visible — needs legal confirmation — INFORMATIONAL, confidence 0.20
- `LEGAL-BE-VAT-001-C` Mandatory invoice mentions are not visibly validated — needs legal confirmation — INFORMATIONAL, confidence 0.20
- `LEGAL-BE-VAT-002-C` Confirm gapless sequential numbering mechanism is visible — needs legal confirmation — INFORMATIONAL, confidence 0.20
- `LEGAL-BE-VAT-003-C` Credit notes do not visibly reference the corrected invoice — needs legal confirmation — INFORMATIONAL, confidence 0.20
- `LEGAL-BE-VAT-004-C` Confirm VAT identification number validation is visible — needs legal confirmation — INFORMATIONAL, confidence 0.20
- `LEGAL-BE-VAT-005-C` Confirm retention period is enforced or documented for issued documents — needs legal confirmation — INFORMATIONAL, confidence 0.20

---

Machine-readable findings: `findings.json`. Evidence: `evidence/`. Re-run to produce a diff against this audit as a baseline.