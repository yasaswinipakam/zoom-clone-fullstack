"""Participant API routes.

Per Constitution Section 10, this router is thin: it parses request
parameters, calls exactly one service method per route, and maps the
result to the declared ``response_model``.  No business logic, no ORM
queries, and no ``try/except`` blocks live here — the global exception
handlers registered in ``main.py`` translate domain exceptions to the
correct HTTP status codes per Constitution Section 11.2.

All routes are scoped under ``/meetings/{meeting_code}/participants``
(Engineering Design Document Section 6.6), using ``meeting_code`` as
the public, shareable meeting identifier.  This mirrors the Meeting
router's use of ``meeting_code`` as the primary external key and avoids
exposing the internal integer PK in participant-facing URLs.

Route ordering note: ``/{meeting_code}/participants/{participant_id}/leave``
is registered before ``/{meeting_code}/participants/{participant_id}``
so FastAPI does not swallow the literal "leave" segment as a
``participant_id`` integer value.  (In practice FastAPI would reject
"leave" as a non-integer, but explicit ordering is clearer.)
"""

from fastapi import APIRouter, Depends, Query, status

from app.dependencies import get_participant_service
from app.models.enums import ParticipantStatus
from app.schemas.participant import (
    ParticipantBase,
    ParticipantListResponse,
    ParticipantResponse,
)
from app.services.participant_service import ParticipantService

router = APIRouter(
    prefix="/meetings",
    tags=["Participants"],
)


# ---------------------------------------------------------------------------
# POST /meetings/{meeting_code}/participants — Join Meeting
# ---------------------------------------------------------------------------


@router.post(
    "/{meeting_code}/participants",
    response_model=ParticipantResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Join a meeting",
    description=(
        "Register a new participant in the meeting identified by "
        "``meeting_code``.\n\n"
        "**Business rules enforced by the service layer:**\n"
        "- The meeting must exist.\n"
        "- The meeting must not be in `ENDED` status — a closed meeting "
        "  cannot accept new participants.\n"
        "- No active participant (not yet `LEFT`) with the same "
        "  `display_name` may already exist in this meeting — prevents "
        "  duplicate joins under the same name.\n\n"
        "The joining participant is recorded as `CONNECTED` immediately. "
        "Guests (without user accounts) are fully supported — the "
        "`participants` table is intentionally decoupled from `users` "
        "(Engineering Design Document Section 5.4)."
    ),
    responses={
        status.HTTP_201_CREATED: {
            "description": "Participant joined successfully.",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "meeting_id": 42,
                        "display_name": "Alice",
                        "participant_status": "CONNECTED",
                        "is_host": False,
                        "joined_at": "2026-08-01T14:02:00Z",
                        "left_at": None,
                        "created_at": "2026-08-01T14:02:00Z",
                        "updated_at": "2026-08-01T14:02:00Z",
                    }
                }
            },
        },
        status.HTTP_404_NOT_FOUND: {
            "description": "No meeting exists with this code.",
            "content": {
                "application/json": {
                    "example": {
                        "error": "not_found",
                        "message": "Meeting with code 847-2910-556 was not found.",
                    }
                }
            },
        },
        status.HTTP_409_CONFLICT: {
            "description": (
                "The meeting has already ended (`MeetingNotJoinableError`), "
                "or a participant with this display name is already active "
                "in the meeting (`DuplicateParticipantError`)."
            ),
            "content": {
                "application/json": {
                    "examples": {
                        "ended": {
                            "summary": "Meeting already ended",
                            "value": {
                                "error": "conflict",
                                "message": "Meeting 847-2910-556 has already ended.",
                            },
                        },
                        "duplicate": {
                            "summary": "Duplicate participant name",
                            "value": {
                                "error": "conflict",
                                "message": (
                                    '"Alice" is already active in meeting 847-2910-556.'
                                ),
                            },
                        },
                    }
                }
            },
        },
        status.HTTP_422_UNPROCESSABLE_ENTITY: {
            "description": (
                "Request body failed schema validation "
                "(e.g. `display_name` is empty or exceeds 100 characters)."
            )
        },
    },
)
def join_meeting(
    meeting_code: str,
    payload: ParticipantBase,
    service: ParticipantService = Depends(get_participant_service),
) -> ParticipantResponse:
    """Register a new participant in a meeting.

    Args:
        meeting_code: The meeting's unique, public identifier from the
            URL path.
        payload: Request body containing ``display_name`` (1–100 chars).
        service: Injected ``ParticipantService`` instance.

    Returns:
        The newly created ``ParticipantResponse``.

    Raises:
        MeetingNotFoundError: → 404.
        MeetingNotJoinableError: → 409.
        DuplicateParticipantError: → 409.
    """
    participant = service.join_meeting(
        meeting_code=meeting_code,
        display_name=payload.display_name,
    )
    return ParticipantResponse.model_validate(participant)


# ---------------------------------------------------------------------------
# GET /meetings/{meeting_code}/participants — List Participants
# ---------------------------------------------------------------------------


@router.get(
    "/{meeting_code}/participants",
    response_model=ParticipantListResponse,
    status_code=status.HTTP_200_OK,
    summary="List participants in a meeting",
    description=(
        "Return all participants associated with the given meeting, "
        "ordered by `joined_at` ascending (join order).\n\n"
        "Optionally filter by `status` to retrieve only participants "
        "in a specific connection state:\n"
        "- `CONNECTED` — currently in the call.\n"
        "- `DISCONNECTED` — temporarily disconnected.\n"
        "- `LEFT` — have left the meeting.\n\n"
        "Omit `status` to return all participants regardless of "
        "their current connection state."
    ),
    responses={
        status.HTTP_200_OK: {
            "description": "Participant list returned successfully.",
            "content": {
                "application/json": {
                    "example": {
                        "items": [
                            {
                                "id": 1,
                                "meeting_id": 42,
                                "display_name": "Alice",
                                "participant_status": "CONNECTED",
                                "is_host": True,
                                "joined_at": "2026-08-01T14:00:00Z",
                                "left_at": None,
                                "created_at": "2026-08-01T14:00:00Z",
                                "updated_at": "2026-08-01T14:00:00Z",
                            },
                            {
                                "id": 2,
                                "meeting_id": 42,
                                "display_name": "Bob",
                                "participant_status": "CONNECTED",
                                "is_host": False,
                                "joined_at": "2026-08-01T14:01:30Z",
                                "left_at": None,
                                "created_at": "2026-08-01T14:01:30Z",
                                "updated_at": "2026-08-01T14:01:30Z",
                            },
                        ],
                        "total": 2,
                    }
                }
            },
        },
        status.HTTP_404_NOT_FOUND: {
            "description": "No meeting exists with this code.",
            "content": {
                "application/json": {
                    "example": {
                        "error": "not_found",
                        "message": "Meeting with code 847-2910-556 was not found.",
                    }
                }
            },
        },
    },
)
def list_participants(
    meeting_code: str,
    status_filter: str | None = Query(
        default=None,
        alias="status",
        description=(
            "Filter by connection status: `CONNECTED`, `DISCONNECTED`, "
            "or `LEFT`.  Omit to return all participants."
        ),
    ),
    service: ParticipantService = Depends(get_participant_service),
) -> ParticipantListResponse:
    """Return all participants for a meeting.

    Args:
        meeting_code: The meeting's unique, public identifier from the
            URL path.
        status_filter: Optional connection-status filter from the query
            string (exposed as ``?status=``).
        service: Injected ``ParticipantService`` instance.

    Returns:
        A ``ParticipantListResponse`` with ``items`` and ``total``.

    Raises:
        MeetingNotFoundError: → 404.
    """
    parsed_status: ParticipantStatus | None = None
    if status_filter is not None:
        parsed_status = ParticipantStatus(status_filter.upper())

    participants = service.list_by_meeting_code(
        meeting_code=meeting_code,
        status=parsed_status,
    )
    return ParticipantListResponse(
        items=[ParticipantResponse.model_validate(p) for p in participants],
        total=len(participants),
    )


# ---------------------------------------------------------------------------
# POST /meetings/{meeting_code}/participants/{participant_id}/leave
# ---------------------------------------------------------------------------
# Registered before DELETE /{participant_id} so FastAPI resolves the literal
# "leave" suffix before any integer-capture route could shadow it.


@router.post(
    "/{meeting_code}/participants/{participant_id}/leave",
    response_model=ParticipantResponse,
    status_code=status.HTTP_200_OK,
    summary="Leave a meeting",
    description=(
        "Record a participant's voluntary departure from the meeting.\n\n"
        "This performs a **soft-remove**: the participant row is not deleted; "
        "instead, `participant_status` transitions to `LEFT` and `left_at` "
        "is set to the current UTC time.  The join/leave history is "
        "preserved for the meeting record.\n\n"
        "Returns the updated participant record so the client can confirm "
        "the status transition."
    ),
    responses={
        status.HTTP_200_OK: {
            "description": "Participant successfully left the meeting.",
            "content": {
                "application/json": {
                    "example": {
                        "id": 2,
                        "meeting_id": 42,
                        "display_name": "Bob",
                        "participant_status": "LEFT",
                        "is_host": False,
                        "joined_at": "2026-08-01T14:01:30Z",
                        "left_at": "2026-08-01T14:45:00Z",
                        "created_at": "2026-08-01T14:01:30Z",
                        "updated_at": "2026-08-01T14:45:00Z",
                    }
                }
            },
        },
        status.HTTP_404_NOT_FOUND: {
            "description": "No participant exists with this ID.",
            "content": {
                "application/json": {
                    "example": {
                        "error": "not_found",
                        "message": "Participant with ID 99 was not found.",
                    }
                }
            },
        },
    },
)
def leave_meeting(
    meeting_code: str,
    participant_id: int,
    service: ParticipantService = Depends(get_participant_service),
) -> ParticipantResponse:
    """Soft-remove a participant by recording their departure.

    ``meeting_code`` is present in the path for URL consistency but is
    not used by the service call — the participant's ``meeting_id`` FK
    already ties them to the correct meeting, and the service validates
    existence by ``participant_id`` alone.

    Args:
        meeting_code: The meeting's unique, public identifier.
            Present for URL consistency; not forwarded to the service.
        participant_id: The participant's internal integer primary key.
        service: Injected ``ParticipantService`` instance.

    Returns:
        The updated ``ParticipantResponse`` with ``participant_status``
        set to ``LEFT`` and ``left_at`` populated.

    Raises:
        ParticipantNotFoundError: → 404.
    """
    participant = service.leave_meeting_participant(participant_id)
    return ParticipantResponse.model_validate(participant)


# ---------------------------------------------------------------------------
# DELETE /meetings/{meeting_code}/participants/{participant_id}
# ---------------------------------------------------------------------------


@router.delete(
    "/{meeting_code}/participants/{participant_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a participant",
    description=(
        "Permanently remove a participant record from a meeting by its "
        "integer ID.\n\n"
        "Unlike the `/leave` endpoint (which soft-removes by setting "
        "`participant_status = LEFT`), this endpoint **hard-deletes** "
        "the participant row.  Use this for administrative removal "
        "(e.g. a host forcibly ejecting a participant).\n\n"
        "Returns `204 No Content` on success with no response body."
    ),
    responses={
        status.HTTP_204_NO_CONTENT: {
            "description": "Participant removed successfully."
        },
        status.HTTP_404_NOT_FOUND: {
            "description": "No participant exists with this ID.",
            "content": {
                "application/json": {
                    "example": {
                        "error": "not_found",
                        "message": "Participant with ID 99 was not found.",
                    }
                }
            },
        },
    },
)
def remove_participant(
    meeting_code: str,
    participant_id: int,
    service: ParticipantService = Depends(get_participant_service),
) -> None:
    """Hard-delete a participant record.

    ``meeting_code`` is present in the path for URL consistency but is
    not forwarded to the service — the participant's ``meeting_id`` FK
    already associates them with the correct meeting.

    Args:
        meeting_code: The meeting's unique, public identifier.
            Present for URL consistency; not forwarded to the service.
        participant_id: The participant's internal integer primary key.
        service: Injected ``ParticipantService`` instance.

    Returns:
        ``None`` — FastAPI renders this as ``204 No Content``.

    Raises:
        ParticipantNotFoundError: → 404.
    """
    service.hard_delete_participant(participant_id)

