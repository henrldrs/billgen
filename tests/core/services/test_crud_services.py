from decimal import Decimal

from core.models import Client, Company, Organization, Product
from core.services import (
    ActivityService,
    ClientService,
    CompanyService,
    OrganizationService,
    ProductService,
)
from core.tenancy import organization_context


def test_company_crud_with_audit(env):
    service = CompanyService(env.uow_factory)
    company = service.create(Company(organization_id=env.org.id, name="Second Co"))
    renamed = service.update(company.model_copy(update={"name": "Second Company"}))
    assert renamed.name == "Second Company"
    assert {c.name for c in service.list()} == {"Acme Consulting", "Second Company"}

    entries = ActivityService(env.uow_factory).list(target_type="company")
    actions = [entry.action.value for entry in entries]
    assert "create" in actions and "update" in actions


def test_client_and_product_crud(env):
    clients = ClientService(env.uow_factory)
    products = ProductService(env.uow_factory)

    client = clients.create(
        Client(organization_id=env.org.id, company_id=env.company.id, name="New Client")
    )
    assert clients.get(client.id).name == "New Client"

    product = products.create(
        Product(
            organization_id=env.org.id,
            company_id=env.company.id,
            name="Audit day",
            unit_price=Decimal("800.00"),
            default_vat_rate=Decimal("21.0"),
        )
    )
    updated = products.update(product.model_copy(update={"unit_price": Decimal("850.00")}))
    assert updated.unit_price == Decimal("850.00")
    assert len(products.list(env.company.id)) == 1


def test_organization_service_creates_tenant_outside_context(env):
    # No organization_context wrapper here — signup happens pre-tenant.
    service = OrganizationService(env.uow_factory)
    org = service.create(name="Fresh Org")
    assert service.get(org.id).name == "Fresh Org"

    with organization_context(org.id):
        entries = ActivityService(env.uow_factory).list(target_type="organization")
    assert len(entries) == 1
    assert entries[0].after["name"] == "Fresh Org"


def test_organization_service_runs_inside_foreign_context_too(env):
    # A staff/admin flow may create an org while another org context is bound;
    # the audit entry must land in the NEW org, not the bound one.
    service = OrganizationService(env.uow_factory)
    org = service.create(name="Nested Org")
    with organization_context(org.id):
        entries = ActivityService(env.uow_factory).list(target_type="organization")
    assert [e.after["name"] for e in entries] == ["Nested Org"]
