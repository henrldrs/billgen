from abc import ABC, abstractmethod
from uuid import UUID

from ..models import CreditNote


class CreditNoteRepository(ABC):
    @abstractmethod
    def add(self, credit_note: CreditNote) -> CreditNote: ...

    @abstractmethod
    def get(self, credit_note_id: UUID) -> CreditNote | None: ...

    @abstractmethod
    def list(self, company_id: UUID | None = None) -> list[CreditNote]: ...
