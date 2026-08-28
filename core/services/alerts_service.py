"""What needs attention, decided on the server.

The dashboard could show what *is* — totals, counts, a revenue curve. Nothing
told anyone what to *do*, and every attempt to add that in the frontend ends
the same way: a rule ("overdue means past due and not fully paid") written in
TypeScript, drifting from the one in `effective_status`, and re-derived on
every screen that wants to show a badge.

So the rules live here, once. Each alert carries a `code` and a `context`
rather than a sentence: the wording is the frontend's, in the user's language,
and a message assembled here would be untranslatable by the time it arrived.

Deliberately cheap. Four rules over reads the reporting service already makes,
computed per request, no storage and no scheduler. Nothing here needs to
survive a restart — an alert is a function of the data, so it is true again the
next time it is asked for. Anything that must *arrive* rather than be looked at
(a reminder email on day 15) is a different mechanism and waits on B1.
"""

from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from enum import Enum
from uuid import UUID

from ..models import InvoiceStatus
from ..repository import UnitOfWork
from ..rules import quantize
from .company_validation import validate_company_identifiers
from .errors import NotFoundError

_ZERO = Decimal(0)

# A draft nobody has issued after this long is usually forgotten, not pending.
STALE_DRAFT_DAYS = 30
# Past this, an unpaid invoice stops being late and starts being a problem: it
# is roughly where Belgian practice puts the second reminder.
SEVERELY_OVERDUE_DAYS = 30


class Severity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class AlertCode(str, Enum):
    """The rule that fired. Doubles as the frontend's translation key."""

    INVOICE_OVERDUE = "invoice.overdue"
    INVOICE_DRAFT_STALE = "invoice.draft_stale"
    CLIENT_MISSING_VAT_NUMBER = "client.missing_vat_number"
    COMPANY_INCOMPLETE = "company.incomplete"


@dataclass(frozen=True)
class Alert:
    code: AlertCode
    severity: Severity
    target_type: str
    target_id: UUID
    title: str
    context: dict = field(default_factory=dict)


@dataclass(frozen=True)
class AlertsReport:
    company_id: UUID
    as_of: date
    alerts: list[Alert] = field(default_factory=list)
    counts_by_severity: dict[str, int] = field(default_factory=dict)
    counts_by_code: dict[str, int] = field(default_factory=dict)
    truncated: bool = False


class AlertsService:
    def __init__(self, uow_factory: Callable[[], UnitOfWork]) -> None:
        self._uow_factory = uow_factory

    def list(
        self,
        company_id: UUID,
        today: date | None = None,
        limit: int = 50,
    ) -> AlertsReport:
        """Every rule that fires for `company_id`, worst first.

        `today` is a parameter rather than a call to `date.today()` inside the
        loop: an alerts engine that cannot be asked "what did this look like on
        the 15th" is one nobody can write a test for.
        """
        today = today or date.today()

        with self._uow_factory() as uow:
            company = uow.companies.get(company_id)
            if company is None:
                raise NotFoundError(f"Company {company_id} not found")
            invoices = uow.invoices.list(company_id=company_id)
            clients = uow.clients.list(company_id=company_id)
            paid_by_invoice = {
                invoice.id: sum(
                    (p.amount for p in uow.payments.list_for_invoice(invoice.id)), _ZERO
                )
                for invoice in invoices
                if invoice.status not in (InvoiceStatus.DRAFT, InvoiceStatus.VOIDED)
            }

        alerts: list[Alert] = []

        for invoice in invoices:
            if invoice.status is InvoiceStatus.DRAFT:
                age = (today - invoice.issue_date).days
                if age >= STALE_DRAFT_DAYS:
                    alerts.append(
                        Alert(
                            code=AlertCode.INVOICE_DRAFT_STALE,
                            severity=Severity.INFO,
                            target_type="invoice",
                            target_id=invoice.id,
                            title=invoice.reference or str(invoice.issue_date),
                            context={
                                "days": age,
                                "amount": str(
                                    quantize(invoice.total_ttc, invoice.currency)
                                ),
                            },
                        )
                    )
                continue

            if invoice.status in (InvoiceStatus.VOIDED, InvoiceStatus.PAID):
                continue
            if invoice.due_date is None or invoice.due_date >= today:
                continue

            # Partial payment counts: what is chased is the remainder, and an
            # invoice 90% settled is a different conversation from an unpaid one.
            outstanding = invoice.total_ttc - paid_by_invoice.get(invoice.id, _ZERO)
            if outstanding <= _ZERO:
                continue

            days = (today - invoice.due_date).days
            alerts.append(
                Alert(
                    code=AlertCode.INVOICE_OVERDUE,
                    severity=(
                        Severity.CRITICAL
                        if days >= SEVERELY_OVERDUE_DAYS
                        else Severity.WARNING
                    ),
                    target_type="invoice",
                    target_id=invoice.id,
                    title=invoice.reference or str(invoice.issue_date),
                    context={
                        "days_overdue": days,
                        "outstanding": str(quantize(outstanding, invoice.currency)),
                        "currency": invoice.currency.value,
                        "client_id": str(invoice.client_id),
                    },
                )
            )

        for record in clients:
            # A business customer with no VAT number cannot be sent over Peppol
            # and cannot be reverse-charged — it is silently treated as a
            # consumer, which is the expensive way to find out.
            if record.is_business and not (record.vat_number or "").strip():
                alerts.append(
                    Alert(
                        code=AlertCode.CLIENT_MISSING_VAT_NUMBER,
                        severity=Severity.WARNING,
                        target_type="client",
                        target_id=record.id,
                        title=record.name,
                        context={"country_code": record.country_code},
                    )
                )

        validation = validate_company_identifiers(company)
        if not validation.valid or not validation.peppol_ready:
            alerts.append(
                Alert(
                    code=AlertCode.COMPANY_INCOMPLETE,
                    # Its own identifiers being wrong is the seller's problem
                    # before it is anyone else's: it invalidates every invoice
                    # the company issues, not one of them.
                    severity=(
                        Severity.CRITICAL if not validation.valid else Severity.WARNING
                    ),
                    target_type="company",
                    target_id=company.id,
                    title=company.name,
                    context={
                        "invalid_fields": [
                            check.field for check in validation.checks if not check.valid
                        ],
                        "missing_for_peppol": list(validation.missing_for_peppol),
                    },
                )
            )

        order = {Severity.CRITICAL: 0, Severity.WARNING: 1, Severity.INFO: 2}
        alerts.sort(key=lambda alert: (order[alert.severity], alert.code.value))

        counts_by_severity: dict[str, int] = {}
        counts_by_code: dict[str, int] = {}
        for alert in alerts:
            counts_by_severity[alert.severity.value] = (
                counts_by_severity.get(alert.severity.value, 0) + 1
            )
            counts_by_code[alert.code.value] = counts_by_code.get(alert.code.value, 0) + 1

        # The counts describe every alert that fired; the list is capped. A
        # dashboard badge reading 8 above a list of 5 is correct, and better
        # than a badge that lies to match the page.
        return AlertsReport(
            company_id=company_id,
            as_of=today,
            alerts=alerts[:limit],
            counts_by_severity=counts_by_severity,
            counts_by_code=counts_by_code,
            truncated=len(alerts) > limit,
        )

