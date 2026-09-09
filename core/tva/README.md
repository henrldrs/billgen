# TVA Intelligence — scaffold

Written from [`docs/tva_feature_future.md`](../../docs/tva_feature_future.md).
Section references below (§n) are to that blueprint.

**This package is not wired.** No SQLAlchemy table, no Alembic revision, no
router, no permission in `api/authz`, no meter in the entitlement matrix, and
no node in `frontend-react/src/scaffold/ia.ts`. `api/main.py` does not import
it. Importing `core.tva` costs nothing and changes nothing.

## What is here, and why only this

Everything in this package is a pure function or a pydantic model. That is not
a style preference — it is the line between the half of the feature that can
be written correctly today and the half that cannot:

| Module | Blueprint | Status |
|---|---|---|
| `states.py` | §13, §12 | Complete. `ExpenseState.is_working` is the single predicate the Loading rule reads. |
| `models.py` | §3, §4, §5, §7 | Complete as a domain shape. Deliberately **not** a `db.models` row. |
| `validation.py` | §4 | Complete except the duplicate *lookup* (needs a repository) and VAT-number format (needs `core.rules.identifiers` wired in). |
| `classification.py` | §5, §8 | Complete for the Belgian defaults. Advisory only. |
| `analyzer.py` | §6, §9, §10, §11 | Complete. Takes `collected` as an argument rather than reading invoices. |

What is **not** here, and why:

- **Extraction (§3).** OCR/parsing is a vendor decision nobody has made. The
  package models the *result* (`ExtractedFields`) so the choice stays swappable.
- **Storage of the source document.** `Expense.source_document_key` is a
  dangling reference, the same kind `Company.logo_key` already is. **B2 — blob
  storage** is the blocker; writing a table around an undecided storage model
  would bake the decision in.
- **Anything asynchronous.** §2 wants imports to continue while the user
  navigates away. That needs a job runner, which BillGen does not have — it is
  the same missing piece recurring invoices are waiting on.

## The two decisions the scaffold already commits to

1. **Uncertainty never becomes a deduction.** `classify()` returns
   `REVIEW_REQUIRED` with `recoverable_amount = 0` whenever the category is
   unknown, the supplier VAT number is missing, or a check failed — including
   for the categories where a *known* cap exists (vehicle, fuel). The cap
   travels in `deductible_percent` as a suggestion; the money does not move
   until a human confirms.
2. **`TvaPosition` has no single "recoverable" total.** It splits `confirmed_`
   from `potential_recoverable`, and `estimated_payable` uses only the
   confirmed half. This is the blueprint's own locked decision, enforced by the
   absence of the field rather than by a convention.

Both are load-bearing for the same reason: this feature's failure mode is a
filing error carrying BillGen's name.

## Integrating it — the order that works

1. **`db/models/expense.py` + repository.** Mirror `db/models/quote.py`. Watch
   the constraint-naming trap in [HANDBOOK.md](../../docs/HANDBOOK.md) §5:
   two unique constraints whose first column is `organization_id` collapse to
   one name under the `uq` convention and Postgres rejects the table.
2. **Alembic revision.** `alembic revision --autogenerate`, then read it.
3. **`core/services/expense_service.py`.** Owns the state transitions, and is
   the only place `can_transition` is called. Follow `QuoteService` — and note
   its warning: a service that spans two transactions leaves a visible
   half-state.
4. **`api/routers/expenses.py` + `tva.py`.** Every write endpoint must declare
   a permission or the route-walking guard fails the suite. New permissions
   (`expense:write`, `tva:review`) go in `api/authz`.
5. **Metering and entitlements.** Whether expense import is metered is a
   pricing decision, not a default — the same question quotes were shipped
   unmetered on.
6. **`ia.ts`.** Add the four nodes (§1: Expenses inbox, import, detail, TVA
   analysis) with their real `missing` endpoint lists, then flip them as the
   routes land. The ledger is only true as of its last reading.
7. **Frontend.** `frontend-react/src/tva/` holds the panel scaffold and the
   mirrored state machine.

## Tests

`tests/core/tva/` covers the pure logic that exists. It does not need a
database, a fixture or an app, which is the point.
