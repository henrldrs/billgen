"""Is this invoice legally complete, and may it be issued?

The gap this closes: ``InvoiceService.issue`` is irreversible. It consumes the
gapless number, freezes the lines and totals, and writes an ``issue`` audit
entry — all in one transaction that cannot be undone, only reversed by a credit
note. Until now nothing checked, before that transaction, whether the document
about to be frozen carried the mentions Belgian law requires of it. The one
existing gate — ``peppol_validation`` — fires at *XML export*, which is long
after the invoice exists and never runs at all for a PDF-only customer.

So this module answers the question twice, in one shape:

* **Before issue**, as the gate. A blocking finding refuses the transition.
* **After issue**, as the record. The same call on an issued invoice reports
  what it carries; it can no longer refuse anything, and it is the "provable
  after" half of the product's claim.

Severity is the whole design. A **blocking** finding means the document would
not be a valid VAT invoice — a statutory mention is absent, or two of its own
statements contradict each other. An **advisory** finding means the invoice is
legally fine and practically worse: nobody can pay it, or nothing states the
payment term the late-interest claim rests on. Advisories never refuse
anything, because a rule we got wrong must not be able to wall someone in.

Statutory basis is Belgian: AR n° 1 du 29 décembre 1992, art. 5 (KB nr. 1,
art. 5), which enumerates the mandatory mentions, and art. 39bis / 51 §2 CTVA
for the exemption and reverse-charge cases. **A licensed Belgian accountant
should sign off on this list before public launch** — the same caveat that
already sits on top of ``core/rules/belgian_legal.py``, and for the same
reason: the wording and the enumeration are a legal claim, not a code review.

Pure: domain models in, dataclasses out. No I/O, no framework, no session.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from enum import Enum

from ..models import Client, Company, Invoice, InvoiceStatus, VATCategory
from ..rules import (
    EU_MEMBER_STATES,
    canonicalize_vat,
    is_iso_country_code,
    legal_mention_for,
    validate_belgian_vat,
    validate_bic,
    validate_iban,
)

#: Categories whose *only* correct rate is zero. Charging VAT on a line that
#: also declares the transaction untaxed makes the document contradict itself,
#: and the reader cannot tell which half is the mistake.
_ZERO_RATED: frozenset[VATCategory] = frozenset(
    {
        VATCategory.ZERO,
        VATCategory.EXEMPT,
        VATCategory.REVERSE_CHARGE,
        VATCategory.INTRA_EU,
        VATCategory.EXPORT,
        VATCategory.NOT_SUBJECT,
    }
)

#: Categories that shift the tax onto a customer in another member state. Each
#: requires that customer's own VAT identification number *on the invoice* —
#: without it the exemption has nothing to rest on.
_NEEDS_CUSTOMER_VAT: frozenset[VATCategory] = frozenset(
    {VATCategory.REVERSE_CHARGE, VATCategory.INTRA_EU}
)


class ComplianceSeverity(str, Enum):
    """`blocking` refuses the issue; `advisory` is reported and ignored."""

    BLOCKING = "blocking"
    ADVISORY = "advisory"


@dataclass(frozen=True)
class ComplianceFinding:
    """One thing wrong with the document.

    ``field`` is dotted and addresses the *record that must change*, not the
    invoice — ``company.vat_number`` sends someone to company settings,
    ``client.address`` to the client, ``line.3.vat`` to a line. A findings list
    whose entries cannot be acted on is a complaint, not a check.

    ``message_key`` is a stable i18n key; the wording lives in the frontend.
    ``legal_basis`` is the citation, carried so a screen can show *why* rather
    than only *what* — which is the difference between a validation error and a
    compliance product.
    """

    field: str
    severity: ComplianceSeverity
    message_key: str
    legal_basis: str | None = None


@dataclass(frozen=True)
class InvoiceCompliance:
    """The verdict.

    ``conforming`` is "no blocking findings" — it says the document carries its
    mandatory mentions, and deliberately says nothing about whether the numbers
    are the right numbers. ``issuable`` is the same boolean read as a gate, and
    is False for an invoice that is not a draft for a different reason: an
    already-issued invoice cannot be issued again.
    """

    invoice_id: object
    status: str
    conforming: bool
    issuable: bool
    findings: list[ComplianceFinding] = field(default_factory=list)

    @property
    def blocking(self) -> list[ComplianceFinding]:
        return [f for f in self.findings if f.severity is ComplianceSeverity.BLOCKING]


def _blank(value: str | None) -> bool:
    return not (value or "").strip()


def _valid_vat(vat: str | None, country: str) -> bool:
    if country == "BE":
        return validate_belgian_vat(vat) is not None
    return bool(canonicalize_vat(vat, country))


# ────────────────────────────────────────────────────────────── the supplier

def _check_supplier(company: Company) -> list[ComplianceFinding]:
    findings: list[ComplianceFinding] = []
    art5_3 = "AR n° 1, art. 5, §1, 3° — identification du fournisseur"

    if _blank(company.legal_name) and _blank(company.name):
        findings.append(
            ComplianceFinding(
                "company.name",
                ComplianceSeverity.BLOCKING,
                "errSupplierName",
                art5_3,
            )
        )
    if _blank(company.address_line1) or _blank(company.city):
        findings.append(
            ComplianceFinding(
                "company.address",
                ComplianceSeverity.BLOCKING,
                "errSupplierAddress",
                art5_3,
            )
        )

    country = (company.country_code or "BE").upper()
    if not is_iso_country_code(country):
        findings.append(
            ComplianceFinding(
                "company.country_code",
                ComplianceSeverity.BLOCKING,
                "errSupplierCountry",
                art5_3,
            )
        )
    elif _blank(company.vat_number):
        findings.append(
            ComplianceFinding(
                "company.vat_number",
                ComplianceSeverity.BLOCKING,
                "errSupplierVatMissing",
                art5_3,
            )
        )
    elif not _valid_vat(company.vat_number, country):
        findings.append(
            ComplianceFinding(
                "company.vat_number",
                ComplianceSeverity.BLOCKING,
                "errSupplierVatInvalid",
                art5_3,
            )
        )

    # Advisory from here down: none of it makes the document invalid, all of it
    # makes it worse.
    if _blank(company.iban):
        findings.append(
            ComplianceFinding(
                "company.iban",
                ComplianceSeverity.ADVISORY,
                "warnSupplierIbanMissing",
            )
        )
    elif validate_iban(company.iban) is None:
        findings.append(
            ComplianceFinding(
                "company.iban",
                ComplianceSeverity.ADVISORY,
                "warnSupplierIbanInvalid",
            )
        )
    if not _blank(company.bic) and validate_bic(company.bic) is None:
        findings.append(
            ComplianceFinding("company.bic", ComplianceSeverity.ADVISORY, "warnSupplierBicInvalid")
        )

    return findings


# ────────────────────────────────────────────────────────────── the customer

def _check_customer(client: Client, categories: set[VATCategory]) -> list[ComplianceFinding]:
    findings: list[ComplianceFinding] = []
    art5_3 = "AR n° 1, art. 5, §1, 3° — identification du client"

    if _blank(client.name):
        findings.append(
            ComplianceFinding("client.name", ComplianceSeverity.BLOCKING, "errCustomerName", art5_3)
        )
    if _blank(client.address_line1) or _blank(client.city):
        findings.append(
            ComplianceFinding(
                "client.address",
                ComplianceSeverity.BLOCKING,
                "errCustomerAddress",
                art5_3,
            )
        )

    country = (client.country_code or "").upper()
    if not is_iso_country_code(country):
        findings.append(
            ComplianceFinding(
                "client.country_code",
                ComplianceSeverity.BLOCKING,
                "errCustomerCountry",
                art5_3,
            )
        )

    # A VAT number is mandatory for a taxable customer, and mandatory *twice
    # over* when a line shifts the tax onto them: the exemption is granted on
    # the strength of that identification.
    shifts_tax = bool(categories & _NEEDS_CUSTOMER_VAT)
    if _blank(client.vat_number):
        if shifts_tax:
            findings.append(
                ComplianceFinding(
                    "client.vat_number",
                    ComplianceSeverity.BLOCKING,
                    "errCustomerVatRequiredForShift",
                    "Art. 39bis / 51 §2 CTVA — identification du cocontractant",
                )
            )
        elif client.is_business:
            findings.append(
                ComplianceFinding(
                    "client.vat_number",
                    ComplianceSeverity.BLOCKING,
                    "errCustomerVatMissing",
                    art5_3,
                )
            )
        # A private individual with no VAT number is a correct B2C invoice.
    elif is_iso_country_code(country) and not _valid_vat(client.vat_number, country):
        findings.append(
            ComplianceFinding(
                "client.vat_number",
                ComplianceSeverity.BLOCKING,
                "errCustomerVatInvalid",
                art5_3,
            )
        )

    return findings


# ───────────────────────────────────────────────────────────────── the lines

def _check_lines(
    invoice: Invoice, company: Company, client: Client, lang: str
) -> list[ComplianceFinding]:
    findings: list[ComplianceFinding] = []

    if not invoice.lines:
        findings.append(
            ComplianceFinding(
                "lines",
                ComplianceSeverity.BLOCKING,
                "errNoLines",
                "AR n° 1, art. 5, §1, 6° — dénomination des biens ou services",
            )
        )
        return findings

    supplier_country = (company.country_code or "BE").upper()
    customer_country = (client.country_code or "").upper()

    for line in invoice.lines:
        where = f"line.{line.line_number}.vat"
        category = line.vat.category

        # A line that declares itself untaxed and then charges tax. Both halves
        # print on the document, and a reader cannot tell which is the error.
        if category in _ZERO_RATED and line.vat.rate > Decimal("0"):
            findings.append(
                ComplianceFinding(
                    where,
                    ComplianceSeverity.BLOCKING,
                    "errZeroRatedLineTaxed",
                    "AR n° 1, art. 5, §1, 8° — taux et montant de la taxe",
                )
            )

        # The mention itself. `core/pdf/context.py` derives it from the category
        # at render time, so this cannot normally be missing — it is checked
        # because "the exempting mention is printed" is the single sentence that
        # makes a zero-rated invoice lawful, and a table that grows a category
        # without a mention must fail loudly rather than ship a silent zero.
        if (
            category in _ZERO_RATED
            and category is not VATCategory.ZERO
            and legal_mention_for(category, lang) is None
        ):
            findings.append(
                    ComplianceFinding(
                        where,
                        ComplianceSeverity.BLOCKING,
                        "errMissingLegalMention",
                        "AR n° 1, art. 5, §1, 9° — mention de l'exemption",
                    )
                )

        # Reverse charge onto a domestic customer is not reverse charge. The
        # composer defaults the category from the server, but a draft written
        # before that shipped — or edited by hand — can still say this.
        if (
            category is VATCategory.REVERSE_CHARGE
            and customer_country == supplier_country
        ):
            findings.append(
                ComplianceFinding(
                    where,
                    ComplianceSeverity.BLOCKING,
                    "errReverseChargeDomestic",
                    "Art. 51 §2, 5° CTVA — cocontractant établi dans un autre État membre",
                )
            )

        if category is VATCategory.INTRA_EU and customer_country not in EU_MEMBER_STATES:
            findings.append(
                ComplianceFinding(
                    where,
                    ComplianceSeverity.BLOCKING,
                    "errIntraEuOutsideEu",
                    "Art. 39bis CTVA — livraison vers un autre État membre",
                )
            )

        # The inverse of item 8's fix, and advisory rather than blocking: Belgian
        # VAT charged to an identified business elsewhere in the EU is usually
        # the reverse-charge default not having been taken, but it is genuinely
        # correct for some services, so it is reported and not refused.
        if (
            category is VATCategory.STANDARD
            and client.is_business
            and not _blank(client.vat_number)
            and customer_country != supplier_country
            and customer_country in EU_MEMBER_STATES
        ):
            findings.append(
                ComplianceFinding(where, ComplianceSeverity.ADVISORY, "warnDomesticVatToEuBusiness")
            )

    return findings


# ────────────────────────────────────────────────────────────── the document

def _check_document(invoice: Invoice) -> list[ComplianceFinding]:
    findings: list[ComplianceFinding] = []

    if invoice.due_date is None:
        # Not statutory. It matters because the statutory late interest of the
        # loi du 2 août 2002 runs from a due date, and issue() otherwise
        # silently invents one 30 days out.
        findings.append(
            ComplianceFinding("invoice.due_date", ComplianceSeverity.ADVISORY, "warnNoDueDate")
        )
    elif invoice.issue_date is not None and invoice.due_date < invoice.issue_date:
        findings.append(
            ComplianceFinding("invoice.due_date", ComplianceSeverity.BLOCKING, "errDueBeforeIssue")
        )

    if _blank(invoice.payment_terms):
        findings.append(
            ComplianceFinding(
                "invoice.payment_terms",
                ComplianceSeverity.ADVISORY,
                "warnNoPaymentTerms",
            )
        )

    return findings


def check_invoice_compliance(
    invoice: Invoice,
    company: Company,
    client: Client,
    *,
    lang: str | None = None,
) -> InvoiceCompliance:
    """Every mandatory mention this invoice would carry, and what is missing.

    ``lang`` selects which language the mandatory mention is looked up in;
    it defaults to the company's own, which is the language the PDF renders in.
    """
    lang = lang or company.default_language or "fr"
    categories = {line.vat.category for line in invoice.lines}

    findings = [
        *_check_supplier(company),
        *_check_customer(client, categories),
        *_check_lines(invoice, company, client, lang),
        *_check_document(invoice),
    ]

    conforming = not any(f.severity is ComplianceSeverity.BLOCKING for f in findings)
    return InvoiceCompliance(
        invoice_id=invoice.id,
        status=invoice.status.value,
        conforming=conforming,
        issuable=conforming and invoice.status is InvoiceStatus.DRAFT,
        findings=findings,
    )
