"""Domain models for the expense side of the TVA thread.

Scaffold — no SQLAlchemy table, no migration, no route. See README.md.

The shape is dictated by one product decision `docs/tva_feature_future.md`
locks at the end: the analyzer must always be able to tell apart

  * **detected**    — TVA the document says exists,
  * **recoverable** — TVA BillGen believes could be recovered, and
  * **confirmed**   — a treatment a human accepted.

That is why `TvaClassification` carries three amounts and not one, and why
`confirmed_by` is nullable rather than a boolean. A single `deductible` figure
would collapse a guess and a decision into the same number, and there would be
no honest way to split them apart again once a period was exported.
"""

from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from uuid import UUID

from pydantic import Field

from core.models._base import DomainModel, TenantModel
from core.models.currency import Currency

from .states import ExpenseState


class RecoveryTreatment(str, Enum):
    """§5. `REVIEW_REQUIRED` is not a fifth colour — it is the absence of a
    conclusion, and it must never be silently rendered as a deduction."""

    RECOVERABLE = "recoverable"
    PARTIAL = "partial"
    NON_RECOVERABLE = "non_recoverable"
    REVIEW_REQUIRED = "review_required"


class Confidence(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class CheckStatus(str, Enum):
    PASSED = "passed"
    WARNING = "warning"
    FAILED = "failed"


class DocumentCheck(DomainModel):
    """One validation result (§4).

    `code` and `context` only — the sentence shown to the user is the
    frontend's, exactly as `GET /alerts` already does it. A server that ships
    prose ships it in one language.
    """

    code: str = Field(min_length=1, max_length=64)
    status: CheckStatus
    context: dict[str, str] = Field(default_factory=dict)


class ExtractedFields(DomainModel):
    """What extraction (§3) believes it read off the document.

    Every field is optional. A scan that yielded a supplier and nothing else is
    a real outcome, and the record has to be able to hold it — an extractor
    that must produce a total will invent one.
    """

    supplier_name: str | None = None
    supplier_vat_number: str | None = None
    invoice_number: str | None = None
    invoice_date: date | None = None

    subtotal_ht: Decimal | None = None
    tva_rate: Decimal | None = None
    tva_amount: Decimal | None = None
    total_ttc: Decimal | None = None

    currency: Currency = Currency.EUR
    expense_category: str | None = None
    document_type: str | None = None

    # Per-field extractor confidence, keyed by field name. Drives the evidence
    # panel's ticks (§7) without the panel guessing from emptiness.
    field_confidence: dict[str, Confidence] = Field(default_factory=dict)


class TvaClassification(DomainModel):
    """The treatment of one expense's TVA, and how much of it is a claim.

    `recoverable_amount` is *potentially* recoverable until `confirmed_at` is
    set. The analyzer sums the two separately (see `analyzer.TvaPosition`)
    precisely so a period total can never quietly include a machine guess.
    """

    treatment: RecoveryTreatment
    confidence: Confidence

    detected_amount: Decimal = Field(default=Decimal("0"), ge=Decimal("0"))
    recoverable_amount: Decimal = Field(default=Decimal("0"), ge=Decimal("0"))
    # 0–100. Meaningful for PARTIAL; 100/0 for the two certain treatments.
    deductible_percent: Decimal = Field(default=Decimal("100"), ge=Decimal("0"), le=Decimal("100"))

    # Why this expense was flagged (§6). Codes, not prose — same rule as checks.
    reason_codes: list[str] = Field(default_factory=list)

    confirmed_at: datetime | None = None
    confirmed_by: UUID | None = None

    @property
    def is_confirmed(self) -> bool:
        return self.confirmed_at is not None

    @property
    def needs_review(self) -> bool:
        return self.treatment is RecoveryTreatment.REVIEW_REQUIRED and not self.is_confirmed


class Expense(TenantModel):
    """One imported document and everything the thread has concluded about it.

    Not a `db.models` row. The persistence shape (blob key for the source
    document, JSON columns for checks) is deliberately undecided here: **B2 —
    blob storage** is still open, and `source_document_key` is the same kind of
    dangling reference `Company.logo_key` already is. Writing a table around it
    now would bake in a storage decision nobody has made.
    """

    company_id: UUID

    state: ExpenseState = ExpenseState.IMPORTED
    source_filename: str | None = None
    source_document_key: str | None = None

    extracted: ExtractedFields = Field(default_factory=ExtractedFields)
    checks: list[DocumentCheck] = Field(default_factory=list)
    classification: TvaClassification | None = None

    # Set by the duplicate check; points at the expense this one repeats.
    duplicate_of_id: UUID | None = None

    # Populated only on FAILED, and a code rather than a stack trace.
    failure_code: str | None = None

    @property
    def is_working(self) -> bool:
        return self.state.is_working

    @property
    def needs_attention(self) -> bool:
        """The work-queue predicate (§6)."""
        if self.state is ExpenseState.FAILED or self.duplicate_of_id is not None:
            return True
        if any(check.status is CheckStatus.FAILED for check in self.checks):
            return True
        return self.classification is not None and self.classification.needs_review
