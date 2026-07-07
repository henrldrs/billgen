from datetime import date
from decimal import Decimal
from types import SimpleNamespace

import pytest

from core.models import Client, Company, InvoiceLine, Organization, VATRate
from core.tenancy import organization_context
from db.engine import make_engine
from db.models import Base
from db.repositories import SqlAlchemyUnitOfWork
from db.session import make_session_factory

ISSUE_DATE = date(2026, 7, 4)


@pytest.fixture()
def env():
    """Seeded org + company + two clients, with the org context bound for the
    duration of the test."""
    engine = make_engine("sqlite://")
    Base.metadata.create_all(engine)
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
        client2 = Client(organization_id=org.id, company_id=company.id, name="Zeta Works")
        with uow_factory() as uow:
            uow.companies.add(company)
            uow.clients.add(client)
            uow.clients.add(client2)
            uow.commit()

        yield SimpleNamespace(
            uow_factory=uow_factory,
            org=org,
            company=company,
            client=client,
            client2=client2,
        )

    engine.dispose()


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
