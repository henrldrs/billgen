from collections.abc import Callable
from datetime import date
from decimal import Decimal
from uuid import UUID

from ..models import AuditAction, Invoice, InvoiceStatus, Payment, PaymentMethod
from ..repository import UnitOfWork
from . import _audit
from .errors import BusinessRuleError, NotFoundError

_UNPAYABLE = {InvoiceStatus.VOIDED, InvoiceStatus.DRAFT}


class PaymentService:
    def __init__(self, uow_factory: Callable[[], UnitOfWork]) -> None:
        self._uow_factory = uow_factory

    def record(
        self,
        *,
        invoice_id: UUID,
        amount: Decimal,
        paid_on: date,
        method: PaymentMethod = PaymentMethod.BANK_TRANSFER,
        reference: str | None = None,
        notes: str | None = None,
        actor_user_id: UUID | None = None,
    ) -> tuple[Payment, Invoice]:
        """Record a (possibly partial) payment and update the invoice status."""
        with self._uow_factory() as uow:
            invoice = uow.invoices.get(invoice_id)
            if invoice is None:
                raise NotFoundError(f"Invoice {invoice_id} not found")
            if invoice.status in _UNPAYABLE:
                raise BusinessRuleError(
                    f"Cannot record a payment on a {invoice.status.value} invoice"
                )

            already_paid = sum(
                (p.amount for p in uow.payments.list_for_invoice(invoice_id)),
                Decimal(0),
            )
            if already_paid + amount > invoice.total_ttc:
                raise BusinessRuleError(
                    f"Payment would exceed the invoice total "
                    f"({already_paid + amount} > {invoice.total_ttc})"
                )

            payment = Payment(
                organization_id=invoice.organization_id,
                invoice_id=invoice_id,
                amount=amount,
                currency=invoice.currency,
                method=method,
                paid_on=paid_on,
                reference=reference,
                notes=notes,
            )
            uow.payments.add(payment)

            new_status = (
                InvoiceStatus.PAID
                if already_paid + amount == invoice.total_ttc
                else InvoiceStatus.PARTIALLY_PAID
            )
            updated = uow.invoices.update(invoice.model_copy(update={"status": new_status}))

            _audit.record(
                uow,
                action=AuditAction.PAY,
                target_type="invoice",
                target_id=invoice_id,
                before={"status": invoice.status, "paid": already_paid},
                after={"status": new_status, "paid": already_paid + amount},
                actor_user_id=actor_user_id,
            )
            uow.commit()
            return payment, updated

    def list_for_invoice(self, invoice_id: UUID) -> list[Payment]:
        with self._uow_factory() as uow:
            return uow.payments.list_for_invoice(invoice_id)
