"""In-memory sliding-window rate limiter, keyed by client IP.

Good enough for the desktop sidecar and a single-instance SaaS deployment;
swap the store for Redis when the API scales horizontally (Phase 12+). Note
what that swap is really for: the window below lives in this process, so N
instances silently grant N times the limit.

**Two buckets, not one (SEC-20).** A single global budget rates
``/auth/login`` exactly like scrolling a list of invoices. Credential stuffing
is the most common way an account is taken over in this product category, and
a limit tuned for ordinary browsing is not a defence against it — at 120/min
an attacker gets 172,800 attempts a day from one address. So authentication
paths draw from their own, much smaller budget, and they draw from it on
*failure* only: a person signing in correctly should never meet a limiter, and
an attacker guessing should meet it almost immediately.

This is half a defence. The other half is per-account lockout, which needs a
record of failed sign-ins that nothing currently writes — see SEC-15's own
`unrecorded()`. Until that exists, an attacker spreading one guess per account
across many addresses is not stopped here.
"""

import time
from collections import defaultdict, deque

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

_EXEMPT = {"/healthz", "/readyz"}
_WINDOW_SECONDS = 60.0

#: Paths where a failure is an attempt at somebody's account rather than a
#: mistake in a form. Matched by prefix so `/auth/login` and any future
#: `/auth/password/reset` are covered without being re-listed.
_AUTH_PREFIXES = ("/auth/login", "/auth/signup", "/auth/password")

#: Responses that mean "that did not work". A limiter that counted successes
#: would log a working user out of their own account.
_FAILURE_CODES = frozenset({400, 401, 403, 409, 422})


def _is_auth_path(path: str) -> bool:
    return path.startswith(_AUTH_PREFIXES)


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,  # noqa: ANN001
        requests_per_minute: int,
        auth_failures_per_minute: int = 10,
    ) -> None:
        super().__init__(app)
        self._limit = requests_per_minute
        self._auth_limit = auth_failures_per_minute
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._auth_hits: dict[str, deque[float]] = defaultdict(deque)

    @staticmethod
    def _trim(hits: deque[float], now: float) -> None:
        while hits and now - hits[0] > _WINDOW_SECONDS:
            hits.popleft()

    @staticmethod
    def _too_many() -> JSONResponse:
        return JSONResponse(status_code=429, content={"detail": "Too many requests"})

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if self._limit <= 0 or request.url.path in _EXEMPT:
            return await call_next(request)

        key = request.client.host if request.client else "unknown"
        now = time.monotonic()
        auth = _is_auth_path(request.url.path)

        #  The auth budget is checked *before* the request runs, so a caller
        #  already over it never reaches the password hasher — which is the
        #  expensive part and therefore the part worth protecting.
        if auth and self._auth_limit > 0:
            failures = self._auth_hits[key]
            self._trim(failures, now)
            if len(failures) >= self._auth_limit:
                return self._too_many()

        hits = self._hits[key]
        self._trim(hits, now)
        if len(hits) >= self._limit:
            return self._too_many()
        hits.append(now)

        response = await call_next(request)

        #  Charged after the fact and only on failure. A correct sign-in costs
        #  nothing, so no amount of legitimate use can lock a customer out.
        if auth and self._auth_limit > 0 and response.status_code in _FAILURE_CODES:
            self._auth_hits[key].append(time.monotonic())

        return response
