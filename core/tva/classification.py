"""TVA recovery classification (§5) — the heart of the feature, and its risk.

Scaffold — nothing calls this yet. See README.md.

Two rules govern everything below, and both are refusals:

1. **Uncertainty never becomes a deduction.** If the category is unknown, if
   the supplier's VAT number is missing, or if a check failed, the result is
   `REVIEW_REQUIRED` with a recoverable amount of zero — not a best guess with
   a low confidence attached. A guess that reaches a return is a filing error.
2. **This is advisory, exactly like `GET /vat-treatment`.** The caller knows
   things the data does not: whether the meal was with a client, whether the
   car is used privately, whether the company is even entitled to deduct. The
   rates below are *defaults offered for confirmation*, and the API contract
   must never present them as determinations.

The table itself encodes the well-known Belgian limits (vehicles capped, food
and entertainment excluded). It is deliberately data, not branches: Phase 4 of
the blueprint makes this jurisdiction-aware, and that is a second table, not a
rewrite of the logic.
"""

from decimal import ROUND_HALF_UP, Decimal

from .models import (
    CheckStatus,
    Confidence,
    DocumentCheck,
    ExtractedFields,
    RecoveryTreatment,
    TvaClassification,
)


class CategoryRule:
    """A default treatment for one expense category.

    `requires_confirmation` is separate from the percentage on purpose. Vehicle
    costs have a *known* cap and still need a human — the cap depends on
    business use, which no document states.
    """

    __slots__ = ("category", "deductible_percent", "requires_confirmation", "reason_code")

    def __init__(
        self,
        category: str,
        deductible_percent: Decimal,
        *,
        requires_confirmation: bool = False,
        reason_code: str | None = None,
    ) -> None:
        self.category = category
        self.deductible_percent = deductible_percent
        self.requires_confirmation = requires_confirmation
        self.reason_code = reason_code


# Belgian defaults. Every entry that is not 100% carries the reason the UI
# shows under "Why we're flagging this".
BELGIAN_CATEGORY_RULES: dict[str, CategoryRule] = {
    "office_supplies": CategoryRule("office_supplies", Decimal("100")),
    "software": CategoryRule("software", Decimal("100")),
    "professional_services": CategoryRule("professional_services", Decimal("100")),
    "telecom": CategoryRule("telecom", Decimal("100")),
    "travel": CategoryRule("travel", Decimal("100")),
    "vehicle": CategoryRule(
        "vehicle",
        Decimal("50"),
        requires_confirmation=True,
        reason_code="vehicle_business_use_unknown",
    ),
    "fuel": CategoryRule(
        "fuel",
        Decimal("50"),
        requires_confirmation=True,
        reason_code="vehicle_business_use_unknown",
    ),
    "restaurant": CategoryRule(
        "restaurant",
        Decimal("0"),
        reason_code="food_and_drink_excluded",
    ),
    "entertainment": CategoryRule(
        "entertainment",
        Decimal("0"),
        reason_code="entertainment_excluded",
    ),
    "gifts": CategoryRule(
        "gifts",
        Decimal("0"),
        requires_confirmation=True,
        reason_code="gift_threshold_unknown",
    ),
}


def _round_money(amount: Decimal) -> Decimal:
    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _review(
    detected: Decimal, *reason_codes: str, confidence: Confidence = Confidence.LOW
) -> TvaClassification:
    """The safe answer. Zero recoverable, and the reason said out loud."""
    return TvaClassification(
        treatment=RecoveryTreatment.REVIEW_REQUIRED,
        confidence=confidence,
        detected_amount=_round_money(detected),
        recoverable_amount=Decimal("0"),
        deductible_percent=Decimal("0"),
        reason_codes=list(reason_codes),
    )


def _blocking_reason(
    fields: ExtractedFields,
    checks: list[DocumentCheck],
    rule: CategoryRule | None,
) -> TvaClassification | None:
    """Every way an expense can be un-classifiable, in one place.

    Collected here rather than inlined so the reasons read as one list — this
    is the safety property, and it is easier to audit as a sequence of refusals
    than as guards scattered through the happy path.
    """
    detected = fields.tva_amount or Decimal("0")

    if fields.tva_amount is None:
        # Not the same as zero TVA. §12 is explicit that "no TVA detected" is
        # its own state and not a loading or an error one.
        return _review(Decimal("0"), "tva_amount_not_detected")

    failed = [c.code for c in checks if c.status is CheckStatus.FAILED]
    if failed:
        return _review(detected, *failed)

    if not fields.supplier_vat_number:
        return _review(detected, "supplier_vat_missing")

    if rule is None:
        return _review(detected, "category_unknown")

    return None


def classify(
    fields: ExtractedFields,
    checks: list[DocumentCheck],
    *,
    rules: dict[str, CategoryRule] | None = None,
) -> TvaClassification:
    """Propose a treatment for one expense. Never decides; only proposes."""
    rules = rules if rules is not None else BELGIAN_CATEGORY_RULES
    detected = fields.tva_amount or Decimal("0")
    rule = rules.get(fields.expense_category or "")

    blocked = _blocking_reason(fields, checks, rule)
    if blocked is not None:
        return blocked
    assert rule is not None  # narrowed by _blocking_reason, which returns on rule is None

    if rule.requires_confirmation:
        # A known cap the user still has to accept. The suggestion travels in
        # `deductible_percent`, so §8 can pre-fill the radio group and show
        # "€52.50 potentially recoverable" by applying it to
        # `detected_amount` — but `recoverable_amount` stays zero until someone
        # confirms, which is what keeps the analyzer's totals honest.
        return TvaClassification(
            treatment=RecoveryTreatment.REVIEW_REQUIRED,
            confidence=Confidence.MEDIUM,
            detected_amount=_round_money(detected),
            recoverable_amount=Decimal("0"),
            deductible_percent=rule.deductible_percent,
            reason_codes=[rule.reason_code or "confirmation_required"],
        )

    if rule.deductible_percent == Decimal("0"):
        return TvaClassification(
            treatment=RecoveryTreatment.NON_RECOVERABLE,
            confidence=Confidence.HIGH,
            detected_amount=_round_money(detected),
            recoverable_amount=Decimal("0"),
            deductible_percent=Decimal("0"),
            reason_codes=[rule.reason_code] if rule.reason_code else [],
        )

    recoverable = _round_money(detected * rule.deductible_percent / Decimal("100"))
    treatment = (
        RecoveryTreatment.RECOVERABLE
        if rule.deductible_percent == Decimal("100")
        else RecoveryTreatment.PARTIAL
    )
    confidence = (
        Confidence.HIGH
        if all(c.status is CheckStatus.PASSED for c in checks)
        else Confidence.MEDIUM
    )
    return TvaClassification(
        treatment=treatment,
        confidence=confidence,
        detected_amount=_round_money(detected),
        recoverable_amount=recoverable,
        deductible_percent=rule.deductible_percent,
        reason_codes=[rule.reason_code] if rule.reason_code else [],
    )
