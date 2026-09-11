from abc import ABC, abstractmethod
from uuid import UUID

from ..models import LegalAcceptance


class LegalAcceptanceRepository(ABC):
    """The proof that a versioned legal text was accepted (T-29)."""

    @abstractmethod
    def add(self, acceptance: LegalAcceptance) -> LegalAcceptance: ...

    @abstractmethod
    def list_for_user(self, user_id: UUID) -> list[LegalAcceptance]:
        """Every acceptance this user has made in this organization, newest first."""
