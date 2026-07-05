"""Binds the JWT's org_id claim into core.tenancy for the request's duration.

Everything outside the public allowlist requires a valid access token. The
ContextVar binding is what makes repositories tenant-scoped — a router cannot
forget to filter by organization, because the filter lives below it.
"""

from uuid import UUID

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from core.tenancy import organization_context

from ..security.errors import InvalidTokenError
from ..security.jwt import JwtCodec

_PUBLIC_EXACT = {"/", "/healthz", "/readyz", "/docs", "/redoc", "/openapi.json"}
_PUBLIC_PREFIXES = ("/auth/",)


def _is_public(path: str) -> bool:
    return path in _PUBLIC_EXACT or path.startswith(_PUBLIC_PREFIXES)


def _unauthorized(detail: str) -> JSONResponse:
    return JSONResponse(status_code=401, content={"detail": detail})


class TenantBindingMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, codec: JwtCodec) -> None:  # noqa: ANN001
        super().__init__(app)
        self._codec = codec

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        if _is_public(request.url.path):
            return await call_next(request)

        authorization = request.headers.get("authorization", "")
        if not authorization.lower().startswith("bearer "):
            return _unauthorized("Missing bearer token")

        try:
            payload = self._codec.decode(authorization[7:], expected_type="access")
            user_id = UUID(payload["sub"])
            org_id = UUID(payload["org_id"])
        except (InvalidTokenError, KeyError, ValueError):
            return _unauthorized("Invalid or expired token")

        request.state.user_id = user_id
        request.state.org_id = org_id
        request.state.role = payload.get("role", "member")

        with organization_context(org_id):
            return await call_next(request)
