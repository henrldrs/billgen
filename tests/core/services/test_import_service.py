import json
from decimal import Decimal
from uuid import uuid4

import pytest

from core.imports import parse_backup
from core.imports.mappers import map_company
from core.models import BillingType, Currency, ProductStatus
from core.services import ActivityService, ClientService, ImportService, ProductService
from core.services.errors import BusinessRuleError


def _backup(companies, clients=None, services=None, invoices=None):
    """Build a FinanceFlow BillGen backup with per-company keyed data."""
    keys = {"billgen-companies": json.dumps(companies)}
    for cid, rows in (clients or {}).items():
        keys[f"billgen-clients-{cid}"] = json.dumps(rows)
    for cid, rows in (services or {}).items():
        keys[f"billgen-services-{cid}"] = json.dumps(rows)
    for cid, rows in (invoices or {}).items():
        keys[f"billgen-invoices-{cid}"] = json.dumps(rows)
    return {
        "app": "FinanceFlow BillGen",
        "version": "2.1.0-private",
        "schemaVersion": 1,
        "createdAt": "2026-01-02T10:00:00.000Z",
        "keys": keys,
    }


SAMPLE = _backup(
    companies=[
        {
            "id": "company-1",
            "name": "Legacy Studio",
            "address": "Rue Haute 12, Brussels",
            "email": "hello@legacy.be",
            "phone": "+32 2 000 00 00",
            "vat": "BE0123456789",
            "iban": "BE68539007547034",
            "bic": "GKCCBEBB",
            "prefix": "LS-",
            "footer": "Merci",
            "currency": "EUR",
            "language": "French",
            "defaultTemplate": "C",
        }
    ],
    clients={
        "company-1": [
            {"id": "mc1", "companyId": "company-1", "name": "Acme Corp",
             "address": "Zone 5", "email": "ap@acme.com", "country": "USA", "vat": ""},
            {"id": "mc2", "companyId": "company-1", "name": "TechNova BVBA",
             "address": "Koningsstraat 10", "country": "Belgium", "vat": "BE9876543210"},
        ]
    },
    services={
        "company-1": [
            {"id": "svc1", "companyId": "company-1", "description": "Consulting day",
             "shortDescription": "Advisory", "category": "Services", "price": 800,
             "quantity": 1, "billingType": "Daily", "status": "Active",
             "pipeline": "Delivery", "tags": ["hot"]},
            {"id": "svc2", "companyId": "company-1", "description": "Website",
             "price": "1500.50", "billingType": "Fixed", "status": "Draft", "tags": []},
        ]
    },
    invoices={
        "company-1": [
            {"reference": "LS-AC012026", "clientId": "mc1", "clientName": "Acme Corp",
             "vatRate": 21, "lines": [], "total": 968, "createdAt": "2026-01-05"},
        ]
    },
)


def test_parse_backup_normalizes_shape():
    backup = parse_backup(SAMPLE)
    assert len(backup.companies) == 1
    company = backup.companies[0]
    assert company.legacy_id == "company-1"
    assert len(company.clients) == 2
    assert len(company.products) == 2
    assert backup.invoices_detected == 1


def test_map_company_normalizes_enums_and_country():
    raw = json.loads(SAMPLE["keys"]["billgen-companies"])[0]
    company = map_company(raw, organization_id=uuid4())
    assert company.default_language == "fr"
    assert company.default_pdf_template == "nl_minimal"  # legacy "C" (Dutch)
    assert company.default_currency == Currency.EUR
    assert company.invoice_reference_prefix == "LS-"
    assert company.country_code == "BE"


def test_preview_writes_nothing_but_predicts_counts(env):
    report = ImportService(env.uow_factory).preview(SAMPLE)
    assert report.dry_run is True
    assert report.companies.created == 1
    assert report.clients.created == 2
    assert report.products.created == 2
    assert report.invoices_detected == 1
    # Nothing persisted: the pre-existing company set is unchanged.
    from core.services import CompanyService

    assert {c.name for c in CompanyService(env.uow_factory).list()} == {"Acme Consulting"}


def test_commit_persists_and_maps_fields(env):
    report = ImportService(env.uow_factory).commit(SAMPLE, actor_user_id=None)
    assert report.dry_run is False
    assert (report.companies.created, report.clients.created, report.products.created) == (1, 2, 2)

    from core.services import CompanyService

    company = next(c for c in CompanyService(env.uow_factory).list() if c.name == "Legacy Studio")
    clients = ClientService(env.uow_factory).list(company_id=company.id)
    products = ProductService(env.uow_factory).list(company_id=company.id)

    acme = next(c for c in clients if c.name == "Acme Corp")
    assert acme.country_code == "US"
    assert acme.is_business is False  # no VAT -> B2C

    technova = next(c for c in clients if c.name == "TechNova BVBA")
    assert technova.country_code == "BE"
    assert technova.is_business is True

    consulting = next(p for p in products if p.name == "Consulting day")
    assert consulting.unit_price == Decimal("800")
    assert consulting.billing_type == BillingType.DAILY
    assert consulting.status == ProductStatus.ACTIVE
    assert consulting.description == "Advisory"

    website = next(p for p in products if p.name == "Website")
    assert website.unit_price == Decimal("1500.50")
    assert website.status == ProductStatus.DRAFT


def test_commit_is_idempotent(env):
    service = ImportService(env.uow_factory)
    service.commit(SAMPLE)
    second = service.commit(SAMPLE)
    assert (second.companies.created, second.clients.created, second.products.created) == (0, 0, 0)
    assert (second.companies.skipped, second.clients.skipped, second.products.skipped) == (1, 2, 2)

    from core.services import CompanyService

    names = [c.name for c in CompanyService(env.uow_factory).list()]
    assert names.count("Legacy Studio") == 1


def test_commit_writes_audit_entries(env):
    ImportService(env.uow_factory).commit(SAMPLE)
    actions = [e.action.value for e in ActivityService(env.uow_factory).list()]
    assert "import" in actions
    assert actions.count("create") >= 5  # 1 company + 2 clients + 2 products


def test_bad_rows_become_issues_not_failures(env):
    backup = _backup(
        companies=[{"id": "c1", "name": "Fine Co"}],
        services={"c1": [
            {"id": "s1", "description": "", "price": 10},          # no name
            {"id": "s2", "description": "Cheap", "price": -5},      # negative price
            {"id": "s3", "description": "Good", "price": 10},
        ]},
    )
    report = ImportService(env.uow_factory).commit(backup)
    assert report.products.created == 1
    assert report.products.failed == 2
    reasons = {i.reason for i in report.issues}
    assert any("name" in r for r in reasons)
    assert any("negative" in r for r in reasons)


def test_invalid_payload_raises_business_rule_error(env):
    with pytest.raises(BusinessRuleError):
        ImportService(env.uow_factory).preview({"app": "SomethingElse", "keys": {}})
    with pytest.raises(BusinessRuleError):
        ImportService(env.uow_factory).preview({"nothing": "here"})


def test_accepts_bare_keys_map(env):
    bare = SAMPLE["keys"]
    report = ImportService(env.uow_factory).preview(bare)
    assert report.companies.created == 1
