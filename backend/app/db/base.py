"""Declarative base for SQLAlchemy ORM models.

Per Constitution Section 6.1, all models use SQLAlchemy 2.0 style
(`Mapped[...]` / `mapped_column(...)`) and inherit from `Base` defined
here. No models are defined in this milestone — this file only
establishes the shared base and its metadata, which Alembic's
`env.py` will later import as `target_metadata`.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Shared declarative base class for every ORM model in the app."""
