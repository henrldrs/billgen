from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./var/billgen.dev.db"

    # >= 32 bytes for HS256 (RFC 7518); replace in every real deployment.
    jwt_secret: str = "dev-only-secret-change-me-0123456789abcdef"
    jwt_access_ttl_min: int = 15
    jwt_refresh_ttl_days: int = 30

    # Comma-separated in the env var, e.g. "http://localhost:5173,https://app.billgen.be"
    cors_origins: str = "http://localhost:5173"

    # Requests per minute per client IP; 0 disables the limiter.
    rate_limit_per_minute: int = 120

    # Desktop build: enables POST /auth/desktop-bootstrap (single local user).
    # MUST stay false for hosted SaaS — it mints an account with no credentials.
    desktop_mode: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
