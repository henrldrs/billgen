from abc import ABC, abstractmethod
from uuid import UUID

from ..models.template import DocumentTemplate, TemplateSnapshot


class TemplateRepository(ABC):
    """Templates, their published versions, and the snapshot lookup.

    `publish` and `snapshot_of` are the two methods that make rule 3 real. A
    template's draft is mutable; a published version never is. An issued invoice
    stores the snapshot by value, so nothing here can retroactively restyle a
    document that has already been sent.
    """

    @abstractmethod
    def add(self, template: DocumentTemplate) -> DocumentTemplate: ...

    @abstractmethod
    def get(self, template_id: UUID) -> DocumentTemplate | None: ...

    @abstractmethod
    def list(
        self, company_id: UUID | None = None, doc_type: str | None = None
    ) -> list[DocumentTemplate]: ...

    @abstractmethod
    def update(self, template: DocumentTemplate) -> DocumentTemplate: ...

    @abstractmethod
    def delete(self, template_id: UUID) -> None:
        """Callers MUST ensure the template is not the company default.

        Deleting a template does not affect invoices already issued with it —
        their snapshot is by value. That is the property that makes deletion
        safe at all.
        """
        ...

    @abstractmethod
    def publish(self, template: DocumentTemplate) -> DocumentTemplate:
        """Freeze the current draft as the next version, atomically.

        Allocating the version number and writing the immutable row must happen
        in one transaction, or two concurrent publishes produce two version 3s.
        """
        ...

    @abstractmethod
    def snapshot_of(self, template_id: UUID, version: int) -> TemplateSnapshot | None:
        """One published version, as it was written."""
        ...

    @abstractmethod
    def default_for(
        self, company_id: UUID, doc_type: str = "invoice"
    ) -> DocumentTemplate | None:
        """Each document type has its own default.

        A company needs a default invoice template *and* a default quote
        template; one flag across both would mean issuing a quote picked
        the invoice's layout, wording included."""
        ...

    @abstractmethod
    def clear_default(self, company_id: UUID, doc_type: str = "invoice") -> None:
        """Unset the default flag across a company's templates of one type.

        Exactly one default is enforced here rather than by a partial unique
        index: SQLite's support for those is version-dependent, and the desktop
        build is the one target that cannot be upgraded on demand.
        """
        ...
