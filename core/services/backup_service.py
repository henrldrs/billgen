"""Whole-organization logical backup (JSON) and disaster-recovery restore.

Design of record: docs/ARCHITECTURE/ADR-0003-backup-restore.md. The rules that
matter:

- The backup is organization-scoped and portable across SQLite/Postgres.
  Restore mints fresh UUIDs through one consistent remap (same input id →
  same output id everywhere, including monthly-bucket sequence scopes), so
  cross-references hold but nothing can collide with rows already in the
  target database — not even the source organization itself.
- Restore ONLY into an organization with no companies. Merging invoice history
  into live data could mint duplicate gapless numbers or leave gaps — both
  Belgian VAT violations — so restore is disaster recovery, not sync.
- Sequence counters travel verbatim (never recomputed from the data: a voided
  invoice legitimately leaves the counter ahead of what the rows suggest).
- Users and credentials are deliberately NOT part of the backup.
- Since T-27 the payload carries the *document register* — path, hash and size
  of every file written outside the database — but not the files themselves.
  A restore therefore knows exactly which documents should exist and reports
  the ones that do not, rather than failing on a folder it was never given.
  Carrying the bytes is T-28's job, where they travel encrypted —
  `export_portable` and `restore_portable` below, which wrap this same JSON
  rather than inventing a second format.
"""

from __future__ import annotations

import json
import re
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, ValidationError

from ..backup import container, sealed
from ..documents import DocumentArchive, sha256_of
from ..models import (
    AuditAction,
    AuditLogEntry,
    Client,
    Company,
    CreditNote,
    Document,
    Invoice,
    Payment,
    Product,
    Quote,
)
from ..repository import UnitOfWork
from ..tenancy import current_organization_id
from . import _audit
from .errors import BusinessRuleError

BACKUP_FORMAT = "billgen-backup"
# 2 adds "quotes"; 3 adds "documents". An older file restores unchanged — it
# simply has none of the newer collections — so all three are accepted; only
# the newest is written.
SCHEMA_VERSION = 3
SUPPORTED_SCHEMA_VERSIONS = (1, 2, 3)

# The audit log is exported in full; this is only a sanity ceiling.
_AUDIT_EXPORT_LIMIT = 1_000_000

_UUID_RE = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)
# Monthly display-reference counters embed a client UUID in the scope string.
_BUCKET_SCOPE_RE = re.compile(r"^(bucket:)([0-9a-fA-F-]{36})(:.+)$")


def _remap_ids(value: Any, ids: dict[str, str]) -> Any:
    """Deep-copy `value`, replacing every UUID-shaped string via one shared
    map (minting fresh UUIDs on first sight). Identical inputs map to
    identical outputs, so entity ids and every reference to them stay
    consistent while never colliding with existing rows. Audit before/after
    JSON is walked too, keeping its embedded references coherent."""
    if isinstance(value, dict):
        return {key: _remap_ids(item, ids) for key, item in value.items()}
    if isinstance(value, list):
        return [_remap_ids(item, ids) for item in value]
    if isinstance(value, str):
        if _UUID_RE.match(value):
            return ids.setdefault(value.lower(), str(uuid4()))
        bucket = _BUCKET_SCOPE_RE.match(value)
        if bucket:
            remapped = ids.setdefault(bucket.group(2).lower(), str(uuid4()))
            return f"{bucket.group(1)}{remapped}{bucket.group(3)}"
    return value


class RestoreReport(BaseModel):
    companies: int = 0
    clients: int = 0
    products: int = 0
    invoices: int = 0
    quotes: int = 0
    credit_notes: int = 0
    payments: int = 0
    documents: int = 0
    #  Files whose bytes travelled in the archive and were written back.
    documents_restored: int = 0
    sequences: int = 0
    audit_entries: int = 0
    #  Registered files whose bytes are not where the register says they are.
    #  A restore reports them and completes: the invoice data is in the rows,
    #  and a missing PDF is a lost copy, not a lost record.
    missing_documents: list[str] = []
    #  Files that arrived but did not hash to what the register recorded at
    #  issue. They are written anyway — a copy of unknown provenance beats no
    #  copy — and named here, which is the only honest thing to do with them.
    altered_documents: list[str] = []


# What restore replays, in order: the aggregate's key in the payload, its model,
# and the repository that takes it. A table rather than seven near-identical
# loops — a new aggregate is one line here, and forgetting to count it is not
# possible, because the key doubles as the RestoreReport field.
_RESTORE_ORDER: tuple[tuple[str, type, str], ...] = (
    ("companies", Company, "companies"),
    ("clients", Client, "clients"),
    ("products", Product, "products"),
    ("invoices", Invoice, "invoices"),
    ("quotes", Quote, "quotes"),
    ("credit_notes", CreditNote, "credit_notes"),
    ("payments", Payment, "payments"),
    ("documents", Document, "documents"),
)


class BackupService:
    def __init__(
        self,
        uow_factory: Callable[[], UnitOfWork],
        archive: DocumentArchive | None = None,
    ) -> None:
        self._uow_factory = uow_factory
        #  Only ever asked whether a file exists. Restore needs to answer
        #  "is this copy here?"; nothing here reads one.
        self._archive = archive

    def export(self, actor_user_id: UUID | None = None) -> dict[str, Any]:
        org_id = current_organization_id()
        with self._uow_factory() as uow:
            organization = uow.organizations.get(org_id)
            companies = uow.companies.list()
            clients = uow.clients.list()
            products = uow.products.list()
            invoices = uow.invoices.list()
            quotes = uow.quotes.list()
            credit_notes = uow.credit_notes.list()
            payments = [
                payment
                for invoice in invoices
                for payment in uow.payments.list_for_invoice(invoice.id)
            ]
            documents = uow.documents.list()
            # list() returns newest-first; store chronologically so restore
            # appends in original order.
            audit_entries = list(reversed(uow.audit_log.list(limit=_AUDIT_EXPORT_LIMIT)))
            sequences = [
                {"company_id": str(company.id), "scope": scope, "value": value}
                for company in companies
                for scope, value in sorted(uow.sequences.snapshot(company.id).items())
            ]

            payload: dict[str, Any] = {
                "format": BACKUP_FORMAT,
                "schema_version": SCHEMA_VERSION,
                "created_at": datetime.now(UTC).isoformat(),
                "organization": {
                    "id": str(org_id),
                    "name": organization.name if organization else None,
                },
                "companies": [c.model_dump(mode="json") for c in companies],
                "clients": [c.model_dump(mode="json") for c in clients],
                "products": [p.model_dump(mode="json") for p in products],
                "invoices": [i.model_dump(mode="json") for i in invoices],
                "quotes": [q.model_dump(mode="json") for q in quotes],
                "credit_notes": [c.model_dump(mode="json") for c in credit_notes],
                "payments": [p.model_dump(mode="json") for p in payments],
                "documents": [d.model_dump(mode="json") for d in documents],
                "audit_log": [e.model_dump(mode="json") for e in audit_entries],
                "sequences": sequences,
            }

            _audit.record(
                uow,
                action=AuditAction.EXPORT_BACKUP,
                target_type="backup",
                after={
                    "companies": len(companies),
                    "invoices": len(invoices),
                    "credit_notes": len(credit_notes),
                    "documents": len(documents),
                },
                actor_user_id=actor_user_id,
            )
            uow.commit()
        return payload

    def restore(
        self,
        payload: Any,
        actor_user_id: UUID | None = None,
        documents: dict[str, bytes] | None = None,
    ) -> RestoreReport:
        if not isinstance(payload, dict) or payload.get("format") != BACKUP_FORMAT:
            raise BusinessRuleError("Not a BillGen backup file")
        if payload.get("schema_version") not in SUPPORTED_SCHEMA_VERSIONS:
            raise BusinessRuleError(
                f"Unsupported backup schema_version: {payload.get('schema_version')!r}"
            )

        org_id = current_organization_id()
        report = RestoreReport()

        # Fresh ids, same joins: restoring can never collide with rows already
        # in this database (e.g. the source org still existing on shared SaaS).
        payload = _remap_ids(payload, {})

        with self._uow_factory() as uow:
            if uow.companies.list():
                raise BusinessRuleError(
                    "Restore requires an empty organization — this one already has companies"
                )

            for key, model_cls, repo_name in _RESTORE_ORDER:
                repository = getattr(uow, repo_name)
                for model in self._models(payload, key, model_cls, org_id):
                    repository.add(model)
                    setattr(report, key, getattr(report, key) + 1)

            if self._archive is not None:
                self._replace_documents(uow, report, documents or {})

            for raw in self._list(payload, "sequences"):
                try:
                    company_id = UUID(str(raw["company_id"]))
                    scope = str(raw["scope"])
                    value = int(raw["value"])
                except (KeyError, TypeError, ValueError) as exc:
                    raise BusinessRuleError(f"Invalid sequence entry in backup: {raw!r}") from exc
                uow.sequences.restore_value(company_id, scope, value)
                report.sequences += 1

            for entry in self._models(payload, "audit_log", AuditLogEntry, org_id):
                uow.audit_log.append(entry)
                report.audit_entries += 1

            _audit.record(
                uow,
                action=AuditAction.RESTORE,
                target_type="backup",
                after=report.model_dump(),
                actor_user_id=actor_user_id,
            )
            uow.commit()

        return report

    def export_portable(
        self, passphrase: str, actor_user_id: UUID | None = None
    ) -> tuple[bytes, container.PackedArchive]:
        """The whole organization as one file that can leave the machine.

        The same JSON `export()` returns, plus the T-27 document bytes, zipped
        and then sealed with AES-256-GCM (`core/backup/sealed.py`). The plain
        export is untouched: this is a wrapper around it, not a second format,
        so a person who cannot run a restore can unzip the archive and hand
        `backup.json` to `POST /backup/restore`.

        Every document is checked against the sha256 the register recorded at
        issue. A file that is gone, or that no longer hashes to what was
        recorded, is **named in the manifest** rather than quietly left out.
        """
        payload = self.export(actor_user_id=actor_user_id)

        documents: list[tuple[str, bytes | None]] = []
        skipped: list[str] = []
        if self._archive is not None and self._archive.enabled:
            with self._uow_factory() as uow:
                registered = uow.documents.list()
            for document in registered:
                body = self._archive.read(document.path)
                if body is None:
                    skipped.append(document.path)
                    continue
                if sha256_of(body) != document.sha256:
                    #  Not packed. An archive is a thing a person will trust
                    #  years from now, and carrying bytes that do not match the
                    #  register under the same name as the original is how a
                    #  backup becomes worse than none.
                    skipped.append(document.path)
                    continue
                documents.append((document.path, body))

        packed = container.pack(payload, documents, skipped=skipped)
        blob = sealed.seal(
            packed.blob,
            passphrase,
            extra={
                "organization": payload.get("organization", {}).get("name"),
                "invoices": len(payload.get("invoices", [])),
                "documents": packed.documents,
            },
        )
        return blob, packed

    def restore_portable(
        self,
        blob: bytes,
        passphrase: str | None = None,
        actor_user_id: UUID | None = None,
    ) -> RestoreReport:
        """Restore from a file, sealed or not.

        The header says which: sealed bytes start with a magic and carry their
        own parameters, so a passphrase is asked for only when one is needed.
        Plain JSON and an unsealed zip both restore without one, which keeps
        every export this product has ever written restorable by one call.
        """
        if sealed.is_sealed(blob):
            if not passphrase:
                raise BusinessRuleError(
                    "This archive is encrypted and needs its passphrase. "
                    + sealed.UNRECOVERABLE_NOTICE
                )
            #  Decryption happens before anything touches the database, so a
            #  wrong passphrase cannot leave a half-restored organization.
            try:
                blob = sealed.unseal(blob, passphrase)
            except sealed.SealedBackupError as exc:
                raise BusinessRuleError(str(exc)) from exc

        documents: dict[str, bytes] = {}
        try:
            unpacked = container.unpack(blob)
        except container.ContainerError:
            #  Not a zip: the oldest and simplest thing this accepts is the
            #  plain JSON export, saved straight out of the browser.
            try:
                payload = json.loads(blob)
            except (UnicodeDecodeError, json.JSONDecodeError) as exc:
                raise BusinessRuleError(
                    "Not a BillGen backup: neither an archive nor a JSON export"
                ) from exc
        else:
            payload = unpacked.payload
            documents = unpacked.documents

        return self.restore(payload, actor_user_id=actor_user_id, documents=documents)

    def _replace_documents(
        self, uow: UnitOfWork, report: RestoreReport, arriving: dict[str, bytes]
    ) -> None:
        """Put back the bytes that travelled, and name what did not.

        Driven by the register, never by the archive: a path the restored
        database does not list is not written even if the file carried it. An
        archive is not allowed to drop files into someone's folder under names
        nothing in the database has ever heard of.
        """
        assert self._archive is not None
        for document in uow.documents.list():
            body = arriving.get(document.path)
            if body is None:
                if not self._archive.exists(document.path):
                    report.missing_documents.append(document.path)
                continue
            if sha256_of(body) != document.sha256:
                report.altered_documents.append(document.path)
            self._archive.write(document.path, body)
            report.documents_restored += 1

    @staticmethod
    def _list(payload: dict[str, Any], key: str) -> list[Any]:
        items = payload.get(key, [])
        if not isinstance(items, list):
            raise BusinessRuleError(f"Backup field {key!r} is not a list")
        return items

    @classmethod
    def _models(
        cls, payload: dict[str, Any], key: str, model_cls: type, org_id: UUID
    ) -> list[Any]:
        out = []
        for raw in cls._list(payload, key):
            if not isinstance(raw, dict):
                raise BusinessRuleError(f"Backup field {key!r} contains a non-object entry")
            data = dict(raw)
            # A backup restores into whichever org runs the restore (fresh
            # account after data loss) — never trust the org id in the file.
            data["organization_id"] = str(org_id)
            try:
                out.append(model_cls.model_validate(data))
            except ValidationError as exc:
                first = exc.errors()[0]
                raise BusinessRuleError(
                    f"Invalid {key} entry in backup: {first['msg']} at {first['loc']}"
                ) from exc
        return out
