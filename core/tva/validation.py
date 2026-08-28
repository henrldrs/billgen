"""Document validation (§4) — pure functions over `ExtractedFields`.

Scaffold — nothing calls these yet. See README.md.

Every check returns a `DocumentCheck` with a code, never a sentence, and the
distinction between WARNING and FAILED is load-bearing: a WARNING lets the
expense continue to classification carrying a flag, a FAILED stops it at the
work queue. Getting that backwards is how a product either nags about nothing
or silently deducts from a document it could not read.

The arithmetic check is the one worth reading twice. HT + TVA = TTC is not a
heuristic — when it fails, at least one of the three numbers on the page was
misread, and *which* one is unknowable from the numbers alone. So it reports
the inconsistency and refuses to repair it.
"""

from decimal import Decimal

from core.rules.vat import BELGIAN_STANDARD_RATES

from .models import CheckStatus, DocumentCheck, ExtractedFields

# Rounding on the supplier's own document is theirs, not ours. A cent of drift
# across a multi-line invoice is normal; ten cents is a misread figure.
ARITHMETIC_TOLERANCE = Decimal("0.02")


def _check(code: str, status: CheckStatus, **context: str) -> DocumentCheck:
    return DocumentCheck(code=code, status=status, context=context)


def check_required_fields(fields: ExtractedFields) -> list[DocumentCheck]:
    """Supplier, number and date — the three a Belgian expense must carry."""
    results: list[DocumentCheck] = []
    for code, value in (
        ("supplier_missing", fields.supplier_name),
        ("invoice_number_missing", fields.invoice_number),
        ("invoice_date_missing", fields.invoice_date),
    ):
        results.append(
            _check(code, CheckStatus.FAILED if value is None else CheckStatus.PASSED)
        )
    return results


def check_supplier_vat_number(fields: ExtractedFields) -> DocumentCheck:
    """A missing supplier VAT number is a warning, not a failure.

    It blocks *recovery*, not the record: the expense is still a real cost, and
    §6 wants it in the queue with a reason rather than rejected at the door.
    Format validation belongs to `core.rules.identifiers`, which already owns
    the Belgian modulo-97 check; wiring it here is an integration step.
    """
    if fields.supplier_vat_number:
        return _check("supplier_vat_present", CheckStatus.PASSED)
    return _check("supplier_vat_missing", CheckStatus.WARNING)


def check_arithmetic(fields: ExtractedFields) -> DocumentCheck:
    """HT + TVA = TTC, within a supplier's own rounding."""
    ht, tva, ttc = fields.subtotal_ht, fields.tva_amount, fields.total_ttc
    if ht is None or tva is None or ttc is None:
        return _check("arithmetic_incomplete", CheckStatus.WARNING)

    drift = abs((ht + tva) - ttc)
    if drift <= ARITHMETIC_TOLERANCE:
        return _check("arithmetic_consistent", CheckStatus.PASSED)
    return _check(
        "arithmetic_inconsistent",
        CheckStatus.FAILED,
        drift=str(drift),
        subtotal_ht=str(ht),
        tva_amount=str(tva),
        total_ttc=str(ttc),
    )


def check_rate_plausible(fields: ExtractedFields) -> DocumentCheck:
    """The stated rate against the Belgian set, and against the amounts.

    Two ways to be wrong, so two codes. A rate outside {0, 6, 12, 21} is
    unusual but legal on a foreign document; a rate that contradicts the
    invoice's own HT and TVA is a misread.
    """
    rate = fields.tva_rate
    if rate is None:
        return _check("rate_missing", CheckStatus.WARNING)

    if rate not in BELGIAN_STANDARD_RATES:
        return _check("rate_non_standard", CheckStatus.WARNING, rate=str(rate))

    ht, tva = fields.subtotal_ht, fields.tva_amount
    if ht is None or tva is None or ht == 0:
        return _check("rate_standard", CheckStatus.PASSED, rate=str(rate))

    implied = (tva / ht) * Decimal("100")
    if abs(implied - rate) > Decimal("0.5"):
        return _check(
            "rate_contradicts_amounts",
            CheckStatus.FAILED,
            stated_rate=str(rate),
            implied_rate=str(round(implied, 2)),
        )
    return _check("rate_standard", CheckStatus.PASSED, rate=str(rate))


def duplicate_key(fields: ExtractedFields) -> str | None:
    """The identity of an expense document, or None when it has none.

    Supplier VAT number plus invoice number: a supplier's own numbering is
    unique within that supplier, and the VAT number is the only supplier
    identifier that is not a spelling. Matching on name would collapse
    "Acme SRL" and "ACME s.r.l." — or fail to.

    Returning None is not a bug. A document missing either half cannot be
    de-duplicated, and the caller must treat that as unknown rather than as
    "not a duplicate".
    """
    if not fields.supplier_vat_number or not fields.invoice_number:
        return None
    return f"{fields.supplier_vat_number.upper().replace(' ', '')}:{fields.invoice_number.strip()}"


def validate(fields: ExtractedFields) -> list[DocumentCheck]:
    """Every check, in the order the evidence panel (§7) lists them."""
    return [
        *check_required_fields(fields),
        check_supplier_vat_number(fields),
        check_arithmetic(fields),
        check_rate_plausible(fields),
    ]


def worst_status(checks: list[DocumentCheck]) -> CheckStatus:
    if any(c.status is CheckStatus.FAILED for c in checks):
        return CheckStatus.FAILED
    if any(c.status is CheckStatus.WARNING for c in checks):
        return CheckStatus.WARNING
    return CheckStatus.PASSED
