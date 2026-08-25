from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import BaseModel


def json_safe(obj: Any) -> Any:  # noqa: PLR0911 — one return per type is the dispatch
    """Recursively convert a value into something json.dumps can handle.

    Used at the audit-log boundary: Decimal -> str (no float drift in the
    fiscal trail), UUID -> str, date/datetime -> ISO 8601, Enum -> value.
    """
    if obj is None or isinstance(obj, (str, int, float, bool)):
        return obj
    if isinstance(obj, Decimal):
        return str(obj)
    if isinstance(obj, UUID):
        return str(obj)
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, Enum):
        return json_safe(obj.value)
    if isinstance(obj, BaseModel):
        return json_safe(obj.model_dump(mode="python"))
    if isinstance(obj, dict):
        return {str(k): json_safe(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple, set)):
        return [json_safe(item) for item in obj]
    return str(obj)
