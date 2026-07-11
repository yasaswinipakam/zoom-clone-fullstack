"""Application settings.

Per Constitution Section 13.1, all configuration is centralized here
using Pydantic `BaseSettings`, reading from environment variables with
sensible defaults for local development. No other module may read
`os.environ` directly.
"""

from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


_DEVELOPMENT_JWT_SECRET = "change-this-local-development-secret-before-deployment"


class Settings(BaseSettings):
    """Environment-driven application configuration.

    Attributes:
        app_name: Human-readable service name, shown in OpenAPI docs.
        app_version: Semantic version of the running service.
        environment: Deployment environment name (e.g. "local", "production").
        debug: Enables verbose/dev-only behavior. Never true in production.
        database_url: SQLAlchemy connection string. Abstracted here so a
            future move to PostgreSQL is a config change, not a rewrite
            (Constitution Section 13.3).
        cors_allow_origins: Comma-free list of origins permitted to call
            this API from a browser.
        log_level: Root log level, per Constitution Section 12.2.
    """

    app_name: str = "Zoom Clone API"
    app_version: str = "0.1.0"
    environment: str = "local"
    debug: bool = False

    database_url: str = "sqlite:///./data/zoom_clone.db"

    cors_allow_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    log_level: str = "INFO"

    auth_enabled: bool = True
    jwt_secret_key: str = _DEVELOPMENT_JWT_SECRET
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @model_validator(mode="after")
    def reject_development_secret_in_production(self) -> "Settings":
        """Prevent the committed local fallback from being used in production."""
        if (
            self.auth_enabled
            and self.environment.lower() == "production"
            and self.jwt_secret_key == _DEVELOPMENT_JWT_SECRET
        ):
            raise ValueError("JWT_SECRET_KEY must be set to a unique production secret")
        return self


@lru_cache
def get_settings() -> Settings:
    """Return a cached, process-wide `Settings` instance.

    Using `lru_cache` guarantees the `.env` file is parsed exactly once
    and every consumer (FastAPI dependencies, module-level imports)
    shares the same instance.

    Returns:
        The application's singleton `Settings` object.
    """
    return Settings()


settings = get_settings()
