import time
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.engine import Engine

from core.pdf import PdfEngineUnavailableError
from core.services import BusinessRuleError, NotFoundError
from core.tenancy import TenantContextError, TenantViolationError
from db.engine import make_engine
from db.repositories import SqlAlchemyUnitOfWork
from db.session import make_session_factory

from .config import Settings, get_settings
from .logging_config import configure_logging
from .middleware import RateLimitMiddleware, TenantBindingMiddleware
from .routers import (
    activity,
    auth,
    clients,
    companies,
    credit_notes,
    health,
    invoices,
    organizations,
    payments,
    products,
    reports,
    users,
)
from .security import AuthService, JwtCodec
from .security.errors import AuthError

_access_log = structlog.get_logger("api.access")


def create_app(settings: Settings | None = None, engine: Engine | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging()

    owns_engine = engine is None
    engine = engine or make_engine(settings.database_url)
    session_factory = make_session_factory(engine)
    codec = JwtCodec(
        settings.jwt_secret, settings.jwt_access_ttl_min, settings.jwt_refresh_ttl_days
    )

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        yield
        if owns_engine:
            engine.dispose()

    app = FastAPI(title="BillGen API", version="0.1.0", lifespan=lifespan)
    app.state.session_factory = session_factory
    app.state.uow_factory = lambda: SqlAlchemyUnitOfWork(session_factory)
    app.state.auth_service = AuthService(session_factory, codec)
    app.state.codec = codec

    @app.middleware("http")
    async def access_log(request: Request, call_next):  # noqa: ANN202
        start = time.perf_counter()
        response = await call_next(request)
        _access_log.info(
            "request",
            method=request.method,
            path=request.url.path,
            status=response.status_code,
            duration_ms=round((time.perf_counter() - start) * 1000, 1),
        )
        return response

    app.add_middleware(TenantBindingMiddleware, codec=codec)
    app.add_middleware(
        RateLimitMiddleware, requests_per_minute=settings.rate_limit_per_minute
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(AuthError)
    async def auth_error_handler(request: Request, exc: AuthError):  # noqa: ANN202
        return JSONResponse(status_code=exc.status_code, content={"detail": str(exc)})

    @app.exception_handler(NotFoundError)
    async def not_found_handler(request: Request, exc: NotFoundError):  # noqa: ANN202
        return JSONResponse(status_code=404, content={"detail": str(exc)})

    @app.exception_handler(BusinessRuleError)
    async def business_rule_handler(request: Request, exc: BusinessRuleError):  # noqa: ANN202
        return JSONResponse(status_code=409, content={"detail": str(exc)})

    @app.exception_handler(TenantViolationError)
    async def tenant_violation_handler(request: Request, exc: TenantViolationError):  # noqa: ANN202
        return JSONResponse(status_code=403, content={"detail": "Forbidden"})

    @app.exception_handler(TenantContextError)
    async def tenant_context_handler(request: Request, exc: TenantContextError):  # noqa: ANN202
        # Reaching a repository without a bound org is a server bug, not user error.
        return JSONResponse(status_code=500, content={"detail": "Tenant context missing"})

    @app.exception_handler(PdfEngineUnavailableError)
    async def pdf_engine_handler(request: Request, exc: PdfEngineUnavailableError):  # noqa: ANN202
        return JSONResponse(
            status_code=503,
            content={"detail": "PDF engine unavailable on this server"},
        )

    app.include_router(health.router)
    app.include_router(auth.router)
    app.include_router(users.router)
    app.include_router(organizations.router)
    app.include_router(companies.router)
    app.include_router(clients.router)
    app.include_router(products.router)
    app.include_router(invoices.router)
    app.include_router(credit_notes.router)
    app.include_router(payments.router)
    app.include_router(reports.router)
    app.include_router(activity.router)
    return app


app = create_app()
