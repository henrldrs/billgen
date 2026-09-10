from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class ConfigurationError(RuntimeError):
    """Fatal misconfiguration — refuse to boot rather than run insecurely."""


_DEV_JWT_SECRET = "dev-only-secret-change-me-0123456789abcdef"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # "dev" on workstations; a hosted deployment MUST set ENVIRONMENT=production
    # (the Docker image will) — anything that isn't dev/test gets the strict
    # boot guards in validate_for_boot().
    environment: str = "dev"

    database_url: str = "sqlite:///./var/billgen.dev.db"

    # >= 32 bytes for HS256 (RFC 7518); replace in every real deployment.
    jwt_secret: str = _DEV_JWT_SECRET
    jwt_access_ttl_min: int = 15
    jwt_refresh_ttl_days: int = 30

    # Comma-separated in the env var, e.g. "http://localhost:5173,https://app.billgen.be"
    cors_origins: str = "http://localhost:5173"

    # Requests per minute per client IP; 0 disables the limiter.
    rate_limit_per_minute: int = 120
    #  Failed sign-ins per IP per minute (SEC-20). Deliberately small:
    #  a person mistyping a password a few times stays under it, and an
    #  attacker guessing meets it almost at once. Only failures count.
    auth_failures_per_minute: int = 10

    #  Where issued documents are written (T-27). Empty disables archiving
    #  entirely — every endpoint keeps working and nothing is put on disk,
    #  which is what a test run and a bare `uvicorn` want. The desktop sets it
    #  to the resolved data directory; a hosted deployment must set it too, or
    #  the seven-year retention duty rests on the database alone.
    document_root: str = ""

    # Desktop build: enables POST /auth/desktop-bootstrap (single local user).
    # MUST stay false for hosted SaaS — it mints an account with no credentials.
    desktop_mode: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment.strip().lower() not in ("dev", "development", "test")


def validate_for_boot(settings: Settings) -> list[str]:
    """Boot-time config guard, called by create_app() before anything else.

    Returns human-readable warnings to log; raises ConfigurationError for
    anything a hosted deployment must never run with. Dev stays permissive so
    local workflows (billgen.bat, launch.json, tests) are untouched.
    """
    warnings: list[str] = []

    if settings.is_production:
        if settings.jwt_secret == _DEV_JWT_SECRET:
            raise ConfigurationError(
                "ENVIRONMENT=production but jwt_secret is the dev default — "
                "set JWT_SECRET to a unique >=32-byte value."
            )
        if len(settings.jwt_secret.encode("utf-8")) < 32:
            raise ConfigurationError(
                "JWT_SECRET is shorter than 32 bytes — too weak for HS256 (RFC 7518)."
            )
        if settings.desktop_mode:
            raise ConfigurationError(
                "desktop_mode=true on a production start — desktop bootstrap mints "
                "a credential-less account and must never be hosted."
            )
        if "*" in settings.cors_origin_list:
            warnings.append("CORS allows every origin ('*') in production — restrict CORS_ORIGINS.")
        dev_origins = [
            origin
            for origin in settings.cors_origin_list
            if "localhost" in origin or "127.0.0.1" in origin
        ]
        if dev_origins:
            warnings.append(f"CORS allows dev origins in production: {', '.join(dev_origins)}")
        if settings.database_url.startswith("sqlite"):
            warnings.append("SQLite on a production start — hosted SaaS should run Postgres.")
        if not settings.document_root.strip():
            warnings.append(
                "DOCUMENT_ROOT is unset — issued invoices are not archived to disk (T-27)."
            )
    elif settings.jwt_secret == _DEV_JWT_SECRET:
        warnings.append("Running with the dev jwt_secret default — fine locally, never hosted.")

    return warnings


@lru_cache
def get_settings() -> Settings:
    return Settings()
