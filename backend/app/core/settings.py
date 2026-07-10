"""Ergonomic re-export of the application settings.

The `Settings` class and its singleton instance are defined once in
`app.core.config` (Constitution Section 13.1 names `config.py` as the
canonical home for settings). This module exists only because the
Milestone 1 specification calls out `settings.py` as its own deliverable;
it intentionally contains zero logic to avoid a second source of truth.
Prefer importing from `app.core.config` in new code — this module is a
convenience alias.
"""

from app.core.config import Settings, get_settings, settings

__all__ = ["Settings", "get_settings", "settings"]
