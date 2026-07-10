"""Logger factory.

Every module that needs to log imports `get_logger(__name__)` from here
rather than calling `logging.getLogger` directly, so the naming
convention stays consistent and greppable across the codebase.
"""

import logging


def get_logger(name: str) -> logging.Logger:
    """Return a module-scoped logger.

    Args:
        name: Typically the caller's `__name__`, producing a logger
            hierarchy that mirrors the package structure.

    Returns:
        A standard library `Logger` configured by
        `app.core.logging_config.configure_logging`.
    """
    return logging.getLogger(name)
