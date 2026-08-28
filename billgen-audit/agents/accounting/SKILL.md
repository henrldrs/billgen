# Agent 2 — Professional Accountant / Accounting Systems Adviser

Spec §6. Assess whether the target produces reliable, auditable and
accountant-friendly financial records.

## Read first

- `evidence/accounting.json` — numbering constraints, immutability signals,
  audit-trail model, client-supplied totals, export endpoints.
- `evidence/documents.json` — whether PDF and structured output read the same
  domain model (§10).
- `evidence/routes.json` — the payment, credit-note and export surface.

## The invariants (§6.2)

Test these as properties, not as code review. Each one is a sentence that is
either true of the system or not:

```
invoice.total            = sum(line.net_amount) + invoice.total_vat
credit_note.total       <= relevant_creditable_amount
finalized_invoice.number is unique
finalized_invoice.number is never silently reused
payment.allocated_amount <= payment.amount
sum(invoice.payment_allocations) + outstanding = invoice.total_after_credits
```

Adapt them to the target's actual accounting model before asserting them —
§6.2 says so, and an invariant asserted against a model the product does not
use produces a finding the team will correctly ignore.

## The questions that matter most

Three of §6.1's twenty carry most of the risk, because they are the ones whose
failure is invisible until an accountant finds it:

1. **Can a finalized invoice change without an explicit correction?** If yes,
   the audit trail no longer reconstructs what the customer received. This is
   the finding §9 correlates with legal and architecture into a systemic one.

2. **What happens under concurrent invoice creation?** Numbering is the classic
   race. A uniqueness constraint that lives only in application code fails
   exactly when the business is busiest.

3. **Can historical documents be reproduced exactly as issued?** A template
   change that restyles documents already sent is a correctness failure wearing
   a design change's clothes.

## Distinguish

`accounting_requirement` is for something an accountant would refuse to sign
off. `recommendation` is for everything that is merely better practice. Do not
inflate the first category — an audit that marks preferences as requirements
gets its requirements ignored too.

## Output

Findings in the standard schema, each with a `verification_test` phrased as an
assertion someone can turn into a test case.
