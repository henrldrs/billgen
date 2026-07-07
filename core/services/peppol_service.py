from collections.abc import Callable
from uuid import UUID

from ..einvoicing import build_invoice_ubl, validate_invoice_ubl
from ..models import AuditAction
from ..repository import UnitOfWork
from . import _audit
from .errors import BusinessRuleError, NotFoundError, PeppolValidationError
from .peppol_validation import validate_peppol_parties


class PeppolService:
    def __init__(self, uow_factory: Callable[[], UnitOfWork]) -> None:
        self._uow_factory = uow_factory

    def generate_invoice_xml(
        self, invoice_id: UUID, actor_user_id: UUID | None = None
    ) -> str:
        """Build and validate the Peppol BIS 3.0 UBL for an invoice. Audited
        (EXPORT_PEPPOL); never consumes a sequence."""
        with self._uow_factory() as uow:
            invoice = uow.invoices.get(invoice_id)
            if invoice is None:
                raise NotFoundError(f"Invoice {invoice_id} not found")
            company = uow.companies.get(invoice.company_id)
            client = uow.clients.get(invoice.client_id)
            if company is None or client is None:
                raise NotFoundError("Invoice company or client missing")

            # Gate: refuse to emit XML for invalid parties / B2C (Peppol is B2B/B2G).
            party_errors = validate_peppol_parties(company, client)
            if party_errors:
                raise PeppolValidationError(party_errors)

            xml = build_invoice_ubl(invoice, company, client)
            problems = validate_invoice_ubl(xml)
            if problems:
                raise BusinessRuleError(
                    "Generated UBL failed validation: " + "; ".join(problems)
                )

            _audit.record(
                uow,
                action=AuditAction.EXPORT_PEPPOL,
                target_type="invoice",
                target_id=invoice.id,
                after={"reference": invoice.reference},
                actor_user_id=actor_user_id,
            )
            uow.commit()
            return xml
