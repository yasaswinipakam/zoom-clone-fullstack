"""Logging configuration.

Per Constitution Section 12.1, structured logging is configured once,
here, using Python's standard `logging` module. Nothing else in the
codebase should call `logging.basicConfig()` directly.
"""

import logging
import logging.config

from app.core.config import settings
from app.core.constants import DEFAULT_LOG_DATE_FORMAT, DEFAULT_LOG_FORMAT


class _CorrelationIdFilter(logging.Filter):
    """Ensure every log record has a `correlation_id` attribute.

    The request-logging middleware (see `app.core.middleware`) attaches
    a real correlation ID to records emitted during a request. Records
    emitted outside a request (e.g. at startup) would otherwise raise a
    `KeyError` in the format string, so this filter fills in a safe
    default of "-" when one hasn't been set.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        """Attach a default `correlation_id` if none is present.

        Args:
            record: The log record being emitted.

        Returns:
            Always True — this filter only enriches, never suppresses.
        """
        if not hasattr(record, "correlation_id"):
            record.correlation_id = "-"
        return True


def configure_logging() -> None:
    """Apply the application's logging configuration.

    Called once from the FastAPI startup lifecycle in `main.py`. Safe to
    call multiple times (e.g. in tests) since `dictConfig` is idempotent.
    """
    config: dict = {
        "version": 1,
        "disable_existing_loggers": False,
        "filters": {
            "correlation_id": {"()": _CorrelationIdFilter},
        },
        "formatters": {
            "default": {
                "format": DEFAULT_LOG_FORMAT,
                "datefmt": DEFAULT_LOG_DATE_FORMAT,
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "default",
                "filters": ["correlation_id"],
                "stream": "ext://sys.stdout",
            },
        },
        "root": {
            "level": settings.log_level,
            "handlers": ["console"],
        },
        "loggers": {
            "uvicorn": {"level": settings.log_level, "propagate": True},
            "uvicorn.access": {"level": settings.log_level, "propagate": True},
            "sqlalchemy.engine": {"level": "WARNING", "propagate": True},
        },
    }
    logging.config.dictConfig(config)
