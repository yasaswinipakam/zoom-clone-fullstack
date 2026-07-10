"""Single ergonomic import surface for database infrastructure.

The Engineering Design Document (Section 2.2) envisions one
`database.py` exposing `Engine`, `SessionLocal`, `Base`, and `get_db()`.
The Constitution (Section 3.1) instead splits these across dedicated
files for single-responsibility-per-file. This module reconciles both:
the actual definitions live in `engine.py`, `base.py`, and `session.py`
(one concern per file, per Constitution), and this module re-exports
them under the combined name the design document expects. It contains
no logic of its own.
"""

from app.db.base import Base
from app.db.engine import engine
from app.db.session import SessionLocal, get_db

__all__ = ["Base", "SessionLocal", "engine", "get_db"]
