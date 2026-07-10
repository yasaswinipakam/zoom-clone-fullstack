"""Pydantic request/response contracts.

Milestone 2 introduces the Meeting domain's schemas, re-exported here
for a single, stable import surface (Constitution Section 3.2).
"""

from app.schemas.meeting import (
    MeetingBase,
    MeetingCreate,
    MeetingListResponse,
    MeetingResponse,
    MeetingUpdate,
)

__all__ = [
    "MeetingBase",
    "MeetingCreate",
    "MeetingListResponse",
    "MeetingResponse",
    "MeetingUpdate",
]
