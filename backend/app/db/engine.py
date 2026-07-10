"""SQLAlchemy engine creation.

Isolated in its own module so engine-level configuration (pool size,
`connect_args`, future PostgreSQL-specific options) changes in exactly
one place, per Constitution Section 1.2 ("Maintainability").
"""

from pathlib import Path

from sqlalchemy import Engine, create_engine

from app.core.config import settings

_is_sqlite = settings.database_url.startswith("sqlite")

# SQLite's file-based driver will not create a missing parent directory
# on its own (e.g. the `data/` folder for `sqlite:///./data/zoom_clone.db`),
# so a fresh clone would otherwise fail on first connection. Creating it
# here, once, at engine-construction time keeps this concern out of
# `session.py`/`base.py`, each of which stays focused on its own job.
if _is_sqlite:
    _sqlite_path = settings.database_url.removeprefix("sqlite:///")
    if _sqlite_path not in ("", ":memory:"):
        Path(_sqlite_path).parent.mkdir(parents=True, exist_ok=True)

# SQLite requires this flag when used with FastAPI's threaded request
# handling, since a single connection is otherwise bound to the thread
# that created it. It is a no-op for other database backends, so it
# does not compromise the future PostgreSQL migration path described
# in Constitution Section 13.3.
_connect_args: dict[str, bool] = {"check_same_thread": False} if _is_sqlite else {}

engine: Engine = create_engine(
    settings.database_url,
    connect_args=_connect_args,
)
