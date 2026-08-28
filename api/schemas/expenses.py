"""Wire shapes for expenses and the TVA position.

The domain models are reused rather than restated wherever they are already a
wire-safe shape — `ExtractedFields`, `DocumentCheck` and `TvaClassification` are
Pydantic models with no persistence concerns, and redeclaring them here would
create a second schema to keep in step with `core/tva/models.py`.

The one thing this module does add is a **request** shape for extraction output.
That is deliberate: extraction is a vendor decision nobody has made (§3), so
until an extractor exists inside the product a client supplies the fields it
read. Making that an explicit request type keeps the seam visible instead of
pretending the server did the reading.
"""

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from core.tva.models import (
    DocumentCheck,
    ExtractedFields,
    RecoveryTreatment,
    TvaClassification,
)


class ExpenseImportRequest(BaseModel):
    company_id: UUID
    extracted: ExtractedFields
    source_filename: str | None = Field(default=None, max_length=255)


class ExpenseReviewRequest(BaseModel):
    """A human's decision on one expense's treatment.

    There is no `recoverable_amount` field, and there will not be one. The
    service recomputes it from the detected amount and the percentage: a client
    that can post the figure is a client that can post the wrong figure, and
    this number reaches a VAT return.
    """

    treatment: RecoveryTreatment
    deductible_percent: int | None = Field(default=None, ge=0, le=100)


class ExpenseResponse(BaseModel):
    id: UUID
    organization_id: UUID
    company_id: UUID
    state: str
    source_filename: str | None
    source_document_key: str | None
    extracted: ExtractedFields
    checks: list[DocumentCheck]
    classification: TvaClassification | None
    duplicate_of_id: UUID | None
    failure_code: str | None
    #  Derived, not stored. The exception queue reads this rather than
    #  re-deriving the predicate in TypeScript, which is how the two would
    #  eventually disagree about which rows need attention.
    needs_attention: bool
    created_at: datetime
    updated_at: datetime


class TreatmentBreakdownOut(BaseModel):
    treatment: RecoveryTreatment
    count: int
    detected: Decimal
    recoverable: Decimal


class TvaPositionResponse(BaseModel):
    """The period position.

    `confirmed_recoverable` and `potential_recoverable` are separate fields and
    there is no combined total — the blueprint's locked decision, enforced here
    by the absence of the field rather than by a note. `estimated_payable` uses
    only the confirmed half.
    """

    period_start: date
    period_end: date

    expenses_analyzed: int
    collected: Decimal
    detected: Decimal
    confirmed_recoverable: Decimal
    potential_recoverable: Decimal
    review_required: Decimal
    non_recoverable: Decimal

    #  Computed properties on the domain model, sent explicitly so the client
    #  never has to subtract two figures itself and risk using the wrong half.
    estimated_payable: Decimal
    is_complete: bool

    unresolved_exceptions: int
    breakdown: list[TreatmentBreakdownOut]
