"""Phase 1 exit criterion — every domain model constructs from a golden dict.

Verifies:
    - Every model validates from a plain dict (the shape the API layer will pass).
    - Enums coerce from their string values.
    - Decimal / date / datetime coercion works as expected.
    - `extra = "forbid"` on DomainModel prevents unknown fields (schema drift guard).
"""

from datetime import UTC, datetime
from decimal import Decimal
from uuid import uuid4

import pytest
from pydantic import ValidationError

from core.models import (
    AuditAction,
    AuditLogEntry,
    BillingType,
    Client,
    Company,
    CreditNote,
    Currency,
    Discount,
    DiscountType,
    Invoice,
    InvoiceStatus,
    Organization,
    OrgMembership,
    Payment,
    PaymentMethod,
    PlanTier,
    Product,
    ProductStatus,
    Role,
    User,
    VATCategory,
    VATRate,
)

ORG_ID = uuid4()
USER_ID = uuid4()
COMPANY_ID = uuid4()
CLIENT_ID = uuid4()
PRODUCT_ID = uuid4()
INVOICE_ID = uuid4()


def test_organization():
    org = Organization.model_validate(
        {
            "id": ORG_ID,
            "name": "Acme SPRL",
            "country_code": "BE",
            "plan_tier": "starter",
        }
    )
    assert org.id == ORG_ID
    assert org.plan_tier is PlanTier.STARTER


def test_user_and_membership():
    user = User.model_validate(
        {"id": USER_ID, "email": "alice@example.com", "display_name": "Alice"}
    )
    assert user.email == "alice@example.com"
    assert user.is_active is True

    membership = OrgMembership.model_validate(
        {"organization_id": ORG_ID, "user_id": USER_ID, "role": "owner"}
    )
    assert membership.role is Role.OWNER


def test_currency_decimals():
    assert Currency.EUR.decimals == 2
    assert Currency.JPY.decimals == 0


def test_company():
    company = Company.model_validate(
        {
            "id": COMPANY_ID,
            "organization_id": ORG_ID,
            "name": "Acme Consulting",
            "vat_number": "BE0123456789",
            "iban": "BE68539007547034",
            "default_currency": "EUR",
            "default_language": "fr",
            "invoice_reference_prefix": "ACME-",
        }
    )
    assert company.default_currency is Currency.EUR
    assert company.default_language == "fr"


def test_client():
    client = Client.model_validate(
        {
            "id": CLIENT_ID,
            "organization_id": ORG_ID,
            "company_id": COMPANY_ID,
            "name": "Big Corp NV",
            "vat_number": "BE9876543210",
            "is_business": True,
        }
    )
    assert client.is_business is True
    assert client.company_id == COMPANY_ID


def test_product():
    product = Product.model_validate(
        {
            "id": PRODUCT_ID,
            "organization_id": ORG_ID,
            "company_id": COMPANY_ID,
            "name": "Consulting hour",
            "unit_price": "125.00",
            "currency": "EUR",
            "billing_type": "hourly",
            "status": "active",
            "default_vat_rate": "21.0",
            "tags": ["consulting", "senior"],
        }
    )
    assert product.billing_type is BillingType.HOURLY
    assert product.status is ProductStatus.ACTIVE
    assert product.unit_price == Decimal("125.00")


def test_vat_and_discount():
    vat = VATRate.model_validate({"category": "S", "rate": "21.0"})
    assert vat.category is VATCategory.STANDARD

    disc = Discount.model_validate({"type": "percentage", "value": "10"})
    assert disc.type is DiscountType.PERCENTAGE


def test_invoice_with_lines():
    invoice = Invoice.model_validate(
        {
            "id": INVOICE_ID,
            "organization_id": ORG_ID,
            "company_id": COMPANY_ID,
            "client_id": CLIENT_ID,
            "reference": "ACME-BC072026",
            "sequence_global": 142,
            "issue_date": "2026-07-04",
            "due_date": "2026-08-03",
            "currency": "EUR",
            "lines": [
                {
                    "line_number": 1,
                    "description": "Consulting — July",
                    "quantity": "10",
                    "unit_price": "125.00",
                    "product_id": str(PRODUCT_ID),
                    "vat": {"category": "S", "rate": "21.0"},
                }
            ],
            "pdf_template": "fr_standard",
        }
    )
    assert invoice.status is InvoiceStatus.DRAFT
    assert len(invoice.lines) == 1
    assert invoice.lines[0].vat.rate == Decimal("21.0")


def test_credit_note():
    credit_note = CreditNote.model_validate(
        {
            "organization_id": ORG_ID,
            "company_id": COMPANY_ID,
            "client_id": CLIENT_ID,
            "invoice_id": INVOICE_ID,
            "reference": "CN-ACME-2026/0001",
            "sequence_global": 1,
            "issue_date": "2026-07-05",
            "reason": "Cancellation of invoice at client's request",
            "lines": [
                {
                    "line_number": 1,
                    "description": "Consulting — July (voided)",
                    "quantity": "10",
                    "unit_price": "125.00",
                    "vat": {"category": "S", "rate": "21.0"},
                }
            ],
        }
    )
    assert credit_note.invoice_id == INVOICE_ID


def test_payment():
    payment = Payment.model_validate(
        {
            "organization_id": ORG_ID,
            "invoice_id": INVOICE_ID,
            "amount": "1512.50",
            "currency": "EUR",
            "method": "bank_transfer",
            "paid_on": "2026-07-20",
        }
    )
    assert payment.method is PaymentMethod.BANK_TRANSFER
    assert payment.amount == Decimal("1512.50")


def test_audit_log_entry():
    entry = AuditLogEntry.model_validate(
        {
            "organization_id": ORG_ID,
            "actor_user_id": USER_ID,
            "action": "create",
            "target_type": "invoice",
            "target_id": INVOICE_ID,
            "after": {"reference": "ACME-BC072026", "total_ttc": "1512.50"},
        }
    )
    assert entry.action is AuditAction.CREATE
    assert isinstance(entry.timestamp, datetime)
    assert entry.timestamp.tzinfo == UTC


def test_extra_fields_are_forbidden():
    with pytest.raises(ValidationError):
        Organization.model_validate({"name": "Acme", "unknown_field": "boom"})


def test_invoice_negative_price_rejected():
    with pytest.raises(ValidationError):
        Invoice.model_validate(
            {
                "organization_id": ORG_ID,
                "company_id": COMPANY_ID,
                "client_id": CLIENT_ID,
                "reference": "X-2026/0001",
                "sequence_global": 1,
                "issue_date": "2026-07-04",
                "lines": [
                    {
                        "line_number": 1,
                        "description": "Bad line",
                        "quantity": "1",
                        "unit_price": "-1.00",
                    }
                ],
            }
        )
