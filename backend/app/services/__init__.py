"""Business logic layer (Constitution Section 9).

Milestone 2 introduces `MeetingService`, re-exported here for a
single, stable import surface (Constitution Section 3.2).
"""

from app.services.meeting_service import MeetingService

__all__ = ["MeetingService"]
