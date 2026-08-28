"""Expenses and the TVA position — the service the `core/tva/` scaffold waited for.

`core/tva/` is all pure functions: a state machine, document checks, Belgian
classification rules, an aggregator. None of it can read or write anything,
which was deliberate — it is the half that could be written correctly before
storage, OCR and a job runner were decided.

This service is the other half. It owns three things the pure layer cannot:

**The transitions.** `can_transition` is called here and nowhere else. A state
machine enforced in two places is enforced in neither. The import walks the real
edges — IMPORTED → PROCESSING → EXTRACTED → VALIDATING → CLASSIFYING → ANALYZED
— rather than assigning an end state directly, so an illegal path fails here
instead of producing a row the machine could never have reached.

**The duplicate lookup.** `core/tva/validation.py` can tell you a document is
internally inconsistent; only a repository can tell you it has been imported
before.

**The order of operations.** Validate, then look for a duplicate, then classify
— and never classify a document that failed its checks, because a classification
carries an amount and that amount is what the period analysis sums.

What is still missing is worth stating plainly: extraction (§3) is a vendor
decision nobody has made, so this takes `ExtractedFields` from its caller rather
than producing them. When an extractor is chosen it plugs in above this service
without changing it — which is the whole reason the scaffold modelled the
*result* of extraction rather than the process.
"""

from collections.abc import Callable
from datetime import UTC, date, datetime
from decimal import ROUND_HALF_UP, Decimal
from uuid import UUID

from ..models import AuditAction, InvoiceStatus
from ..repository import UnitOfWork
from ..tva.analyzer import TvaPosition, analyze
from ..tva.classification import classify
from ..tva.models import CheckStatus, Expense, ExtractedFields, RecoveryTreatment
from ..tva.states import ExpenseState, can_transition
from ..tva.validation import validate
from . import _audit
from .errors import BusinessRuleError, NotFoundError


def _advance(expense: Expense, target: ExpenseState) -> None:
    if not can_transition(expense.state, target):
        raise BusinessRuleError(
            f"An expense in {expense.state.value} cannot move to {target.value}."
        )
    expense.state = target


class ExpenseService:
    def __init__(self, uow_factory: Callable[[], UnitOfWork]) -> None:
        self._uow_factory = uow_factory

    # -- reads ---------------------------------------------------------

    def list(
        self,
        company_id: UUID | None = None,
        state: ExpenseState | None = None,
        needs_attention: bool | None = None,
    ) -> list[Expense]:
        with self._uow_factory() as uow:
            return uow.expenses.list(
                company_id=company_id, state=state, needs_attention=needs_attention
            )

    def get(self, expense_id: UUID) -> Expense:
        with self._uow_factory() as uow:
            expense = uow.expenses.get(expense_id)
        if expense is None:
            raise NotFoundError(f"Expense {expense_id} not found")
        return expense

    # -- the import thread ---------------------------------------------

    def import_document(
        self,
        organization_id: UUID,
        company_id: UUID,
        *,
        extracted: ExtractedFields,
        source_filename: str | None = None,
        actor_id: UUID | None = None,
    ) -> Expense:
        """One document, from extraction output to an analyzed expense.

        Synchronous on purpose. §2 of the blueprint wants the user to navigate
        away while a batch continues, which needs a job runner BillGen does not
        have — the same missing piece recurring invoices are waiting on. Doing
        this synchronously is honest; rendering fake progress would not be.
        """
        expense = Expense(
            organization_id=organization_id,
            company_id=company_id,
            state=ExpenseState.IMPORTED,
            source_filename=source_filename,
            extracted=extracted,
        )

        with self._uow_factory() as uow:
            _advance(expense, ExpenseState.PROCESSING)
            _advance(expense, ExpenseState.EXTRACTED)

            _advance(expense, ExpenseState.VALIDATING)
            expense.checks = validate(extracted)
            duplicate = uow.expenses.find_duplicate(
                company_id=company_id,
                supplier_vat_number=extracted.supplier_vat_number,
                supplier_invoice_number=extracted.invoice_number,
            )
            if duplicate is not None:
                expense.duplicate_of_id = duplicate.id

            #  A failed check or a duplicate stops the thread at FAILED.
            #  Classifying anyway would put a recoverable amount on a document
            #  the system has just said it does not trust — and that amount is
            #  what a VAT return sums.
            blocked = duplicate is not None or any(
                check.status is CheckStatus.FAILED for check in expense.checks
            )
            if blocked:
                _advance(expense, ExpenseState.FAILED)
                expense.failure_code = (
                    "duplicate_document" if duplicate is not None else "failed_checks"
                )
            else:
                _advance(expense, ExpenseState.CLASSIFYING)
                expense.classification = classify(extracted, expense.checks)
                _advance(expense, ExpenseState.ANALYZED)

            stored = uow.expenses.add(expense)
            _audit.record(
                uow,
                actor_user_id=actor_id,
                action=AuditAction.CREATE,
                target_type="expense",
                target_id=stored.id,
                after={"state": stored.state.value, "failure_code": stored.failure_code},
            )
            uow.commit()
        return stored

    # -- human decisions -----------------------------------------------

    def review(
        self,
        expense_id: UUID,
        *,
        treatment: RecoveryTreatment,
        actor_id: UUID,
        deductible_percent: int | None = None,
    ) -> Expense:
        """A person accepts or overrides the suggested treatment (ANALYZED → REVIEWED).

        This is the only path by which a recoverable amount becomes *confirmed*,
        and therefore the only path by which it can reach `estimated_payable`.
        The blueprint's rule, restated: the money does not move until a human
        says so.
        """
        with self._uow_factory() as uow:
            expense = uow.expenses.get(expense_id)
            if expense is None:
                raise NotFoundError(f"Expense {expense_id} not found")
            if expense.classification is None:
                raise BusinessRuleError(
                    "This expense has no classification to review. It failed its "
                    "document checks or is a duplicate; resolve that first."
                )

            classification = expense.classification
            classification.treatment = treatment
            if deductible_percent is not None:
                if not 0 <= deductible_percent <= 100:
                    raise BusinessRuleError("deductible_percent must be between 0 and 100")
                classification.deductible_percent = Decimal(deductible_percent)

            #  Recomputed, never taken from the caller. A client that can post an
            #  amount is a client that can post the wrong one, and this figure
            #  lands in a VAT return.
            classification.recoverable_amount = _recoverable(
                classification.detected_amount,
                treatment,
                classification.deductible_percent,
            )
            classification.confirmed_at = datetime.now(UTC)
            classification.confirmed_by = actor_id
            expense.classification = classification

            _advance(expense, ExpenseState.REVIEWED)
            stored = uow.expenses.update(expense)

            _audit.record(
                uow,
                actor_user_id=actor_id,
                action=AuditAction.UPDATE,
                target_type="expense",
                target_id=expense.id,
                after={
                    "treatment": treatment.value,
                    "recoverable": str(classification.recoverable_amount),
                },
            )
            uow.commit()
        return stored

    def delete(self, expense_id: UUID, *, actor_id: UUID | None = None) -> None:
        """Remove a mis-scanned document.

        Allowed at any state, unlike an invoice: importing an expense consumes
        no gapless number and creates no obligation, so a deletion has no hole
        to tear (ADR-0002 exists for the opposite case).
        """
        with self._uow_factory() as uow:
            expense = uow.expenses.get(expense_id)
            if expense is None:
                raise NotFoundError(f"Expense {expense_id} not found")
            uow.expenses.delete(expense_id)
            _audit.record(
                uow,
                actor_user_id=actor_id,
                action=AuditAction.DELETE,
                target_type="expense",
                target_id=expense_id,
                before={"state": expense.state.value},
            )
            uow.commit()

    # -- the period position -------------------------------------------

    def position(
        self,
        company_id: UUID,
        start: date,
        end: date,
        collected: Decimal | None = None,
    ) -> TvaPosition:
        """The TVA position for a period.

        `collected` may be supplied; otherwise it is derived from issued
        invoices here. Either way `analyze()` receives it as an argument —
        coupling the expense analyzer to the invoice repository would make the
        pure function untestable without a database, which is exactly what the
        scaffold avoided.
        """
        with self._uow_factory() as uow:
            expenses = uow.expenses.in_period(company_id, start, end)
            if collected is None:
                collected = _collected_vat(uow, company_id, start, end)
        return analyze(expenses, collected=collected)


def _recoverable(
    detected: Decimal, treatment: RecoveryTreatment, percent: Decimal
) -> Decimal:
    if treatment in (
        RecoveryTreatment.NON_RECOVERABLE,
        RecoveryTreatment.REVIEW_REQUIRED,
    ):
        return Decimal("0")
    if treatment is RecoveryTreatment.RECOVERABLE:
        return detected
    return (detected * percent / Decimal("100")).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )


def _collected_vat(
    uow: UnitOfWork, company_id: UUID, start: date, end: date
) -> Decimal:
    """Output VAT on issued invoices in the period.

    Derived rather than stored, for the reason every other total in this product
    is derived: a second copy of a figure that reaches a VAT return is a second
    thing that can be wrong.
    """
    total = Decimal("0")
    for invoice in uow.invoices.list(company_id=company_id):
        if invoice.status in (InvoiceStatus.DRAFT, InvoiceStatus.VOID):
            continue
        if invoice.issue_date is None or not (start <= invoice.issue_date <= end):
            continue
        total += invoice.total_vat
    return total
