"""Classification — mostly a test that uncertainty stays worth zero."""

from datetime import date
from decimal import Decimal

from core.tva import (
    Confidence,
    ExtractedFields,
    RecoveryTreatment,
    classify,
    validate,
)


def _fields(category: str | None, tva: str = "21.00") -> ExtractedFields:
    amount = Decimal(tva)
    ht = (amount / Decimal("0.21")).quantize(Decimal("0.01"))
    return ExtractedFields(
        supplier_name="Acme SRL",
        supplier_vat_number="BE0123456749",
        invoice_number="F-1",
        invoice_date=date(2026, 8, 1),
        subtotal_ht=ht,
        tva_rate=Decimal("21"),
        tva_amount=amount,
        total_ttc=ht + amount,
        expense_category=category,
    )


def _classify(fields: ExtractedFields):
    return classify(fields, validate(fields))


def test_a_clean_deductible_category_is_fully_recoverable():
    result = _classify(_fields("software"))
    assert result.treatment is RecoveryTreatment.RECOVERABLE
    assert result.recoverable_amount == Decimal("21.00")
    assert result.confidence is Confidence.HIGH


def test_an_excluded_category_is_non_recoverable_with_a_reason():
    result = _classify(_fields("restaurant", "60.00"))
    assert result.treatment is RecoveryTreatment.NON_RECOVERABLE
    assert result.recoverable_amount == Decimal("0")
    assert result.reason_codes == ["food_and_drink_excluded"]


def test_a_capped_category_suggests_but_does_not_deduct():
    # The whole safety property in one test: the vehicle cap is known, so the
    # percentage is proposed — and the money still does not move.
    result = _classify(_fields("vehicle", "105.00"))
    assert result.treatment is RecoveryTreatment.REVIEW_REQUIRED
    assert result.deductible_percent == Decimal("50")
    assert result.recoverable_amount == Decimal("0")
    assert result.detected_amount == Decimal("105.00")


def test_an_unknown_category_is_never_guessed_into_a_deduction():
    result = _classify(_fields("something_new"))
    assert result.treatment is RecoveryTreatment.REVIEW_REQUIRED
    assert result.recoverable_amount == Decimal("0")
    assert "category_unknown" in result.reason_codes


def test_a_missing_category_is_review_not_a_default():
    result = _classify(_fields(None))
    assert result.treatment is RecoveryTreatment.REVIEW_REQUIRED


def test_a_failed_check_stops_classification_and_carries_its_code():
    fields = _fields("software")
    fields.total_ttc = Decimal("999.00")
    result = _classify(fields)
    assert result.treatment is RecoveryTreatment.REVIEW_REQUIRED
    assert "arithmetic_inconsistent" in result.reason_codes


def test_a_missing_supplier_vat_number_blocks_recovery():
    fields = _fields("software")
    fields.supplier_vat_number = None
    result = _classify(fields)
    assert result.treatment is RecoveryTreatment.REVIEW_REQUIRED
    assert "supplier_vat_missing" in result.reason_codes


def test_no_tva_detected_is_not_the_same_as_zero_tva():
    fields = _fields("software")
    fields.tva_amount = None
    result = _classify(fields)
    assert result.reason_codes == ["tva_amount_not_detected"]
    assert result.detected_amount == Decimal("0")
