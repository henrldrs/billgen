"""Issued documents, put where a person and a backup can both find them (T-27).

Three rules hold this together, and each of them is a failure someone else has
already had:

1. **The database stays authoritative.** The archive is written and never read.
   An endpoint that answered from a file would let a user with a file manager
   edit a VAT record.
2. **Archiving never fails an issue.** The gapless number is burned inside
   `InvoiceService.issue`'s transaction; by the time we get here the invoice is
   legally issued and no rendering problem may undo that. Every failure is
   swallowed, reported, and recoverable through `rebuild`.
3. **A document is rendered once.** An invoice that already has a *row* is not
   re-rendered, so a template edited next year cannot silently restyle a
   document issued this one. `rebuild` re-renders only what has no file at all,
   and says so in the audit log when the bytes come out different.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import date
from uuid import UUID

from ..documents import DocumentArchive, invoice_path
from ..models import AuditAction, Document, DocumentKind, Invoice, InvoiceStatus
from ..repository import UnitOfWork
from ..tenancy import current_organization_id
from . import _audit
from .pdf_service import PdfService

INVOICE_TARGET = "invoice"


@dataclass
class ArchiveReport:
    """What a rebuild pass did. Counted, not narrated: this is what the
    endpoint returns and what a test asserts on."""

    written: int = 0
    skipped: int = 0
    failed: int = 0
    rehashed: int = 0
    errors: list[str] = field(default_factory=list)


class DocumentService:
    def __init__(
        self,
        uow_factory: Callable[[], UnitOfWork],
        archive: DocumentArchive,
        *,
        branded: bool = True,
    ) -> None:
        self._uow_factory = uow_factory
        self._archive = archive
        #  Same default and the same reason as PdfService: a caller that forgets
        #  to pass entitlements archives a branded document, not a free one.
        self._branded = branded

    @property
    def archive(self) -> DocumentArchive:
        return self._archive

    def list(self, kind: DocumentKind | None = None) -> list[Document]:
        with self._uow_factory() as uow:
            return uow.documents.list(kind)

    def archive_invoice(
        self, invoice_id: UUID, actor_user_id: UUID | None = None
    ) -> Document | None:
        """Write an issued invoice's PDF and register it. None when there was
        nothing to do — no archive configured, not issued, or already archived.

        Raises nothing a caller has to handle: see rule 2 in the module
        docstring. `ArchiveError` is the one exception that reaches the caller,
        and the issue route deliberately does not catch it — it logs it.
        """
        if not self._archive.enabled:
            return None

        with self._uow_factory() as uow:
            invoice = uow.invoices.get(invoice_id)
            if invoice is None or invoice.status is InvoiceStatus.DRAFT:
                return None
            if uow.documents.for_target(INVOICE_TARGET, invoice.id) is not None:
                return None

        pdf = PdfService(self._uow_factory, branded=self._branded).render_invoice_pdf(
            invoice_id
        )
        return self._register(invoice, pdf, actor_user_id)

    def rebuild(self, actor_user_id: UUID | None = None) -> ArchiveReport:
        """The one-shot for everything issued before T-27 landed, and the repair
        for a file a person deleted.

        Re-rendering an old invoice runs today's template over yesterday's data,
        so the bytes can legitimately differ from the hash first recorded. The
        row is updated and the difference is counted as `rehashed` rather than
        hidden — the invoice itself never moved, and the register says which
        copies are no longer the original ones.
        """
        report = ArchiveReport()
        if not self._archive.enabled:
            return report

        with self._uow_factory() as uow:
            invoices = [i for i in uow.invoices.list() if i.status is not InvoiceStatus.DRAFT]
            existing = {
                document.target_id: document
                for document in uow.documents.list(DocumentKind.INVOICE)
                if document.target_id is not None
            }

        for invoice in invoices:
            document = existing.get(invoice.id)
            if document is not None and self._archive.exists(document.path):
                report.skipped += 1
                continue
            try:
                pdf = PdfService(
                    self._uow_factory, branded=self._branded
                ).render_invoice_pdf(invoice.id)
                saved = self._register(invoice, pdf, actor_user_id, replacing=document)
            #  A rebuild walks every invoice in the organization. One that
            #  cannot render — a template deleted, a folder gone read-only —
            #  must not stop the other four hundred, so the failure is counted
            #  and named instead of raised.
            except Exception as exc:  # noqa: BLE001
                report.failed += 1
                report.errors.append(f"{invoice.reference or invoice.id}: {exc}")
                continue
            report.written += 1
            if document is not None and saved is not None and saved.sha256 != document.sha256:
                report.rehashed += 1
        return report

    def _register(
        self,
        invoice: Invoice,
        pdf: bytes,
        actor_user_id: UUID | None,
        *,
        replacing: Document | None = None,
    ) -> Document | None:
        year = (invoice.issue_date or date.today()).year
        reference = invoice.reference or str(invoice.sequence_global or invoice.id)
        relative = invoice_path(year, reference)
        written = self._archive.write(relative, pdf)

        with self._uow_factory() as uow:
            if replacing is not None:
                document = replacing.model_copy(
                    update={
                        "path": written.path,
                        "sha256": written.sha256,
                        "byte_size": written.byte_size,
                    }
                )
                saved = uow.documents.update(document)
            else:
                saved = uow.documents.add(
                    Document(
                        organization_id=current_organization_id(),
                        kind=DocumentKind.INVOICE,
                        path=written.path,
                        sha256=written.sha256,
                        byte_size=written.byte_size,
                        target_type=INVOICE_TARGET,
                        target_id=invoice.id,
                    )
                )
            _audit.record(
                uow,
                action=AuditAction.ARCHIVE_DOCUMENT,
                target_type="document",
                target_id=saved.id,
                after={
                    "path": saved.path,
                    "sha256": saved.sha256,
                    "byte_size": saved.byte_size,
                    "invoice": invoice.reference,
                },
                actor_user_id=actor_user_id,
            )
            uow.commit()
        return saved
