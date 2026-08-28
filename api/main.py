import time
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sqlalchemy.engine import Engine

from core.pdf import PdfEngineUnavailableError
from core.services import BusinessRuleError, NotFoundError, PeppolValidationError
from core.tenancy import TenantContextError, TenantViolationError
from db.engine import make_engine
from db.repositories import SqlAlchemyUnitOfWork
from db.session import make_session_factory

from .authz import PermissionDeniedError
from .config import Settings, get_settings, validate_for_boot
from .entitlements import EntitlementError
from .logging_config import configure_logging
from .middleware import RateLimitMiddleware, TenantBindingMiddleware
from .routers import (
    activity,
    alerts,
    auth,
    backup,
    clients,
    companies,
    credit_notes,
    desktop,
    entitlements,
    health,
    imports,
    invoices,
    organizations,
    payments,
    products,
    reference,
    reports,
    search,
    users,
)
from .security import AuthService, JwtCodec
from .security.errors import AuthError

_access_log = structlog.get_logger("api.access")


def _register_exception_handlers(app: FastAPI) -> None:
    """Every way a request can fail, and the status it becomes.

    Split out of `create_app` so the factory stays readable as wiring. The
    exception-to-status mapping is a contract worth reading on its own, and
    it is the part most likely to grow.
    """
    @app.exception_handler(AuthError)
    async def auth_error_handler(request: Request, exc: AuthError):  # noqa: ANN202
        return JSONResponse(status_code=exc.status_code, content={"detail": str(exc)})

    @app.exception_handler(NotFoundError)
    async def not_found_handler(request: Request, exc: NotFoundError):  # noqa: ANN202
        return JSONResponse(status_code=404, content={"detail": str(exc)})

    @app.exception_handler(PeppolValidationError)
    async def peppol_validation_handler(request: Request, exc: PeppolValidationError):  # noqa: ANN202
        return JSONResponse(
            status_code=422,
            content={
                "detail": "Invoice is not deliverable over Peppol",
                "errors": [
                    {"field": e.field, "message_key": e.message_key} for e in exc.errors
                ],
            },
        )

    @app.exception_handler(ValidationError)
    async def domain_validation_handler(request: Request, exc: ValidationError):  # noqa: ANN202
        # A domain model rejecting a value is a client error, not a server fault.
        # PATCH handlers re-validate the whole model after merging the changes,
        # so this is the natural exit for "explicit null on a non-nullable field".
        # FastAPI's own RequestValidationError handler covers the body/query
        # layer; this covers the layer below it.
        return JSONResponse(
            status_code=422,
            content={"detail": jsonable_encoder(exc.errors(include_url=False))},
        )

    @app.exception_handler(EntitlementError)
    async def entitlement_handler(request: Request, exc: EntitlementError):  # noqa: ANN202
        # 402 = commercially unavailable. Distinct from 403, which means
        # authenticated but not authorized — only 402 should open an upgrade
        # modal, so the frontend needs one generic handler and no per-feature
        # payment logic anywhere in React.
        return JSONResponse(status_code=402, content=exc.body())

    @app.exception_handler(PermissionDeniedError)
    async def permission_denied_handler(request: Request, exc: PermissionDeniedError):  # noqa: ANN202
        # 403 = authenticated, but this person may not do this — whatever the
        # subscription says. The mirror of the 402 above, and never an upgrade
        # modal: no amount of money makes a viewer an admin.
        _access_log.info(
            "permission_denied",
            permission=exc.permission.value,
            role=exc.role,
            path=request.url.path,
        )
        return JSONResponse(status_code=403, content=exc.body())

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
        _access_log.error("pdf_engine_unavailable", engine_errors=str(exc))
        return JSONResponse(
            status_code=503,
            content={"detail": "PDF engine unavailable on this server"},
        )


def create_app(settings: Settings | None = None, engine: Engine | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging()

    # Refuses to boot on fatal hosted misconfig (dev JWT secret, desktop_mode…);
    # anything survivable is logged as a warning.
    for warning in validate_for_boot(settings):
        structlog.get_logger("api.boot").warning("config", detail=warning)

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
    app.state.settings = settings
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

    _register_exception_handlers(app)

    app.include_router(health.router)
    app.include_router(auth.router)
    app.include_router(desktop.router)
    app.include_router(users.router)
    app.include_router(organizations.router)
    app.include_router(companies.router)
    app.include_router(clients.router)
    app.include_router(products.router)
    app.include_router(imports.router)
    app.include_router(invoices.router)
    app.include_router(credit_notes.router)
    app.include_router(payments.router)
    app.include_router(reference.router)
    app.include_router(entitlements.router)
    app.include_router(reports.router)
    app.include_router(search.router)
    app.include_router(activity.router)
    app.include_router(alerts.router)
    app.include_router(backup.router)
    return app


app = create_app()
