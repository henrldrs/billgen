"""Quotes: a priced offer, its own numbering series, and one door to an invoice.

Two rules carry the whole design:

**The quote series is not the invoice series.** Belgian gapless numbering binds
the invoice sequence (ADR-0001). Most quotes are refused, and a refused quote
that had consumed an invoice number would leave a hole in it — so quotes count
themselves, in `QUOTE_SERIES`, and nothing here ever touches `INVOICE_SERIES`.

**Converting produces a draft, not an invoice.** `convert()` hands back a DRAFT
through `InvoiceService.create_draft`, so the gapless number is still consumed
where it always was — in `issue()`, on purpose, once, by the act that is legally
load-bearing. Accepting a quote is a commercial event; issuing is a fiscal one,
and collapsing them would mean a customer's "yes" mints a VAT document.
"""

from collections.abc import Callable
from datetime import UTC, date, datetime
from uuid import UUID

from ..models import (
    AuditAction,
    Currency,
    Discount,
    Invoice,
    InvoiceLine,
    Quote,
    QuoteStatus,
)
from ..repository import UnitOfWork
from ..rules import invoice_totals
from . import _audit
from .errors import BusinessRuleError, NotFoundError
from .invoice_service import InvoiceService
from .numbering_service import allocate_quote_numbers

# Which transitions exist. A quote that has been decided stays decided: the
# honest way to change your mind about a rejected offer is a new offer, which
# is also what the customer expects to receive.
_ALLOWED: dict[QuoteStatus, set[QuoteStatus]] = {
    QuoteStatus.DRAFT: {QuoteStatus.SENT},
    QuoteStatus.SENT: {QuoteStatus.ACCEPTED, QuoteStatus.REJECTED, QuoteStatus.EXPIRED},
    QuoteStatus.ACCEPTED: {QuoteStatus.CONVERTED},
    QuoteStatus.REJECTED: set(),
    QuoteStatus.EXPIRED: set(),
    QuoteStatus.CONVERTED: set(),
}


def effective_status(quote: Quote, today: date) -> str:
    """Stored status refined with the derived 'expired' state.

    Mirrors `reporting_service.effective_status` for invoices, and for the same
    reason: expiry is a function of a date, and a stored flag would need a
    scheduler to stay true. A quote past `valid_until` that nobody has decided
    on reads as expired the moment it is looked at.
    """
    if quote.status is not QuoteStatus.SENT:
        return quote.status.value
    if quote.valid_until and quote.valid_until < today:
        return QuoteStatus.EXPIRED.value
    return quote.status.value


class QuoteService:
    def __init__(self, uow_factory: Callable[[], UnitOfWork]) -> None:
        self._uow_factory = uow_factory

    def create(
        self,
        *,
        company_id: UUID,
        client_id: UUID,
        lines: list[InvoiceLine],
        issue_date: date | None = None,
        valid_until: date | None = None,
        quote_discount: Discount | None = None,
        comments: str | None = None,
        terms: str | None = None,
        pdf_template: str | None = None,
        currency: Currency | None = None,
        actor_user_id: UUID | None = None,
    ) -> Quote:
        """Create a quote, numbered from the quote series at creation.

        Unlike an invoice draft, this gets its reference straight away: there is
        no gapless obligation to protect by withholding it, and a reference is
        precisely what the customer needs in order to quote it back at you.
        """
        if not lines:
            raise BusinessRuleError("A quote needs at least one line")
        issue_date = issue_date or date.today()
        if valid_until is not None and valid_until < issue_date:
            raise BusinessRuleError("A quote cannot expire before it is issued")

        with self._uow_factory() as uow:
            company = uow.companies.get(company_id)
            if company is None:
                raise NotFoundError(f"Company {company_id} not found")
            client = uow.clients.get(client_id)
            if client is None:
                raise NotFoundError(f"Client {client_id} not found")
            if client.company_id != company_id:
                raise BusinessRuleError("Client does not belong to this company")

            cur = currency or company.default_currency
            numbered_lines = [
                line.model_copy(update={"line_number": index})
                for index, line in enumerate(lines, start=1)
            ]
            totals = invoice_totals(numbered_lines, quote_discount, cur)
            reference, seq_global = allocate_quote_numbers(uow, company, issue_date)

            quote = Quote(
                organization_id=company.organization_id,
                company_id=company_id,
                client_id=client_id,
                reference=reference,
                sequence_global=seq_global,
                issue_date=issue_date,
                valid_until=valid_until,
                currency=cur,
                lines=numbered_lines,
                quote_discount=quote_discount,
                comments=comments,
                terms=terms,
                pdf_template=pdf_template or company.default_pdf_template,
                subtotal_ht=totals.subtotal_ht,
                total_discount=totals.total_discount,
                total_vat=totals.total_vat,
                total_ttc=totals.total_ttc,
                status=QuoteStatus.DRAFT,
            )
            saved = uow.quotes.add(quote)
            _audit.record(
                uow,
                action=AuditAction.CREATE,
                target_type="quote",
                target_id=saved.id,
                after={"reference": saved.reference, "total_ttc": saved.total_ttc},
                actor_user_id=actor_user_id,
            )
            uow.commit()
            return saved

    def get(self, quote_id: UUID) -> Quote:
        with self._uow_factory() as uow:
            quote = uow.quotes.get(quote_id)
            if quote is None:
                raise NotFoundError(f"Quote {quote_id} not found")
            return quote

    def list(
        self,
        company_id: UUID | None = None,
        status: QuoteStatus | None = None,
        client_id: UUID | None = None,
    ) -> list[Quote]:
        with self._uow_factory() as uow:
            return uow.quotes.list(
                company_id=company_id, status=status, client_id=client_id
            )

    def mark_sent(self, quote_id: UUID, actor_user_id: UUID | None = None) -> Quote:
        """Record that the offer went out.

        A bookkeeping act, not a delivery: nothing is emailed from here, and
        nothing will be until B1. What it buys today is a date, which is what
        "you never replied to our quote of the 3rd" is made of.
        """
        return self._transition(
            quote_id,
            QuoteStatus.SENT,
            actor_user_id=actor_user_id,
            updates={"sent_at": datetime.now(UTC)},
        )

    def accept(
        self, quote_id: UUID, note: str | None = None, actor_user_id: UUID | None = None
    ) -> Quote:
        """The customer said yes. Still no invoice — see `convert`."""
        return self._transition(
            quote_id,
            QuoteStatus.ACCEPTED,
            actor_user_id=actor_user_id,
            updates={"decided_at": datetime.now(UTC), "decision_note": note},
        )

    def reject(
        self, quote_id: UUID, note: str | None = None, actor_user_id: UUID | None = None
    ) -> Quote:
        return self._transition(
            quote_id,
            QuoteStatus.REJECTED,
            actor_user_id=actor_user_id,
            updates={"decided_at": datetime.now(UTC), "decision_note": note},
        )

    def expire(self, quote_id: UUID, actor_user_id: UUID | None = None) -> Quote:
        """Write the derived expiry down.

        `effective_status` already reads an out-of-date quote as expired without
        this. Calling it makes the state permanent, which is what closing out a
        pipeline by hand means — and the only way to expire one early.
        """
        return self._transition(
            quote_id,
            QuoteStatus.EXPIRED,
            actor_user_id=actor_user_id,
            updates={"decided_at": datetime.now(UTC)},
        )

    def convert(
        self,
        quote_id: UUID,
        *,
        issue_date: date | None = None,
        due_date: date | None = None,
        actor_user_id: UUID | None = None,
    ) -> tuple[Quote, Invoice]:
        """Turn an accepted quote into a DRAFT invoice, once.

        A draft, deliberately. The invoice number is still consumed in
        `InvoiceService.issue` and nowhere else, so a customer's "yes" cannot
        mint a VAT document — someone still has to issue it, which is the act
        the law cares about.

        Lines are copied rather than re-priced: the offer is what was accepted,
        and a conversion that quietly re-ran today's VAT rates would invoice
        something nobody agreed to. Totals are recomputed from those same lines
        by `create_draft`, which is arithmetic, not a change of terms.

        Two transactions, not one — the draft is written by `InvoiceService`,
        then the quote is marked converted. If the second fails, the visible
        outcome is a draft invoice beside a quote still reading `accepted`, and
        the fix is to delete the draft and convert again. Worth naming, and
        preferable to reaching into the invoice aggregate from here to save a
        commit.
        """
        quote = self.get(quote_id)
        if quote.status is QuoteStatus.CONVERTED:
            raise BusinessRuleError(
                f"Quote {quote.reference} was already converted to an invoice"
            )
        if quote.status is not QuoteStatus.ACCEPTED:
            raise BusinessRuleError("Only an accepted quote can be converted")

        invoice = InvoiceService(self._uow_factory).create_draft(
            company_id=quote.company_id,
            client_id=quote.client_id,
            lines=[line.model_copy(deep=True) for line in quote.lines],
            issue_date=issue_date or date.today(),
            due_date=due_date,
            invoice_discount=quote.quote_discount,
            comments=quote.comments,
            payment_terms=quote.terms,
            pdf_template=quote.pdf_template,
            currency=quote.currency,
            actor_user_id=actor_user_id,
        )

        converted = self._transition(
            quote_id,
            QuoteStatus.CONVERTED,
            actor_user_id=actor_user_id,
            updates={"converted_invoice_id": invoice.id},
        )
        return converted, invoice

    def delete(self, quote_id: UUID, actor_user_id: UUID | None = None) -> None:
        """Hard-delete a quote that never became an invoice.

        Nothing like ADR-0002 applies: that rule exists because an issued
        invoice consumed a gapless number. A quote's series has no fiscal
        meaning, so an offer nobody accepted may simply go away. Once converted
        it stays, as the invoice's trail back to what was agreed.
        """
        with self._uow_factory() as uow:
            quote = uow.quotes.get(quote_id)
            if quote is None:
                raise NotFoundError(f"Quote {quote_id} not found")
            if quote.status is QuoteStatus.CONVERTED:
                raise BusinessRuleError(
                    "A converted quote cannot be deleted — it is the invoice's trail"
                )
            _audit.record(
                uow,
                action=AuditAction.DELETE,
                target_type="quote",
                target_id=quote.id,
                before={"reference": quote.reference, "status": quote.status},
                actor_user_id=actor_user_id,
            )
            uow.quotes.delete(quote_id)
            uow.commit()

    def _transition(
        self,
        quote_id: UUID,
        target: QuoteStatus,
        *,
        actor_user_id: UUID | None,
        updates: dict | None = None,
    ) -> Quote:
        with self._uow_factory() as uow:
            quote = uow.quotes.get(quote_id)
            if quote is None:
                raise NotFoundError(f"Quote {quote_id} not found")
            if target not in _ALLOWED[quote.status]:
                raise BusinessRuleError(
                    f"A {quote.status.value} quote cannot become {target.value}"
                )

            moved = quote.model_copy(update={"status": target, **(updates or {})})
            saved = uow.quotes.update(moved)
            _audit.record(
                uow,
                action=AuditAction.UPDATE,
                target_type="quote",
                target_id=saved.id,
                before={"status": quote.status},
                after={"status": saved.status},
                actor_user_id=actor_user_id,
            )
            uow.commit()
            return saved
