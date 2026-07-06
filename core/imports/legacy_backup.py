"""Parse a `FinanceFlow BillGen` backup into normalized records.

The legacy app (React + localStorage) exports a JSON blob::

    {
      "app": "FinanceFlow BillGen",
      "version": "2.1.0-private",
      "schemaVersion": 1,
      "createdAt": "2026-01-02T...",
      "keys": {
        "billgen-companies": "[{...}, ...]",              # JSON *strings*
        "billgen-clients-<companyId>": "[{...}, ...]",
        "billgen-services-<companyId>": "[{...}, ...]",
        "billgen-invoices-<companyId>": "[{...}, ...]",
        ...
      }
    }

Every value in ``keys`` is itself a JSON string. This module tolerates callers
that pass the whole backup, just the ``keys`` map, or a map whose values are
already parsed (dicts/lists) rather than strings.

Pure: no framework, no I/O. Raises ``BusinessRuleError`` on structurally invalid
input so the API surfaces a 409 rather than a 500.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

APP_NAME = "FinanceFlow BillGen"

_COMPANIES_KEY = "billgen-companies"
_CLIENTS_PREFIX = "billgen-clients-"
_SERVICES_PREFIX = "billgen-services-"
_INVOICES_PREFIX = "billgen-invoices-"


@dataclass
class LegacyCompany:
    legacy_id: str
    raw: dict[str, Any]
    clients: list[dict[str, Any]] = field(default_factory=list)
    products: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class LegacyBackup:
    companies: list[LegacyCompany]
    invoices_detected: int


def _invalid(message: str) -> Exception:
    # Imported lazily: core.services depends on core.imports, so importing
    # core.services.errors at module load would create a cycle.
    from ..services.errors import BusinessRuleError  # noqa: PLC0415

    return BusinessRuleError(message)


def _load(value: Any) -> Any:
    """A stored value is normally a JSON string; be lenient if it's already
    decoded, or empty."""
    if value is None or value == "":
        return None
    if isinstance(value, str):
        try:
            return json.loads(value)
        except (json.JSONDecodeError, ValueError):
            return None
    return value


def _as_list(value: Any) -> list[dict[str, Any]]:
    parsed = _load(value)
    if not isinstance(parsed, list):
        return []
    return [item for item in parsed if isinstance(item, dict)]


def _extract_keys(data: Any) -> dict[str, Any]:
    if not isinstance(data, dict):
        raise _invalid("Import payload must be a JSON object")

    # An app-stamped backup: validate the stamp, then use its `keys` map.
    app = data.get("app")
    if isinstance(app, str) and app.strip() and app != APP_NAME:
        raise _invalid(f"Unrecognized backup app '{app}' (expected '{APP_NAME}')")

    # A full backup nests the data under `keys`; also allow the raw map directly.
    keys = data["keys"] if isinstance(data.get("keys"), dict) else data

    billgen_keys = {
        k: v for k, v in keys.items() if isinstance(k, str) and k.startswith("billgen-")
    }
    if not billgen_keys:
        raise _invalid("No 'billgen-*' data found in the import payload")
    return billgen_keys


def parse_backup(data: Any) -> LegacyBackup:
    """Normalize a backup into companies, each with its clients and products
    attached, plus a count of historical invoices (not imported in v1)."""
    keys = _extract_keys(data)

    companies_raw = _as_list(keys.get(_COMPANIES_KEY))
    companies: list[LegacyCompany] = []
    by_id: dict[str, LegacyCompany] = {}
    for raw in companies_raw:
        legacy_id = str(raw.get("id") or "")
        company = LegacyCompany(legacy_id=legacy_id, raw=raw)
        companies.append(company)
        if legacy_id:
            by_id[legacy_id] = company

    invoices_detected = 0
    for key, value in keys.items():
        if key.startswith(_CLIENTS_PREFIX):
            company = by_id.get(key[len(_CLIENTS_PREFIX) :])
            if company is not None:
                company.clients.extend(_as_list(value))
        elif key.startswith(_SERVICES_PREFIX):
            company = by_id.get(key[len(_SERVICES_PREFIX) :])
            if company is not None:
                company.products.extend(_as_list(value))
        elif key.startswith(_INVOICES_PREFIX):
            invoices_detected += len(_as_list(value))

    return LegacyBackup(companies=companies, invoices_detected=invoices_detected)
