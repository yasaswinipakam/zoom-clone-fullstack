"""Data-access layer (Constitution Section 8).

Milestone 2 introduces `MeetingRepository`, re-exported here for a
single, stable import surface (Constitution Section 3.2).
"""

from app.repositories.meeting_repository import MeetingRepository

__all__ = ["MeetingRepository"]
