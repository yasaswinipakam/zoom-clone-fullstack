"""Meeting API request/response contracts.

Per Constitution Section 7, these Pydantic schemas are the public API
contract and are deliberately decoupled from `app.models.meeting.Meeting`
(the ORM shape) — see the Engineering Design Document Section "Why did
you separate schemas from models?" (Section 12) for the interview-ready
rationale. This module owns validation only; it never touches the
database or business rules.
"""

from datetime import UTC, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import MeetingStatus, MeetingType


class MeetingBase(BaseModel):
    """Fields shared across meeting request/response schemas.

    Per Constitution Section 7.5, shared fields are factored here and
    inherited by `Create`/`Update`/`Response` to avoid duplication.
    """

    title: str | None = Field(
        default=None,
        max_length=200,
        description=(
            "Display title. Optional on creation for instant meetings, "
            "which fall back to a service-generated default; required "
            "in practice for scheduled meetings."
        ),
    )
    description: str | None = Field(
        default=None,
        description="Free-text details. Primarily used for scheduled meetings.",
    )


class MeetingCreate(MeetingBase):
    """Input schema for creating a meeting.

    A single creation schema covers both the instant and scheduled
    flows (Engineering Design Document Sections 6.1 and 6.2), using
    `meeting_type` to select which business rules the service layer
    applies. `host_id` is accepted directly here because the
    "current user" dependency (Engineering Design Document Section
    12, "How would you add authentication without a rewrite?") belongs
    to a milestone not yet implemented; once introduced, routers will
    supply `host_id` from that dependency rather than trusting client
    input, with no change to this schema's shape.
    """

    meeting_type: MeetingType = Field(
        ..., description="Whether this is an INSTANT or SCHEDULED meeting."
    )
    host_id: int = Field(..., gt=0, description="ID of the meeting's host user.")
    scheduled_at: datetime | None = Field(
        default=None,
        description="Planned start time (UTC). Required when SCHEDULED.",
    )
    duration_minutes: int | None = Field(
        default=None,
        ge=5,
        le=480,
        description="Planned duration in minutes (5-480). Required when SCHEDULED.",
    )

    @model_validator(mode="after")
    def validate_scheduled_fields(self) -> "MeetingCreate":
        """Enforce scheduled-meeting field requirements.

        Per Constitution Section 16.1, this is defense-in-depth: the
        service layer independently re-checks these invariants, but
        failing fast at the schema boundary gives the client a precise
        422 instead of a generic downstream error.

        Returns:
            This instance, unchanged, once validation passes.

        Raises:
            ValueError: If a SCHEDULED meeting is missing required
                scheduling fields, or if `scheduled_at` is not in the
                future.
        """
        if self.meeting_type == MeetingType.SCHEDULED:
            if self.title is None:
                raise ValueError("title is required for scheduled meetings")
            if self.scheduled_at is None:
                raise ValueError("scheduled_at is required for scheduled meetings")
            if self.duration_minutes is None:
                raise ValueError("duration_minutes is required for scheduled meetings")
            if self.scheduled_at <= datetime.now(UTC):
                raise ValueError("scheduled_at must be in the future")
        return self


class MeetingUpdate(BaseModel):
    """Input schema for partially updating a meeting.

    Per Constitution Section 7.1, all fields are optional — only
    fields explicitly provided are applied by the service layer.
    Lifecycle transitions (`SCHEDULED -> ACTIVE -> ENDED`) are handled
    via `status`, validated as forward-only by the service layer
    (Engineering Design Document Section 6.5), not by this schema.
    """

    title: str | None = Field(default=None, max_length=200)
    description: str | None = Field(default=None)
    scheduled_at: datetime | None = Field(default=None)
    duration_minutes: int | None = Field(default=None, ge=5, le=480)
    status: MeetingStatus | None = Field(
        default=None, description="Requested lifecycle transition target."
    )


class MeetingResponse(MeetingBase):
    """Output schema for a single meeting.

    `model_config.from_attributes=True` (Constitution Section 7.4)
    allows direct construction from a `Meeting` ORM instance.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    meeting_code: str
    meeting_type: MeetingType
    status: MeetingStatus
    host_id: int
    scheduled_at: datetime | None
    duration_minutes: int | None
    started_at: datetime | None
    ended_at: datetime | None
    created_at: datetime
    updated_at: datetime


class MeetingListResponse(BaseModel):
    """Output schema wrapping a collection of meetings.

    Per Constitution Section 7.1/15.4, list responses are wrapped in
    `{ items, total }` from day one rather than returning a bare array,
    so pagination metadata can be added later without a breaking
    contract change.
    """

    items: list[MeetingResponse]
    total: int
