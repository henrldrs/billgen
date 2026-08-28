"""SQLAlchemy implementations of the CORE repository ports.

Consolidated in one module while each adapter is thin; split per-aggregate when
any of them grows past a screenful.

Tenancy: every tenant-scoped query filters on core.tenancy.current_organization_id(),
and every write guards that the entity's organization_id matches the bound context.
"""

from datetime import date
from uuid import UUID

from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.orm import Session

from core.models import (
    AuditLogEntry,
    Client,
    Company,
    CreditNote,
    Invoice,
    InvoiceStatus,
    Organization,
    OrgMembership,
    Payment,
    Product,
    Quote,
    QuoteStatus,
    User,
)
from core.models.template import DocumentTemplate, TemplateSnapshot
from core.repository import (
    AuditLogRepository,
    ClientRepository,
    CompanyRepository,
    CreditNoteRepository,
    ExpenseRepository,
    InvoiceRepository,
    OrganizationRepository,
    PaymentRepository,
    ProductRepository,
    QuoteRepository,
    SequenceRepository,
    TemplateRepository,
    UserRepository,
)
from core.tenancy import current_organization_id, guard_tenant
from core.tva.models import Expense
from core.tva.states import ExpenseState
from db.models import (
    AuditLogRow,
    ClientRow,
    CompanyRow,
    CreditNoteRow,
    DocumentTemplateRow,
    ExpenseRow,
    InvoiceRow,
    OrganizationRow,
    OrgMembershipRow,
    PaymentRow,
    ProductRow,
    QuoteRow,
    SequenceRow,
    TemplateVersionRow,
    UserRow,
)

from .mappers import (
    credit_note_to_row,
    expense_to_row,
    invoice_to_row,
    quote_to_row,
    row_kwargs,
    row_to_credit_note,
    row_to_expense,
    row_to_invoice,
    row_to_quote,
    row_to_template,
    template_to_row,
    to_domain,
)

_LIKE_ESCAPE = "\\"


def _contains(term: str) -> str:
    """A LIKE pattern matching `term` anywhere, with the wildcards defused.

    Without this, a search for "50%" matches every row: `%` and `_` are LIKE
    metacharacters, and a search box is the one place a user types them without
    meaning them.
    """
    escaped = (
        term.replace(_LIKE_ESCAPE, _LIKE_ESCAPE * 2)
        .replace("%", _LIKE_ESCAPE + "%")
        .replace("_", _LIKE_ESCAPE + "_")
    )
    return f"%{escaped}%"


class SqlAlchemyOrganizationRepository(OrganizationRepository):
    def __init__(self, session: Session) -> None:
        self._s = session

    def add(self, organization: Organization) -> Organization:
        self._s.add(OrganizationRow(**row_kwargs(organization)))
        self._s.flush()
        return organization

    def get(self, organization_id: UUID) -> Organization | None:
        row = self._s.get(OrganizationRow, organization_id)
        return to_domain(Organization, row) if row else None


class SqlAlchemyUserRepository(UserRepository):
    def __init__(self, session: Session) -> None:
        self._s = session

    def add(self, user: User) -> User:
        self._s.add(UserRow(**row_kwargs(user)))
        self._s.flush()
        return user

    def get(self, user_id: UUID) -> User | None:
        row = self._s.get(UserRow, user_id)
        return to_domain(User, row) if row else None

    def get_by_email(self, email: str) -> User | None:
        row = self._s.execute(
            select(UserRow).where(UserRow.email == email)
        ).scalar_one_or_none()
        return to_domain(User, row) if row else None

    def add_membership(self, membership: OrgMembership) -> OrgMembership:
        self._s.add(OrgMembershipRow(**row_kwargs(membership)))
        self._s.flush()
        return membership

    def memberships_for_user(self, user_id: UUID) -> list[OrgMembership]:
        rows = self._s.execute(
            select(OrgMembershipRow).where(OrgMembershipRow.user_id == user_id)
        ).scalars()
        return [to_domain(OrgMembership, row) for row in rows]


class _TenantCrudRepository:
    """Shared add/get/update for flat tenant-scoped aggregates."""

    row_cls: type
    model_cls: type

    def __init__(self, session: Session) -> None:
        self._s = session

    def _org_filter(self):
        return self.row_cls.organization_id == current_organization_id()

    def add(self, model):
        guard_tenant(model.organization_id)
        self._s.add(self.row_cls(**row_kwargs(model)))
        self._s.flush()
        return model

    def get(self, entity_id: UUID):
        row = self._s.execute(
            select(self.row_cls).where(self.row_cls.id == entity_id, self._org_filter())
        ).scalar_one_or_none()
        return to_domain(self.model_cls, row) if row else None

    def update(self, model):
        guard_tenant(model.organization_id)
        row = self._s.execute(
            select(self.row_cls).where(self.row_cls.id == model.id, self._org_filter())
        ).scalar_one_or_none()
        if row is None:
            raise LookupError(
                f"{self.model_cls.__name__} {model.id} not found in current organization"
            )
        for key, value in row_kwargs(
            model, exclude={"id", "created_at", "organization_id"}
        ).items():
            setattr(row, key, value)
        self._s.flush()
        return to_domain(self.model_cls, row)


class SqlAlchemyCompanyRepository(_TenantCrudRepository, CompanyRepository):
    row_cls = CompanyRow
    model_cls = Company

    def list(self) -> list[Company]:
        rows = self._s.execute(
            select(CompanyRow).where(self._org_filter()).order_by(CompanyRow.name)
        ).scalars()
        return [to_domain(Company, row) for row in rows]


class SqlAlchemyClientRepository(_TenantCrudRepository, ClientRepository):
    row_cls = ClientRow
    model_cls = Client

    def list(self, company_id: UUID | None = None) -> list[Client]:
        stmt = select(ClientRow).where(self._org_filter()).order_by(ClientRow.name)
        if company_id is not None:
            stmt = stmt.where(ClientRow.company_id == company_id)
        return [to_domain(Client, row) for row in self._s.execute(stmt).scalars()]

    def search(self, term: str, limit: int = 10) -> list[Client]:
        pattern = _contains(term)
        stmt = (
            select(ClientRow)
            .where(
                self._org_filter(),
                or_(
                    ClientRow.name.ilike(pattern, escape=_LIKE_ESCAPE),
                    ClientRow.email.ilike(pattern, escape=_LIKE_ESCAPE),
                    ClientRow.vat_number.ilike(pattern, escape=_LIKE_ESCAPE),
                ),
            )
            .order_by(ClientRow.name)
            .limit(limit)
        )
        return [to_domain(Client, row) for row in self._s.execute(stmt).scalars()]


class SqlAlchemyProductRepository(_TenantCrudRepository, ProductRepository):
    row_cls = ProductRow
    model_cls = Product

    def list(self, company_id: UUID | None = None) -> list[Product]:
        stmt = select(ProductRow).where(self._org_filter()).order_by(ProductRow.name)
        if company_id is not None:
            stmt = stmt.where(ProductRow.company_id == company_id)
        return [to_domain(Product, row) for row in self._s.execute(stmt).scalars()]

    def search(self, term: str, limit: int = 10) -> list[Product]:
        pattern = _contains(term)
        stmt = (
            select(ProductRow)
            .where(
                self._org_filter(),
                or_(
                    ProductRow.name.ilike(pattern, escape=_LIKE_ESCAPE),
                    ProductRow.category.ilike(pattern, escape=_LIKE_ESCAPE),
                ),
            )
            .order_by(ProductRow.name)
            .limit(limit)
        )
        return [to_domain(Product, row) for row in self._s.execute(stmt).scalars()]


_INVOICE_SCALAR_COLUMNS = (
    "updated_at",
    "client_id",
    "reference",
    "sequence_global",
    "issue_date",
    "due_date",
    "currency",
    "invoice_discount_type",
    "invoice_discount_value",
    "invoice_discount_reason",
    "comments",
    "payment_terms",
    "pdf_template",
    "subtotal_ht",
    "total_discount",
    "total_vat",
    "total_ttc",
    "status",
    "voided_at",
    "voided_reason",
    "voided_by_credit_note_id",
)


class SqlAlchemyInvoiceRepository(InvoiceRepository):
    def __init__(self, session: Session) -> None:
        self._s = session

    def _org_filter(self):
        return InvoiceRow.organization_id == current_organization_id()

    def _get_row(self, invoice_id: UUID) -> InvoiceRow | None:
        return self._s.execute(
            select(InvoiceRow).where(InvoiceRow.id == invoice_id, self._org_filter())
        ).scalar_one_or_none()

    def add(self, invoice: Invoice) -> Invoice:
        guard_tenant(invoice.organization_id)
        row = invoice_to_row(invoice)
        self._s.add(row)
        self._s.flush()
        return row_to_invoice(row)

    def get(self, invoice_id: UUID) -> Invoice | None:
        row = self._get_row(invoice_id)
        return row_to_invoice(row) if row else None

    def get_by_reference(self, company_id: UUID, reference: str) -> Invoice | None:
        row = self._s.execute(
            select(InvoiceRow).where(
                InvoiceRow.company_id == company_id,
                InvoiceRow.reference == reference,
                self._org_filter(),
            )
        ).scalar_one_or_none()
        return row_to_invoice(row) if row else None

    def list(
        self,
        company_id: UUID | None = None,
        status: InvoiceStatus | None = None,
        client_id: UUID | None = None,
    ) -> list[Invoice]:
        stmt = (
            select(InvoiceRow)
            .where(self._org_filter())
            .order_by(InvoiceRow.sequence_global.desc())
        )
        if company_id is not None:
            stmt = stmt.where(InvoiceRow.company_id == company_id)
        if status is not None:
            stmt = stmt.where(InvoiceRow.status == status.value)
        if client_id is not None:
            stmt = stmt.where(InvoiceRow.client_id == client_id)
        return [row_to_invoice(row) for row in self._s.execute(stmt).scalars()]

    def search(self, term: str, limit: int = 10) -> list[Invoice]:
        stmt = (
            select(InvoiceRow)
            .where(
                self._org_filter(),
                InvoiceRow.reference.ilike(_contains(term), escape=_LIKE_ESCAPE),
            )
            .order_by(InvoiceRow.sequence_global.desc())
            .limit(limit)
        )
        return [row_to_invoice(row) for row in self._s.execute(stmt).scalars()]

    def update(self, invoice: Invoice) -> Invoice:
        guard_tenant(invoice.organization_id)
        row = self._get_row(invoice.id)
        if row is None:
            raise LookupError(f"Invoice {invoice.id} not found in current organization")
        fresh = invoice_to_row(invoice)
        for column in _INVOICE_SCALAR_COLUMNS:
            setattr(row, column, getattr(fresh, column))
        row.lines = fresh.lines
        self._s.flush()
        return row_to_invoice(row)

    def delete(self, invoice_id: UUID) -> None:
        row = self._get_row(invoice_id)
        if row is None:
            raise LookupError(f"Invoice {invoice_id} not found in current organization")
        # Last-line guard on the gapless invariant: a numbered (issued) invoice is
        # never hard-deleted, even if a caller slips past the service-level check.
        if row.status != InvoiceStatus.DRAFT.value:
            raise ValueError("Refusing to hard-delete a non-draft invoice")
        self._s.delete(row)
        self._s.flush()


_QUOTE_SCALAR_COLUMNS = (
    "updated_at",
    "client_id",
    "issue_date",
    "valid_until",
    "currency",
    "quote_discount_type",
    "quote_discount_value",
    "quote_discount_reason",
    "comments",
    "terms",
    "pdf_template",
    "subtotal_ht",
    "total_discount",
    "total_vat",
    "total_ttc",
    "status",
    "sent_at",
    "decided_at",
    "decision_note",
    "converted_invoice_id",
)


class SqlAlchemyQuoteRepository(QuoteRepository):
    """Shaped like the invoice repository, minus the gapless guard.

    `reference` and `sequence_global` are absent from the updatable columns for
    the same reason they are on invoices: a document's number is assigned once,
    and an update path that can rewrite it is a way to mint a duplicate.
    """

    def __init__(self, session: Session) -> None:
        self._s = session

    def _org_filter(self):
        return QuoteRow.organization_id == current_organization_id()

    def _get_row(self, quote_id: UUID) -> QuoteRow | None:
        return self._s.execute(
            select(QuoteRow).where(QuoteRow.id == quote_id, self._org_filter())
        ).scalar_one_or_none()

    def add(self, quote: Quote) -> Quote:
        guard_tenant(quote.organization_id)
        row = quote_to_row(quote)
        self._s.add(row)
        self._s.flush()
        return row_to_quote(row)

    def get(self, quote_id: UUID) -> Quote | None:
        row = self._get_row(quote_id)
        return row_to_quote(row) if row else None

    def list(
        self,
        company_id: UUID | None = None,
        status: QuoteStatus | None = None,
        client_id: UUID | None = None,
    ) -> list[Quote]:
        stmt = (
            select(QuoteRow)
            .where(self._org_filter())
            .order_by(QuoteRow.sequence_global.desc())
        )
        if company_id is not None:
            stmt = stmt.where(QuoteRow.company_id == company_id)
        if status is not None:
            stmt = stmt.where(QuoteRow.status == status.value)
        if client_id is not None:
            stmt = stmt.where(QuoteRow.client_id == client_id)
        return [row_to_quote(row) for row in self._s.execute(stmt).scalars()]

    def search(self, term: str, limit: int = 10) -> list[Quote]:
        stmt = (
            select(QuoteRow)
            .where(
                self._org_filter(),
                QuoteRow.reference.ilike(_contains(term), escape=_LIKE_ESCAPE),
            )
            .order_by(QuoteRow.sequence_global.desc())
            .limit(limit)
        )
        return [row_to_quote(row) for row in self._s.execute(stmt).scalars()]

    def update(self, quote: Quote) -> Quote:
        guard_tenant(quote.organization_id)
        row = self._get_row(quote.id)
        if row is None:
            raise LookupError(f"Quote {quote.id} not found in current organization")
        fresh = quote_to_row(quote)
        for column in _QUOTE_SCALAR_COLUMNS:
            setattr(row, column, getattr(fresh, column))
        row.lines = fresh.lines
        self._s.flush()
        return row_to_quote(row)

    def delete(self, quote_id: UUID) -> None:
        row = self._get_row(quote_id)
        if row is None:
            raise LookupError(f"Quote {quote_id} not found in current organization")
        if row.converted_invoice_id is not None:
            raise ValueError("Refusing to delete a quote that became an invoice")
        self._s.delete(row)
        self._s.flush()


class SqlAlchemyCreditNoteRepository(CreditNoteRepository):
    def __init__(self, session: Session) -> None:
        self._s = session

    def _org_filter(self):
        return CreditNoteRow.organization_id == current_organization_id()

    def add(self, credit_note: CreditNote) -> CreditNote:
        guard_tenant(credit_note.organization_id)
        row = credit_note_to_row(credit_note)
        self._s.add(row)
        self._s.flush()
        return row_to_credit_note(row)

    def get(self, credit_note_id: UUID) -> CreditNote | None:
        row = self._s.execute(
            select(CreditNoteRow).where(CreditNoteRow.id == credit_note_id, self._org_filter())
        ).scalar_one_or_none()
        return row_to_credit_note(row) if row else None

    def list(self, company_id: UUID | None = None) -> list[CreditNote]:
        stmt = (
            select(CreditNoteRow)
            .where(self._org_filter())
            .order_by(CreditNoteRow.sequence_global.desc())
        )
        if company_id is not None:
            stmt = stmt.where(CreditNoteRow.company_id == company_id)
        return [row_to_credit_note(row) for row in self._s.execute(stmt).scalars()]

    def search(self, term: str, limit: int = 10) -> list[CreditNote]:
        stmt = (
            select(CreditNoteRow)
            .where(
                self._org_filter(),
                CreditNoteRow.reference.ilike(_contains(term), escape=_LIKE_ESCAPE),
            )
            .order_by(CreditNoteRow.sequence_global.desc())
            .limit(limit)
        )
        return [row_to_credit_note(row) for row in self._s.execute(stmt).scalars()]


class SqlAlchemyPaymentRepository(PaymentRepository):
    def __init__(self, session: Session) -> None:
        self._s = session

    def add(self, payment: Payment) -> Payment:
        guard_tenant(payment.organization_id)
        self._s.add(PaymentRow(**row_kwargs(payment)))
        self._s.flush()
        return payment

    def list_for_invoice(self, invoice_id: UUID) -> list[Payment]:
        rows = self._s.execute(
            select(PaymentRow)
            .where(
                PaymentRow.invoice_id == invoice_id,
                PaymentRow.organization_id == current_organization_id(),
            )
            .order_by(PaymentRow.paid_on)
        ).scalars()
        return [to_domain(Payment, row) for row in rows]

    def list(
        self,
        company_id: UUID | None = None,
        client_id: UUID | None = None,
        invoice_id: UUID | None = None,
        paid_from: date | None = None,
        paid_to: date | None = None,
    ) -> list[Payment]:
        stmt = (
            select(PaymentRow)
            .where(PaymentRow.organization_id == current_organization_id())
            .order_by(PaymentRow.paid_on.desc())
        )
        # company/client live on the invoice, so either filter is a join.
        if company_id is not None or client_id is not None:
            stmt = stmt.join(InvoiceRow, InvoiceRow.id == PaymentRow.invoice_id)
            if company_id is not None:
                stmt = stmt.where(InvoiceRow.company_id == company_id)
            if client_id is not None:
                stmt = stmt.where(InvoiceRow.client_id == client_id)
        if invoice_id is not None:
            stmt = stmt.where(PaymentRow.invoice_id == invoice_id)
        if paid_from is not None:
            stmt = stmt.where(PaymentRow.paid_on >= paid_from)
        if paid_to is not None:
            stmt = stmt.where(PaymentRow.paid_on <= paid_to)
        return [to_domain(Payment, row) for row in self._s.execute(stmt).scalars()]


class SqlAlchemySequenceRepository(SequenceRepository):
    def __init__(self, session: Session) -> None:
        self._s = session

    def next_value(self, company_id: UUID, scope: str) -> int:
        org_id = current_organization_id()
        row = self._s.execute(
            select(SequenceRow)
            .where(
                SequenceRow.organization_id == org_id,
                SequenceRow.company_id == company_id,
                SequenceRow.scope == scope,
            )
            .with_for_update()  # row lock on Postgres; SQLite serializes via file lock
        ).scalar_one_or_none()
        if row is None:
            row = SequenceRow(
                organization_id=org_id, company_id=company_id, scope=scope, value=0
            )
            self._s.add(row)
            self._s.flush()
        row.value += 1
        self._s.flush()
        return row.value

    def snapshot(self, company_id: UUID) -> dict[str, int]:
        rows = self._s.execute(
            select(SequenceRow).where(
                SequenceRow.organization_id == current_organization_id(),
                SequenceRow.company_id == company_id,
            )
        ).scalars()
        return {row.scope: row.value for row in rows}

    def restore_value(self, company_id: UUID, scope: str, value: int) -> None:
        org_id = current_organization_id()
        row = self._s.execute(
            select(SequenceRow)
            .where(
                SequenceRow.organization_id == org_id,
                SequenceRow.company_id == company_id,
                SequenceRow.scope == scope,
            )
            .with_for_update()
        ).scalar_one_or_none()
        if row is None:
            row = SequenceRow(
                organization_id=org_id, company_id=company_id, scope=scope, value=value
            )
            self._s.add(row)
        else:
            # Never rewind a live gapless series (ADR-0003 last-line guard).
            row.value = max(row.value, value)
        self._s.flush()


class SqlAlchemyAuditLogRepository(AuditLogRepository):
    def __init__(self, session: Session) -> None:
        self._s = session

    def append(self, entry: AuditLogEntry) -> AuditLogEntry:
        guard_tenant(entry.organization_id)
        self._s.add(AuditLogRow(**row_kwargs(entry)))
        self._s.flush()
        return entry

    def list(
        self,
        limit: int = 50,
        target_type: str | None = None,
        target_id: UUID | None = None,
    ) -> list[AuditLogEntry]:
        stmt = (
            select(AuditLogRow)
            .where(AuditLogRow.organization_id == current_organization_id())
            .order_by(AuditLogRow.timestamp.desc())
            .limit(limit)
        )
        if target_type is not None:
            stmt = stmt.where(AuditLogRow.target_type == target_type)
        if target_id is not None:
            stmt = stmt.where(AuditLogRow.target_id == target_id)
        return [to_domain(AuditLogEntry, row) for row in self._s.execute(stmt).scalars()]


# --- Expenses -------------------------------------------------------------

# Columns `update()` may rewrite. `organization_id` and `created_at` are absent
# for the reason every other repository omits them: an update path that can move
# a row between tenants is a cross-tenant write waiting to be reached by a bug
# one layer up.
_EXPENSE_UPDATABLE = (
    "company_id",
    "state",
    "source_filename",
    "source_document_key",
    "supplier_vat_number",
    "supplier_invoice_number",
    "invoice_date",
    "detected_tva",
    "recoverable_tva",
    "confirmed_at",
    "extracted",
    "checks",
    "classification",
    "duplicate_of_id",
    "failure_code",
    "updated_at",
)


class SqlAlchemyExpenseRepository(ExpenseRepository):
    def __init__(self, session: Session) -> None:
        self._s = session

    def _org_filter(self):
        return ExpenseRow.organization_id == current_organization_id()

    def _get_row(self, expense_id: UUID) -> ExpenseRow | None:
        return self._s.execute(
            select(ExpenseRow).where(ExpenseRow.id == expense_id, self._org_filter())
        ).scalar_one_or_none()

    def add(self, expense: Expense) -> Expense:
        guard_tenant(expense.organization_id)
        row = expense_to_row(expense)
        self._s.add(row)
        self._s.flush()
        return row_to_expense(row)

    def get(self, expense_id: UUID) -> Expense | None:
        row = self._get_row(expense_id)
        return row_to_expense(row) if row else None

    def list(
        self,
        company_id: UUID | None = None,
        state: ExpenseState | None = None,
        needs_attention: bool | None = None,
    ) -> list[Expense]:
        stmt = (
            select(ExpenseRow)
            .where(self._org_filter())
            .order_by(ExpenseRow.created_at.desc())
        )
        if company_id is not None:
            stmt = stmt.where(ExpenseRow.company_id == company_id)
        if state is not None:
            stmt = stmt.where(ExpenseRow.state == state.value)
        rows = self._s.execute(stmt).scalars()
        expenses = [row_to_expense(row) for row in rows]
        if needs_attention is None:
            return expenses
        # Filtered in Python, not SQL. `needs_attention` reads the check list and
        # the classification, both JSON; expressing it as a WHERE would mean a
        # second definition of the predicate that could disagree with the domain's.
        return [e for e in expenses if e.needs_attention is needs_attention]

    def update(self, expense: Expense) -> Expense:
        row = self._get_row(expense.id)
        if row is None:
            raise KeyError(expense.id)
        fresh = expense_to_row(expense)
        for column in _EXPENSE_UPDATABLE:
            setattr(row, column, getattr(fresh, column))
        self._s.flush()
        return row_to_expense(row)

    def delete(self, expense_id: UUID) -> None:
        row = self._get_row(expense_id)
        if row is None:
            return
        self._s.delete(row)
        self._s.flush()

    def find_duplicate(
        self,
        company_id: UUID,
        supplier_vat_number: str | None,
        supplier_invoice_number: str | None,
        exclude_id: UUID | None = None,
    ) -> Expense | None:
        # Both identifiers or nothing — see the port's docstring on why a
        # date-and-amount heuristic is refused here.
        if not supplier_vat_number or not supplier_invoice_number:
            return None
        stmt = select(ExpenseRow).where(
            self._org_filter(),
            ExpenseRow.company_id == company_id,
            ExpenseRow.supplier_vat_number == supplier_vat_number,
            ExpenseRow.supplier_invoice_number == supplier_invoice_number,
        )
        if exclude_id is not None:
            stmt = stmt.where(ExpenseRow.id != exclude_id)
        row = self._s.execute(stmt.limit(1)).scalar_one_or_none()
        return row_to_expense(row) if row else None

    def in_period(self, company_id: UUID, start: date, end: date) -> list[Expense]:
        stmt = (
            select(ExpenseRow)
            .where(
                self._org_filter(),
                ExpenseRow.company_id == company_id,
                ExpenseRow.invoice_date.is_not(None),
                ExpenseRow.invoice_date >= start,
                ExpenseRow.invoice_date <= end,
            )
            .order_by(ExpenseRow.invoice_date)
        )
        return [row_to_expense(row) for row in self._s.execute(stmt).scalars()]


# --- Document templates ---------------------------------------------------

_TEMPLATE_UPDATABLE = (
    "name",
    "doc_type",
    "is_default",
    "draft_blocks",
    "draft_appearance",
    "published_version",
    "updated_at",
)


class SqlAlchemyTemplateRepository(TemplateRepository):
    def __init__(self, session: Session) -> None:
        self._s = session

    def _org_filter(self):
        return DocumentTemplateRow.organization_id == current_organization_id()

    def _get_row(self, template_id: UUID) -> DocumentTemplateRow | None:
        return self._s.execute(
            select(DocumentTemplateRow).where(
                DocumentTemplateRow.id == template_id, self._org_filter()
            )
        ).scalar_one_or_none()

    def add(self, template: DocumentTemplate) -> DocumentTemplate:
        guard_tenant(template.organization_id)
        row = template_to_row(template)
        self._s.add(row)
        self._s.flush()
        return row_to_template(row)

    def get(self, template_id: UUID) -> DocumentTemplate | None:
        row = self._get_row(template_id)
        return row_to_template(row) if row else None

    def list(
        self, company_id: UUID | None = None, doc_type: str | None = None
    ) -> list[DocumentTemplate]:
        stmt = (
            select(DocumentTemplateRow)
            .where(self._org_filter())
            .order_by(
                DocumentTemplateRow.doc_type,
                DocumentTemplateRow.is_default.desc(),
                DocumentTemplateRow.name,
            )
        )
        if company_id is not None:
            stmt = stmt.where(DocumentTemplateRow.company_id == company_id)
        if doc_type is not None:
            stmt = stmt.where(DocumentTemplateRow.doc_type == doc_type)
        return [row_to_template(row) for row in self._s.execute(stmt).scalars()]

    def update(self, template: DocumentTemplate) -> DocumentTemplate:
        row = self._get_row(template.id)
        if row is None:
            raise KeyError(template.id)
        fresh = template_to_row(template)
        for column in _TEMPLATE_UPDATABLE:
            setattr(row, column, getattr(fresh, column))
        self._s.flush()
        return row_to_template(row)

    def delete(self, template_id: UUID) -> None:
        row = self._get_row(template_id)
        if row is None:
            return
        # Published versions go with it. Invoices keep their snapshot by value,
        # so nothing already issued is affected — which is the only reason
        # deleting a template can be allowed at all.
        self._s.execute(
            delete(TemplateVersionRow).where(
                TemplateVersionRow.template_id == template_id,
                TemplateVersionRow.organization_id == current_organization_id(),
            )
        )
        self._s.delete(row)
        self._s.flush()

    def publish(self, template: DocumentTemplate) -> DocumentTemplate:
        row = self._get_row(template.id)
        if row is None:
            raise KeyError(template.id)

        # Next version, read inside this transaction. Two concurrent publishes
        # on Postgres serialise on the unique constraint rather than both
        # writing version 3; the loser gets an IntegrityError, which is the
        # correct outcome for an immutable table.
        highest = self._s.execute(
            select(func.max(TemplateVersionRow.version)).where(
                TemplateVersionRow.template_id == template.id,
                TemplateVersionRow.organization_id == current_organization_id(),
            )
        ).scalar()
        version = (highest or 0) + 1

        self._s.add(
            TemplateVersionRow(
                organization_id=template.organization_id,
                template_id=template.id,
                version=version,
                blocks=[block.model_dump(mode="json") for block in template.blocks],
                appearance=template.appearance.model_dump(mode="json"),
            )
        )
        row.published_version = version
        self._s.flush()
        return row_to_template(row)

    def snapshot_of(self, template_id: UUID, version: int) -> TemplateSnapshot | None:
        template_row = self._get_row(template_id)
        if template_row is None:
            return None
        version_row = self._s.execute(
            select(TemplateVersionRow).where(
                TemplateVersionRow.template_id == template_id,
                TemplateVersionRow.version == version,
                TemplateVersionRow.organization_id == current_organization_id(),
            )
        ).scalar_one_or_none()
        if version_row is None:
            return None
        return TemplateSnapshot.model_validate(
            {
                "template_id": template_id,
                "template_name": template_row.name,
                "version": version,
                "taken_at": version_row.created_at,
                "blocks": version_row.blocks,
                "appearance": version_row.appearance,
            }
        )

    def default_for(
        self, company_id: UUID, doc_type: str = "invoice"
    ) -> DocumentTemplate | None:
        row = self._s.execute(
            select(DocumentTemplateRow).where(
                self._org_filter(),
                DocumentTemplateRow.company_id == company_id,
                DocumentTemplateRow.doc_type == doc_type,
                DocumentTemplateRow.is_default.is_(True),
            )
        ).scalar_one_or_none()
        return row_to_template(row) if row else None

    def clear_default(self, company_id: UUID, doc_type: str = "invoice") -> None:
        self._s.execute(
            update(DocumentTemplateRow)
            .where(
                DocumentTemplateRow.organization_id == current_organization_id(),
                DocumentTemplateRow.company_id == company_id,
                DocumentTemplateRow.doc_type == doc_type,
                DocumentTemplateRow.is_default.is_(True),
            )
            .values(is_default=False)
        )
        self._s.flush()
