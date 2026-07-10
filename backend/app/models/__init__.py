"""SQLAlchemy ORM models.

Milestone 2 introduces the Meeting domain. `Meeting` is re-exported
here so Alembic's `env.py` (which imports `app.models` to populate
`Base.metadata` for autogeneration) and other consumers have a single,
stable import surface, per Constitution Section 3.2. `Participant` and
`User` are added in the milestones that define their respective
domains.
"""

from app.models.enums import MeetingStatus, MeetingType
from app.models.meeting import Meeting

__all__ = ["Meeting", "MeetingStatus", "MeetingType"]
