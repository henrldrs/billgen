from datetime import date
from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy.exc import IntegrityError

from core.models import (
    AuditAction,
    AuditLogEntry,
    Client,
    Company,
    Invoice,
    InvoiceLine,
    InvoiceStatus,
    Organization,
    Payment,
    Product,
    VATRate,
)
from core.repository import CREDIT_NOTE_SERIES, INVOICE_SERIES
from core.tenancy import TenantContextError, TenantViolationError, organization_context
from db.engine import make_engine
from db.models import Base
from db.repositories import SqlAlchemyUnitOfWork
from db.session import make_session_factory


@pytest.fixture()
def uow_factory():
    engine = make_engine("sqlite://")
    Base.metadata.create_all(engine)
    session_factory = make_session_factory(engine)

    def factory() -> SqlAlchemyUnitOfWork:
        return SqlAlchemyUnitOfWork(session_factory)

    yield factory
    engine.dispose()


def _seed_org(uow_factory, name="Acme SPRL") -> Organization:
    org = Organization(name=name)
    with uow_factory() as uow:
        uow.organizations.add(org)
        uow.commit()
    return org


def _seed_company(uow_factory, org) -> Company:
    company = Company(organization_id=org.id, name="Acme Consulting")
    with organization_context(org.id), uow_factory() as uow:
        uow.companies.add(company)
        uow.commit()
    return company


def _make_invoice(org, company, client, seq=1, reference="ACME-BC07012026") -> Invoice:
    return Invoice(
        organization_id=org.id,
        company_id=company.id,
        client_id=client.id,
        reference=reference,
        sequence_global=seq,
        issue_date=date(2026, 7, 4),
        lines=[
            InvoiceLine(
                line_number=1,
                description="Consulting — July",
                quantity=Decimal("10"),
                unit_price=Decimal("125.00"),
                vat=VATRate(rate=Decimal("21")),
            )
        ],
        subtotal_ht=Decimal("1250.00"),
        total_vat=Decimal("262.50"),
        total_ttc=Decimal("1512.50"),
    )


def test_organization_roundtrip(uow_factory):
    org = _seed_org(uow_factory)
    with uow_factory() as uow:
        fetched = uow.organizations.get(org.id)
    assert fetched is not None
    assert fetched.name == "Acme SPRL"


def test_tenant_context_required(uow_factory):
    with uow_factory() as uow, pytest.raises(TenantContextError):
        uow.clients.list()


def test_add_with_mismatched_org_raises(uow_factory):
    org = _seed_org(uow_factory)
    rogue = Client(organization_id=uuid4(), company_id=uuid4(), name="Rogue")
    with organization_context(org.id), uow_factory() as uow, pytest.raises(TenantViolationError):
        uow.clients.add(rogue)


def test_company_client_product_crud(uow_factory):
    org = _seed_org(uow_factory)
    company = _seed_company(uow_factory, org)

    client = Client(organization_id=org.id, company_id=company.id, name="Big Corp NV")
    product = Product(
        organization_id=org.id,
        company_id=company.id,
        name="Consulting hour",
        unit_price=Decimal("125.00"),
        default_vat_rate=Decimal("21.0"),
    )
    with organization_context(org.id):
        with uow_factory() as uow:
            uow.clients.add(client)
            uow.products.add(product)
            uow.commit()

        with uow_factory() as uow:
            assert [c.name for c in uow.companies.list()] == ["Acme Consulting"]
            assert [c.name for c in uow.clients.list(company.id)] == ["Big Corp NV"]
            products = uow.products.list(company.id)
            assert products[0].unit_price == Decimal("125.00")

            renamed = client.model_copy(update={"name": "Bigger Corp NV"})
            uow.clients.update(renamed)
            uow.commit()

        with uow_factory() as uow:
            assert uow.clients.get(client.id).name == "Bigger Corp NV"


def test_sequence_gapless_across_transactions(uow_factory):
    org = _seed_org(uow_factory)
    company = _seed_company(uow_factory, org)

    with organization_context(org.id):
        with uow_factory() as uow:
            assert uow.sequences.next_value(company.id, INVOICE_SERIES) == 1
            uow.commit()
        with uow_factory() as uow:
            assert uow.sequences.next_value(company.id, INVOICE_SERIES) == 2
            # independent series
            assert uow.sequences.next_value(company.id, CREDIT_NOTE_SERIES) == 1
            uow.commit()


def test_invoice_roundtrip_with_lines(uow_factory):
    org = _seed_org(uow_factory)
    company = _seed_company(uow_factory, org)
    client = Client(organization_id=org.id, company_id=company.id, name="Big Corp")

    with organization_context(org.id):
        with uow_factory() as uow:
            uow.clients.add(client)
            uow.invoices.add(_make_invoice(org, company, client))
            uow.commit()

        with uow_factory() as uow:
            invoices = uow.invoices.list(company.id)
            assert len(invoices) == 1
            invoice = invoices[0]
            assert invoice.reference == "ACME-BC07012026"
            assert invoice.total_ttc == Decimal("1512.50")
            assert len(invoice.lines) == 1
            assert invoice.lines[0].quantity == Decimal("10")
            assert invoice.lines[0].vat.rate == Decimal("21")

            by_ref = uow.invoices.get_by_reference(company.id, "ACME-BC07012026")
            assert by_ref is not None and by_ref.id == invoice.id


def test_invoice_void_update(uow_factory):
    org = _seed_org(uow_factory)
    company = _seed_company(uow_factory, org)
    client = Client(organization_id=org.id, company_id=company.id, name="Big Corp")

    with organization_context(org.id):
        with uow_factory() as uow:
            uow.clients.add(client)
            saved = uow.invoices.add(_make_invoice(org, company, client))
            uow.commit()

        voided = saved.model_copy(
            update={"status": InvoiceStatus.VOIDED, "voided_reason": "test void"}
        )
        with uow_factory() as uow:
            uow.invoices.update(voided)
            uow.commit()

        with uow_factory() as uow:
            fetched = uow.invoices.get(saved.id)
            assert fetched.status is InvoiceStatus.VOIDED
            assert fetched.voided_reason == "test void"


def test_duplicate_reference_rejected(uow_factory):
    org = _seed_org(uow_factory)
    company = _seed_company(uow_factory, org)
    client = Client(organization_id=org.id, company_id=company.id, name="Big Corp")

    with organization_context(org.id):
        with uow_factory() as uow:
            uow.clients.add(client)
            uow.invoices.add(_make_invoice(org, company, client, seq=1))
            uow.commit()
        with uow_factory() as uow, pytest.raises(IntegrityError):
            uow.invoices.add(_make_invoice(org, company, client, seq=2))


def test_tenant_isolation(uow_factory):
    org_a = _seed_org(uow_factory, "Org A")
    org_b = _seed_org(uow_factory, "Org B")
    company_a = _seed_company(uow_factory, org_a)

    client_a = Client(organization_id=org_a.id, company_id=company_a.id, name="A-client")
    with organization_context(org_a.id), uow_factory() as uow:
        uow.clients.add(client_a)
        uow.commit()

    with organization_context(org_b.id), uow_factory() as uow:
        assert uow.clients.list() == []
        assert uow.clients.get(client_a.id) is None


def test_payments_and_audit_log(uow_factory):
    org = _seed_org(uow_factory)
    company = _seed_company(uow_factory, org)
    client = Client(organization_id=org.id, company_id=company.id, name="Big Corp")

    with organization_context(org.id):
        with uow_factory() as uow:
            uow.clients.add(client)
            invoice = uow.invoices.add(_make_invoice(org, company, client))
            uow.payments.add(
                Payment(
                    organization_id=org.id,
                    invoice_id=invoice.id,
                    amount=Decimal("1512.50"),
                    paid_on=date(2026, 7, 20),
                )
            )
            uow.audit_log.append(
                AuditLogEntry(
                    organization_id=org.id,
                    action=AuditAction.CREATE,
                    target_type="invoice",
                    target_id=invoice.id,
                    after={"reference": invoice.reference, "total_ttc": "1512.50"},
                )
            )
            uow.commit()

        with uow_factory() as uow:
            payments = uow.payments.list_for_invoice(invoice.id)
            assert len(payments) == 1
            assert payments[0].amount == Decimal("1512.50")

            entries = uow.audit_log.list(target_type="invoice")
            assert len(entries) == 1
            assert entries[0].action is AuditAction.CREATE
            assert entries[0].after["reference"] == invoice.reference
