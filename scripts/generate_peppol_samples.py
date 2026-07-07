"""Emit representative Peppol/UBL invoices from the current builder for external
validation (peppol.helger.com → VESID `eu.peppol.bis3:invoice`, newest version).

Pure: constructs domain models and calls `build_invoice_ubl` directly — no DB, no
gate. Run: `python -m scripts.generate_peppol_samples`. Output: `var/peppol_samples/`.

Files:
  nonbe_seller_multirate_discount.xml  NL seller  → vanilla BIS 3.0 (validates clean;
                                                    isolates the EN 16931 tax engine)
  be_seller_multirate_discount.xml     BE seller  → UBL.BE profile (expect a
                                                    CustomizationID note on the BIS ruleset)
  be_seller_single_rate.xml            BE seller  → baseline single 21% line
  be_seller_reverse_charge.xml         BE seller  → cross-border reverse charge (0% + reason)
"""

from datetime import date
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

from core.einvoicing.ubl_builder import build_invoice_ubl
from core.models import (
    Client,
    Company,
    Currency,
    Discount,
    DiscountType,
    Invoice,
    InvoiceLine,
    VATCategory,
    VATRate,
)

OUT = Path("var/peppol_samples")

ORG = uuid4()


def _company(country: str) -> Company:
    be = country == "BE"
    return Company(
        organization_id=ORG,
        name="Acme Consulting",
        legal_name="Acme Consulting SPRL" if be else "Acme Consulting BV",
        vat_number="BE0123456749" if be else "NL123456782B01",
        registration_number="0123456749" if be else None,
        email="billing@acme.example",
        address_line1="Rue de la Loi 1" if be else "Keizersgracht 1",
        postal_code="1000" if be else "1015",
        city="Bruxelles" if be else "Amsterdam",
        country_code=country,
        iban="BE68539007547034" if be else "NL91ABNA0417164300",
        bic="GKCCBEBB" if be else "ABNANL2A",
        invoice_reference_prefix="ACME-",
    )


def _client(country: str = "BE") -> Client:
    return Client(
        organization_id=ORG,
        company_id=uuid4(),
        name="Big Corp",
        vat_number="BE9876543265" if country == "BE" else "FR40303265045",
        email="ap@bigcorp.example",
        address_line1="Grote Markt 5",
        postal_code="2000",
        city="Antwerpen" if country == "BE" else "Paris",
        country_code=country,
    )


def _invoice(company: Company, client: Client, *, reference: str,
             lines: list[InvoiceLine], discount: Discount | None = None) -> Invoice:
    return Invoice(
        organization_id=ORG,
        company_id=uuid4(),
        client_id=client.company_id,
        reference=reference,
        sequence_global=1,
        issue_date=date(2026, 7, 4),
        due_date=date(2026, 8, 3),
        currency=Currency.EUR,
        lines=lines,
        invoice_discount=discount,
        payment_terms="30 days net",
    )


def _multirate_lines() -> list[InvoiceLine]:
    return [
        InvoiceLine(line_number=1, description="Consulting @21%",
                    quantity=Decimal("1"), unit_price=Decimal("1000.00"),
                    vat=VATRate(category=VATCategory.STANDARD, rate=Decimal("21"))),
        InvoiceLine(line_number=2, description="Printed matter @6%",
                    quantity=Decimal("1"), unit_price=Decimal("1000.00"),
                    vat=VATRate(category=VATCategory.STANDARD, rate=Decimal("6"))),
    ]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    tenpct = Discount(type=DiscountType.PERCENTAGE, value=Decimal("10"),
                      reason="Volume discount")

    samples: dict[str, str] = {}

    be, nl = _company("BE"), _company("NL")
    be_client, fr_client = _client("BE"), _client("FR")

    samples["nonbe_seller_multirate_discount.xml"] = build_invoice_ubl(
        _invoice(nl, be_client, reference="ACME-NL-2026-001",
                 lines=_multirate_lines(), discount=tenpct),
        nl, be_client,
    )
    samples["be_seller_multirate_discount.xml"] = build_invoice_ubl(
        _invoice(be, be_client, reference="ACME-BE-2026-001",
                 lines=_multirate_lines(), discount=tenpct),
        be, be_client,
    )
    samples["be_seller_single_rate.xml"] = build_invoice_ubl(
        _invoice(be, be_client, reference="ACME-BE-2026-002",
                 lines=[InvoiceLine(line_number=1, description="Consulting — July",
                                    quantity=Decimal("10"), unit_price=Decimal("125.00"),
                                    vat=VATRate(category=VATCategory.STANDARD,
                                                rate=Decimal("21")))]),
        be, be_client,
    )
    samples["be_seller_reverse_charge.xml"] = build_invoice_ubl(
        _invoice(be, fr_client, reference="ACME-BE-2026-003",
                 lines=[InvoiceLine(line_number=1, description="Cross-border consulting",
                                    quantity=Decimal("1"), unit_price=Decimal("1000.00"),
                                    vat=VATRate(category=VATCategory.REVERSE_CHARGE,
                                                rate=Decimal("0")))]),
        be, fr_client,
    )

    for name, xml in samples.items():
        (OUT / name).write_text(xml, encoding="utf-8")
        print(f"wrote {OUT / name}")


if __name__ == "__main__":
    main()
