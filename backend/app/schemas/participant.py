"""Participant API request/response contracts.

Per Constitution Section 7, these Pydantic schemas are the public API
contract and are deliberately decoupled from
``app.models.participant.Participant`` (the ORM shape).  This module
owns validation only; it never touches the database or business rules.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ParticipantStatus


class ParticipantBase(BaseModel):
    """Fields shared across participant request/response schemas.

    Per Constitution Section 7.5, shared fields are factored here and
    inherited by ``Create`` / ``Update`` / ``Response`` to avoid
    duplication.
    """

    display_name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Name displayed in the participant grid at join time.",
    )


class ParticipantCreate(ParticipantBase):
    """Input schema for registering a participant in a meeting.

    ``meeting_id`` is provided by the router from the URL path rather
    than the request body — it is included here so the service layer
    receives a self-contained creation record without requiring any
    HTTP-layer knowledge (Constitution Section 9.2).

    ``is_host`` defaults to ``False``; the service layer sets it to
    ``True`` only when the joining participant is the meeting's host
    (identified by ``host_id`` on the meeting).
    """

    meeting_id: int = Field(
        ...,
        gt=0,
        description="Internal ID of the meeting being joined.",
    )
    is_host: bool = Field(
        default=False,
        description=(
            "Whether this participant is the meeting host. "
            "Typically set by the service layer, not by client input."
        ),
    )


class ParticipantUpdate(BaseModel):
    """Input schema for partially updating a participant record.

    Per Constitution Section 7.1, all fields are optional — only
    fields explicitly provided are applied by the service layer.
    ``participant_status`` is the primary field updated over the
    participant lifecycle (``CONNECTED → DISCONNECTED → LEFT``).
    """

    participant_status: ParticipantStatus | None = Field(
        default=None,
        description="Updated connection status.",
    )
    left_at: datetime | None = Field(
        default=None,
        description="Timestamp when the participant left the meeting.",
    )


class ParticipantResponse(ParticipantBase):
    """Output schema for a single participant.

    ``model_config.from_attributes=True`` (Constitution Section 7.4)
    allows direct construction from a ``Participant`` ORM instance.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    meeting_id: int
    participant_status: ParticipantStatus
    is_host: bool
    joined_at: datetime
    left_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ParticipantListResponse(BaseModel):
    """Output schema wrapping a collection of participants.

    Per Constitution Section 15.4, list responses are wrapped in
    ``{ items, total }`` from day one rather than returning a bare
    array, so pagination metadata can be added later without a
    breaking contract change.
    """

    items: list[ParticipantResponse]
    total: int
