"""SQLAlchemy implementations of the CORE repository ports.

Consolidated in one module while each adapter is thin; split per-aggregate when
any of them grows past a screenful.

Tenancy: every tenant-scoped query filters on core.tenancy.current_organization_id(),
and every write guards that the entity's organization_id matches the bound context.
"""

from uuid import UUID

from sqlalchemy import select
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
    User,
)
from core.repository import (
    AuditLogRepository,
    ClientRepository,
    CompanyRepository,
    CreditNoteRepository,
    InvoiceRepository,
    OrganizationRepository,
    PaymentRepository,
    ProductRepository,
    SequenceRepository,
    UserRepository,
)
from core.tenancy import current_organization_id, guard_tenant
from db.models import (
    AuditLogRow,
    ClientRow,
    CompanyRow,
    CreditNoteRow,
    InvoiceRow,
    OrganizationRow,
    OrgMembershipRow,
    PaymentRow,
    ProductRow,
    SequenceRow,
    UserRow,
)

from .mappers import (
    credit_note_to_row,
    invoice_to_row,
    row_kwargs,
    row_to_credit_note,
    row_to_invoice,
    to_domain,
)


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


class SqlAlchemyProductRepository(_TenantCrudRepository, ProductRepository):
    row_cls = ProductRow
    model_cls = Product

    def list(self, company_id: UUID | None = None) -> list[Product]:
        stmt = select(ProductRow).where(self._org_filter()).order_by(ProductRow.name)
        if company_id is not None:
            stmt = stmt.where(ProductRow.company_id == company_id)
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
