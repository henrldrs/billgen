"""Document validation — the checks, and what each severity means."""

from datetime import date
from decimal import Decimal

from core.tva import CheckStatus, ExtractedFields, duplicate_key, validate, worst_status


def _good() -> ExtractedFields:
    return ExtractedFields(
        supplier_name="Acme SRL",
        supplier_vat_number="BE0123456749",
        invoice_number="F-2026-11",
        invoice_date=date(2026, 8, 1),
        subtotal_ht=Decimal("100.00"),
        tva_rate=Decimal("21"),
        tva_amount=Decimal("21.00"),
        total_ttc=Decimal("121.00"),
        expense_category="software",
    )


def test_a_complete_consistent_document_passes_everything():
    checks = validate(_good())
    assert worst_status(checks) is CheckStatus.PASSED


def test_ht_plus_tva_must_equal_ttc():
    fields = _good()
    fields.total_ttc = Decimal("131.00")
    codes = {c.code: c.status for c in validate(fields)}
    assert codes["arithmetic_inconsistent"] is CheckStatus.FAILED


def test_a_supplier_rounding_cent_is_not_an_inconsistency():
    fields = _good()
    fields.total_ttc = Decimal("121.01")
    codes = {c.code: c.status for c in validate(fields)}
    assert codes["arithmetic_consistent"] is CheckStatus.PASSED


def test_a_missing_supplier_vat_number_warns_and_does_not_fail():
    # It blocks recovery, not the record: the cost is still real, and §6 wants
    # the expense in the queue with a reason rather than rejected at the door.
    fields = _good()
    fields.supplier_vat_number = None
    checks = validate(fields)
    assert worst_status(checks) is CheckStatus.WARNING


def test_a_rate_contradicting_the_amounts_fails():
    fields = _good()
    fields.tva_rate = Decimal("6")
    codes = {c.code: c.status for c in validate(fields)}
    assert codes["rate_contradicts_amounts"] is CheckStatus.FAILED


def test_a_non_belgian_rate_only_warns():
    fields = _good()
    fields.subtotal_ht = Decimal("100.00")
    fields.tva_amount = Decimal("19.00")
    fields.total_ttc = Decimal("119.00")
    fields.tva_rate = Decimal("19")
    codes = {c.code: c.status for c in validate(fields)}
    assert codes["rate_non_standard"] is CheckStatus.WARNING


def test_duplicate_key_normalises_spacing_and_case():
    a = _good()
    b = _good()
    b.supplier_vat_number = "be 0123456749"
    assert duplicate_key(a) == duplicate_key(b)


def test_duplicate_key_is_none_when_the_document_has_no_identity():
    # None means "cannot be de-duplicated", which the caller must not read as
    # "not a duplicate".
    fields = _good()
    fields.invoice_number = None
    assert duplicate_key(fields) is None
