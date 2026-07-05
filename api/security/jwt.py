from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID, uuid4

import jwt

from .errors import InvalidTokenError

_ALGORITHM = "HS256"


@dataclass(frozen=True)
class TokenPair:
    access_token: str
    refresh_token: str
    expires_in: int  # access-token lifetime in seconds
    token_type: str = "bearer"


class JwtCodec:
    def __init__(self, secret: str, access_ttl_min: int, refresh_ttl_days: int) -> None:
        self._secret = secret
        self._access_ttl = timedelta(minutes=access_ttl_min)
        self._refresh_ttl = timedelta(days=refresh_ttl_days)

    @property
    def access_ttl_seconds(self) -> int:
        return int(self._access_ttl.total_seconds())

    def issue_access(self, user_id: UUID, org_id: UUID, role: str) -> str:
        now = datetime.now(timezone.utc)
        return jwt.encode(
            {
                "sub": str(user_id),
                "org_id": str(org_id),
                "role": role,
                "type": "access",
                "jti": str(uuid4()),
                "iat": now,
                "exp": now + self._access_ttl,
            },
            self._secret,
            algorithm=_ALGORITHM,
        )

    def issue_refresh(self, user_id: UUID, org_id: UUID) -> tuple[str, UUID, datetime]:
        """Returns (token, jti, expires_at); the jti is persisted for revocation."""
        now = datetime.now(timezone.utc)
        jti = uuid4()
        expires_at = now + self._refresh_ttl
        token = jwt.encode(
            {
                "sub": str(user_id),
                "org_id": str(org_id),
                "type": "refresh",
                "jti": str(jti),
                "iat": now,
                "exp": expires_at,
            },
            self._secret,
            algorithm=_ALGORITHM,
        )
        return token, jti, expires_at

    def decode(self, token: str, expected_type: str) -> dict[str, Any]:
        try:
            payload = jwt.decode(token, self._secret, algorithms=[_ALGORITHM])
        except jwt.PyJWTError as exc:
            raise InvalidTokenError(str(exc)) from exc
        if payload.get("type") != expected_type:
            raise InvalidTokenError(f"Expected a {expected_type} token")
        return payload
