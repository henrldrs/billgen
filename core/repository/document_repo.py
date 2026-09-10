from abc import ABC, abstractmethod
from uuid import UUID

from ..models import Document, DocumentKind


class DocumentRepository(ABC):
    """The register of files written outside the database (T-27).

    `for_target` is what makes archiving idempotent: an invoice that already
    has a row is never re-rendered, so a template edited next year cannot
    quietly rewrite a document that was issued this one.
    """

    @abstractmethod
    def add(self, document: Document) -> Document: ...

    @abstractmethod
    def update(self, document: Document) -> Document: ...

    @abstractmethod
    def get(self, document_id: UUID) -> Document | None: ...

    @abstractmethod
    def list(self, kind: DocumentKind | None = None) -> list[Document]:
        """Newest first."""

    @abstractmethod
    def for_target(self, target_type: str, target_id: UUID) -> Document | None: ...
