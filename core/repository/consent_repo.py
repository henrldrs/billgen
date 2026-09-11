from abc import ABC, abstractmethod
from uuid import UUID

from ..models import ConsentRecord


class ConsentRepository(ABC):
    """Consent decisions, kept (T-35). Append-only by design."""

    @abstractmethod
    def add(self, record: ConsentRecord) -> ConsentRecord: ...

    @abstractmethod
    def list_for_user(self, user_id: UUID) -> list[ConsentRecord]:
        """Newest first; the first entry is the decision in force."""
