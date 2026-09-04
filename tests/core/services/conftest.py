from datetime import date
from decimal import Decimal
from types import SimpleNamespace

import pytest

from conftest import dispose_test_engine, make_test_engine
from core.models import Client, Company, InvoiceLine, Organization, VATRate
from core.services import InvoiceService
from core.tenancy import organization_context
from db.repositories import SqlAlchemyUnitOfWork
from db.session import make_session_factory

ISSUE_DATE = date(2026, 7, 4)


@pytest.fixture()
def env():
    """Seeded org + company + two clients, with the org context bound for the
    duration of the test."""
    engine = make_test_engine()
    session_factory = make_session_factory(engine)

    def uow_factory() -> SqlAlchemyUnitOfWork:
        return SqlAlchemyUnitOfWork(session_factory)

    org = Organization(name="Acme SPRL")
    with uow_factory() as uow:
        uow.organizations.add(org)
        uow.commit()

    with organization_context(org.id):
        company = Company(
            organization_id=org.id,
            name="Acme Consulting",
            legal_name="Acme Consulting SPRL",
            vat_number="BE0123456749",  # mod-97 valid
            registration_number="0123456749",
            email="billing@acme.be",
            address_line1="Rue de la Loi 1",
            postal_code="1000",
            city="Bruxelles",
            iban="BE68539007547034",
            bic="GKCCBEBB",
            invoice_reference_prefix="ACME-",
        )
        client = Client(
            organization_id=org.id,
            company_id=company.id,
            name="Big Corp",
            vat_number="BE9876543265",  # mod-97 valid
            email="ap@bigcorp.be",
            address_line1="Grote Markt 5",
            postal_code="2000",
            city="Antwerpen",
        )
        # Filled in 2026-09-04, when issue() grew the legal completeness gate.
        # It used to be a bare name, because nothing had ever required more of a
        # client you send an invoice to — and two tests were issuing invoices to
        # it, which the gate correctly refuses: an invoice with no customer
        # address and no VAT number is not a VAT invoice. The fixtures were
        # producing documents the law forbids, and only now is that visible.
        client2 = Client(
            organization_id=org.id,
            company_id=company.id,
            name="Zeta Works",
            vat_number="BE0999999922",  # mod-97 valid
            address_line1="Havenlaan 12",
            postal_code="9000",
            city="Gent",
        )
        # The cross-border counterpart. Reverse charge and intra-Community
        # supply are only lawful towards a VAT-identified business in ANOTHER
        # member state, so every test of those categories needs a client like
        # this one — the Belgian default cannot stand in for it.
        client_nl = Client(
            organization_id=org.id,
            company_id=company.id,
            name="Van Dijk Holding BV",
            vat_number="NL123456789B01",
            address_line1="Keizersgracht 100",
            postal_code="1015 CS",
            city="Amsterdam",
            country_code="NL",
        )
        # A private individual: no VAT number and no obligation to have one.
        # Distinct from "a business whose VAT number is missing", which is a
        # blocking finding — `is_business` is what separates the two.
        client_b2c = Client(
            organization_id=org.id,
            company_id=company.id,
            name="Walk-in",
            address_line1="Somewhere 1",
            postal_code="1000",
            city="Bruxelles",
            is_business=False,
        )
        with uow_factory() as uow:
            uow.companies.add(company)
            uow.clients.add(client)
            uow.clients.add(client2)
            uow.clients.add(client_nl)
            uow.clients.add(client_b2c)
            uow.commit()

        yield SimpleNamespace(
            uow_factory=uow_factory,
            org=org,
            company=company,
            client=client,
            client2=client2,
            client_nl=client_nl,
            client_b2c=client_b2c,
        )

    dispose_test_engine(engine)


def issue_invoice(uow_factory, *, issue_date=ISSUE_DATE, lines=None, **kwargs):
    """Create a draft and immediately issue it — the common "I need an issued
    invoice" shortcut for downstream service tests (payments, credit notes, PDF,
    Peppol, reporting). Mirrors the old one-step create() behaviour."""
    service = InvoiceService(uow_factory)
    draft = service.create_draft(
        lines=lines if lines is not None else make_lines(),
        issue_date=issue_date,
        **kwargs,
    )
    return service.issue(draft.id, issue_date=issue_date)


def make_lines() -> list[InvoiceLine]:
    """10 x 125.00 @ 21% -> HT 1250.00, VAT 262.50, TTC 1512.50."""
    return [
        InvoiceLine(
            line_number=1,
            description="Consulting — July",
            quantity=Decimal("10"),
            unit_price=Decimal("125.00"),
            vat=VATRate(rate=Decimal("21")),
        )
    ]
