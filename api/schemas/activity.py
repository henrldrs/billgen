from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class ActivityEntryResponse(BaseModel):
    id: UUID
    actor_user_id: UUID | None
    action: str
    target_type: str
    target_id: UUID | None
    before: dict[str, Any] | None
    after: dict[str, Any] | None
    timestamp: datetime
