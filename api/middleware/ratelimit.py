"""In-memory sliding-window rate limiter, keyed by client IP.

Good enough for the desktop sidecar and a single-instance SaaS deployment;
swap the store for Redis when the API scales horizontally (Phase 12+)."""

import time
from collections import defaultdict, deque

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

_EXEMPT = {"/healthz", "/readyz"}
_WINDOW_SECONDS = 60.0


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute: int) -> None:  # noqa: ANN001
        super().__init__(app)
        self._limit = requests_per_minute
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        if self._limit <= 0 or request.url.path in _EXEMPT:
            return await call_next(request)

        key = request.client.host if request.client else "unknown"
        now = time.monotonic()
        hits = self._hits[key]
        while hits and now - hits[0] > _WINDOW_SECONDS:
            hits.popleft()
        if len(hits) >= self._limit:
            return JSONResponse(status_code=429, content={"detail": "Too many requests"})
        hits.append(now)
        return await call_next(request)
