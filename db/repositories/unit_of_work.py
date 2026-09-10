from __future__ import annotations

from sqlalchemy.orm import Session, sessionmaker

from core.repository import UnitOfWork

from .sqlalchemy_repositories import (
    SqlAlchemyAuditLogRepository,
    SqlAlchemyClientRepository,
    SqlAlchemyCompanyRepository,
    SqlAlchemyCreditNoteRepository,
    SqlAlchemyDocumentRepository,
    SqlAlchemyExpenseRepository,
    SqlAlchemyInvoiceRepository,
    SqlAlchemyOrganizationRepository,
    SqlAlchemyPaymentRepository,
    SqlAlchemyProductRepository,
    SqlAlchemyQuoteRepository,
    SqlAlchemySequenceRepository,
    SqlAlchemyTemplateRepository,
    SqlAlchemyUserRepository,
)


class SqlAlchemyUnitOfWork(UnitOfWork):
    def __init__(self, session_factory: sessionmaker[Session]) -> None:
        self._session_factory = session_factory
        self.session: Session | None = None

    def __enter__(self) -> SqlAlchemyUnitOfWork:
        self.session = self._session_factory()
        s = self.session
        self.organizations = SqlAlchemyOrganizationRepository(s)
        self.users = SqlAlchemyUserRepository(s)
        self.companies = SqlAlchemyCompanyRepository(s)
        self.clients = SqlAlchemyClientRepository(s)
        self.products = SqlAlchemyProductRepository(s)
        self.invoices = SqlAlchemyInvoiceRepository(s)
        self.quotes = SqlAlchemyQuoteRepository(s)
        self.credit_notes = SqlAlchemyCreditNoteRepository(s)
        self.payments = SqlAlchemyPaymentRepository(s)
        self.expenses = SqlAlchemyExpenseRepository(s)
        self.documents = SqlAlchemyDocumentRepository(s)
        self.templates = SqlAlchemyTemplateRepository(s)
        self.sequences = SqlAlchemySequenceRepository(s)
        self.audit_log = SqlAlchemyAuditLogRepository(s)
        return self

    def __exit__(self, exc_type, exc, tb) -> None:  # noqa: ANN001
        assert self.session is not None
        try:
            if exc_type is not None:
                self.session.rollback()
        finally:
            self.session.close()
            self.session = None

    def commit(self) -> None:
        assert self.session is not None
        self.session.commit()

    def rollback(self) -> None:
        assert self.session is not None
        self.session.rollback()
