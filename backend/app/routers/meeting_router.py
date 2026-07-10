"""Meeting API routes.

Per Constitution Section 10, this router is thin: it parses request
parameters, calls exactly one service method per route, and maps the
result to the declared ``response_model``.  No business logic, no ORM
queries, and no ``try/except`` blocks live here — the global exception
handlers registered in ``main.py`` translate domain exceptions
(``NotFoundError``, ``ConflictError``, ``ValidationError``) into the
correct HTTP status codes per Constitution Section 11.2.

Route ordering note: FastAPI resolves routes in registration order.
``/upcoming`` and ``/recent`` are registered before ``/{meeting_id}``
so that the literal path segments are not mistakenly captured as a
``meeting_id`` path parameter value.
"""

from fastapi import APIRouter, Depends, Query, status

from app.core.constants import API_V1_PREFIX
from app.dependencies import get_db_session, get_meeting_service
from app.models.enums import MeetingStatus
from app.schemas.meeting import (
    MeetingCreate,
    MeetingListResponse,
    MeetingResponse,
    MeetingStatusResponse,
    MeetingUpdate,
)
from app.services.meeting_service import MeetingService

router = APIRouter(
    prefix="/meetings",
    tags=["Meetings"],
)


# ---------------------------------------------------------------------------
# POST /meetings — Create Meeting
# ---------------------------------------------------------------------------


@router.post(
    "",
    response_model=MeetingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a meeting",
    description=(
        "Create a new **instant** or **scheduled** meeting.\n\n"
        "- **Instant meeting**: set `meeting_type` to `INSTANT`. "
        "The meeting is created immediately in `ACTIVE` status with "
        "`started_at` set to the current UTC time. `title` defaults to "
        "\"Instant Meeting\" if omitted; `scheduled_at` and "
        "`duration_minutes` are ignored.\n"
        "- **Scheduled meeting**: set `meeting_type` to `SCHEDULED`. "
        "`title`, `scheduled_at` (future UTC datetime), and "
        "`duration_minutes` (5–480) are all required. The meeting is "
        "created in `SCHEDULED` status.\n\n"
        "A unique `meeting_code` is generated server-side and returned "
        "in the response for use in invite links."
    ),
    responses={
        status.HTTP_201_CREATED: {
            "description": "Meeting created successfully.",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "meeting_code": "847-2910-556",
                        "title": "Q3 Planning",
                        "description": "Sprint planning for Q3.",
                        "meeting_type": "SCHEDULED",
                        "status": "SCHEDULED",
                        "host_id": 1,
                        "scheduled_at": "2026-08-01T14:00:00Z",
                        "duration_minutes": 60,
                        "started_at": None,
                        "ended_at": None,
                        "created_at": "2026-07-11T00:00:00Z",
                        "updated_at": "2026-07-11T00:00:00Z",
                    }
                }
            },
        },
        status.HTTP_422_UNPROCESSABLE_ENTITY: {
            "description": (
                "Request body failed schema validation (e.g. missing "
                "required fields for a scheduled meeting, or "
                "`scheduled_at` is in the past)."
            )
        },
    },
)
def create_meeting(
    payload: MeetingCreate,
    service: MeetingService = Depends(get_meeting_service),
) -> MeetingResponse:
    """Create an instant or scheduled meeting.

    Args:
        payload: Validated creation request. ``meeting_type`` selects
            the flow (instant vs scheduled).
        service: Injected ``MeetingService`` instance.

    Returns:
        The newly created ``MeetingResponse``.
    """
    meeting = service.create_meeting(payload)
    return MeetingResponse.model_validate(meeting)


# ---------------------------------------------------------------------------
# GET /meetings/upcoming — Upcoming Meetings
# ---------------------------------------------------------------------------
# Must be registered before GET /meetings/{meeting_id} so FastAPI does not
# mistake "upcoming" for a meeting_id value.


@router.get(
    "/upcoming",
    response_model=MeetingListResponse,
    status_code=status.HTTP_200_OK,
    summary="List upcoming meetings",
    description=(
        "Return meetings in `SCHEDULED` status, ordered by `scheduled_at` "
        "ascending (soonest first).  Powers the **Upcoming Meetings** "
        "section of the dashboard.\n\n"
        "Optionally filter by `host_id` and cap results with `limit`."
    ),
    responses={
        status.HTTP_200_OK: {
            "description": "Paginated list of upcoming meetings.",
            "content": {
                "application/json": {
                    "example": {
                        "items": [
                            {
                                "id": 2,
                                "meeting_code": "112-3456-789",
                                "title": "Weekly Sync",
                                "description": None,
                                "meeting_type": "SCHEDULED",
                                "status": "SCHEDULED",
                                "host_id": 1,
                                "scheduled_at": "2026-08-05T09:00:00Z",
                                "duration_minutes": 30,
                                "started_at": None,
                                "ended_at": None,
                                "created_at": "2026-07-11T00:00:00Z",
                                "updated_at": "2026-07-11T00:00:00Z",
                            }
                        ],
                        "total": 1,
                    }
                }
            },
        }
    },
)
def list_upcoming_meetings(
    host_id: int | None = Query(
        default=None,
        gt=0,
        description=(
            "Restrict results to meetings hosted by this user ID. "
            "Omit to return upcoming meetings for all hosts."
        ),
    ),
    limit: int | None = Query(
        default=None,
        gt=0,
        description="Maximum number of meetings to return.",
    ),
    service: MeetingService = Depends(get_meeting_service),
) -> MeetingListResponse:
    """List meetings that have not yet started, soonest first.

    Args:
        host_id: Optional host filter.
        limit: Optional result cap.
        service: Injected ``MeetingService`` instance.

    Returns:
        A ``MeetingListResponse`` with ``items`` and ``total``.
    """
    meetings = service.list_upcoming_meetings(host_id=host_id, limit=limit)
    return MeetingListResponse(
        items=[MeetingResponse.model_validate(m) for m in meetings],
        total=len(meetings),
    )


# ---------------------------------------------------------------------------
# GET /meetings/recent — Recent Meetings
# ---------------------------------------------------------------------------
# Must be registered before GET /meetings/{meeting_id} for the same reason.


@router.get(
    "/recent",
    response_model=MeetingListResponse,
    status_code=status.HTTP_200_OK,
    summary="List recent meetings",
    description=(
        "Return meetings in `ENDED` status, ordered by `ended_at` "
        "descending (most recently ended first).  Powers the **Recent "
        "Meetings** section of the dashboard.\n\n"
        "Optionally filter by `host_id` and cap results with `limit`."
    ),
    responses={
        status.HTTP_200_OK: {
            "description": "Paginated list of recently ended meetings.",
            "content": {
                "application/json": {
                    "example": {
                        "items": [
                            {
                                "id": 1,
                                "meeting_code": "847-2910-556",
                                "title": "Q3 Planning",
                                "description": None,
                                "meeting_type": "INSTANT",
                                "status": "ENDED",
                                "host_id": 1,
                                "scheduled_at": None,
                                "duration_minutes": None,
                                "started_at": "2026-07-10T10:00:00Z",
                                "ended_at": "2026-07-10T10:45:00Z",
                                "created_at": "2026-07-10T10:00:00Z",
                                "updated_at": "2026-07-10T10:45:00Z",
                            }
                        ],
                        "total": 1,
                    }
                }
            },
        }
    },
)
def list_recent_meetings(
    host_id: int | None = Query(
        default=None,
        gt=0,
        description=(
            "Restrict results to meetings hosted by this user ID. "
            "Omit to return recent meetings for all hosts."
        ),
    ),
    limit: int | None = Query(
        default=None,
        gt=0,
        description="Maximum number of meetings to return.",
    ),
    service: MeetingService = Depends(get_meeting_service),
) -> MeetingListResponse:
    """List ended meetings, most recently ended first.

    Args:
        host_id: Optional host filter.
        limit: Optional result cap.
        service: Injected ``MeetingService`` instance.

    Returns:
        A ``MeetingListResponse`` with ``items`` and ``total``.
    """
    meetings = service.list_recent_meetings(host_id=host_id, limit=limit)
    return MeetingListResponse(
        items=[MeetingResponse.model_validate(m) for m in meetings],
        total=len(meetings),
    )


# ---------------------------------------------------------------------------
# POST /meetings/{meeting_code}/start — Start Meeting
# ---------------------------------------------------------------------------
# Registered before /{meeting_id} for explicit ordering clarity.
# `meeting_code` is a string so it cannot clash with the int-typed
# `meeting_id` parameter, but explicit order documents intent.


@router.post(
    "/{meeting_code}/start",
    response_model=MeetingResponse,
    status_code=status.HTTP_200_OK,
    summary="Start a scheduled meeting",
    description=(
        "Transition a meeting from `SCHEDULED` to `ACTIVE` status, "
        "setting `started_at` to the current UTC time.\n\n"
        "**Valid only when:** the meeting is in `SCHEDULED` status.\n\n"
        "**Rejected when:**\n"
        "- Meeting is already `ACTIVE` (duplicate start).\n"
        "- Meeting is `ENDED` (cannot restart an ended meeting).\n\n"
        "Instant meetings (`meeting_type = INSTANT`) are created "
        "directly in `ACTIVE` status and cannot use this endpoint — "
        "only scheduled meetings need an explicit start."
    ),
    responses={
        status.HTTP_200_OK: {
            "description": "Meeting started successfully.",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "meeting_code": "847-2910-556",
                        "title": "Q3 Planning",
                        "description": "Sprint planning for Q3.",
                        "meeting_type": "SCHEDULED",
                        "status": "ACTIVE",
                        "host_id": 1,
                        "scheduled_at": "2026-08-01T14:00:00Z",
                        "duration_minutes": 60,
                        "started_at": "2026-08-01T14:02:00Z",
                        "ended_at": None,
                        "created_at": "2026-07-11T00:00:00Z",
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
                "Transition rejected — meeting is not in `SCHEDULED` "
                "status (already active or ended)."
            ),
            "content": {
                "application/json": {
                    "examples": {
                        "already_active": {
                            "summary": "Already active",
                            "value": {
                                "error": "conflict",
                                "message": (
                                    "Cannot transition meeting 847-2910-556 "
                                    "from ACTIVE to ACTIVE."
                                ),
                            },
                        },
                        "already_ended": {
                            "summary": "Already ended",
                            "value": {
                                "error": "conflict",
                                "message": (
                                    "Cannot transition meeting 847-2910-556 "
                                    "from ENDED to ACTIVE."
                                ),
                            },
                        },
                    }
                }
            },
        },
    },
)
def start_meeting(
    meeting_code: str,
    service: MeetingService = Depends(get_meeting_service),
) -> MeetingResponse:
    """Start a scheduled meeting.

    Args:
        meeting_code: The meeting's unique, public identifier from the
            URL path.
        service: Injected ``MeetingService`` instance.

    Returns:
        The updated ``MeetingResponse`` with ``status=ACTIVE`` and
        ``started_at`` set.

    Raises:
        MeetingNotFoundError: Propagated from the service; translated to
            ``404`` by the global exception handler.
        InvalidMeetingStatusTransitionError: Propagated from the service;
            translated to ``409`` by the global exception handler.
    """
    meeting = service.transition_status(meeting_code, MeetingStatus.ACTIVE)
    return MeetingResponse.model_validate(meeting)


# ---------------------------------------------------------------------------
# POST /meetings/{meeting_code}/end — End Meeting
# ---------------------------------------------------------------------------


@router.post(
    "/{meeting_code}/end",
    response_model=MeetingResponse,
    status_code=status.HTTP_200_OK,
    summary="End an active meeting",
    description=(
        "Transition a meeting from `ACTIVE` to `ENDED` status, "
        "setting `ended_at` to the current UTC time.\n\n"
        "**Valid only when:** the meeting is in `ACTIVE` status.\n\n"
        "**Rejected when:**\n"
        "- Meeting is `SCHEDULED` (must start before ending).\n"
        "- Meeting is already `ENDED` (duplicate end).\n\n"
        "Once ended, a meeting cannot be restarted."
    ),
    responses={
        status.HTTP_200_OK: {
            "description": "Meeting ended successfully.",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "meeting_code": "847-2910-556",
                        "title": "Q3 Planning",
                        "description": "Sprint planning for Q3.",
                        "meeting_type": "SCHEDULED",
                        "status": "ENDED",
                        "host_id": 1,
                        "scheduled_at": "2026-08-01T14:00:00Z",
                        "duration_minutes": 60,
                        "started_at": "2026-08-01T14:02:00Z",
                        "ended_at": "2026-08-01T15:05:00Z",
                        "created_at": "2026-07-11T00:00:00Z",
                        "updated_at": "2026-08-01T15:05:00Z",
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
                "Transition rejected — meeting is not in `ACTIVE` "
                "status (still scheduled or already ended)."
            ),
            "content": {
                "application/json": {
                    "examples": {
                        "not_started": {
                            "summary": "Meeting not yet started",
                            "value": {
                                "error": "conflict",
                                "message": (
                                    "Cannot transition meeting 847-2910-556 "
                                    "from SCHEDULED to ENDED."
                                ),
                            },
                        },
                        "already_ended": {
                            "summary": "Already ended",
                            "value": {
                                "error": "conflict",
                                "message": (
                                    "Cannot transition meeting 847-2910-556 "
                                    "from ENDED to ENDED."
                                ),
                            },
                        },
                    }
                }
            },
        },
    },
)
def end_meeting(
    meeting_code: str,
    service: MeetingService = Depends(get_meeting_service),
) -> MeetingResponse:
    """End an active meeting.

    Args:
        meeting_code: The meeting's unique, public identifier from the
            URL path.
        service: Injected ``MeetingService`` instance.

    Returns:
        The updated ``MeetingResponse`` with ``status=ENDED`` and
        ``ended_at`` set.

    Raises:
        MeetingNotFoundError: Propagated from the service; translated to
            ``404`` by the global exception handler.
        InvalidMeetingStatusTransitionError: Propagated from the service;
            translated to ``409`` by the global exception handler.
    """
    meeting = service.transition_status(meeting_code, MeetingStatus.ENDED)
    return MeetingResponse.model_validate(meeting)


# ---------------------------------------------------------------------------
# GET /meetings/{meeting_code}/status — Get Meeting Status
# ---------------------------------------------------------------------------


@router.get(
    "/{meeting_code}/status",
    response_model=MeetingStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current meeting status",
    description=(
        "Return the current lifecycle status of a meeting and its "
        "associated timestamps.\n\n"
        "Returns a **focused payload** — only `meeting_code`, `status`, "
        "`started_at`, and `ended_at` — rather than the full meeting "
        "representation.  Useful for polling current state without "
        "fetching the entire meeting record.\n\n"
        "**Status values:**\n"
        "- `SCHEDULED` — meeting has not yet started.\n"
        "- `ACTIVE` — meeting is in progress.\n"
        "- `ENDED` — meeting has finished."
    ),
    responses={
        status.HTTP_200_OK: {
            "description": "Meeting status returned successfully.",
            "content": {
                "application/json": {
                    "examples": {
                        "scheduled": {
                            "summary": "Scheduled meeting",
                            "value": {
                                "meeting_code": "847-2910-556",
                                "status": "SCHEDULED",
                                "started_at": None,
                                "ended_at": None,
                            },
                        },
                        "active": {
                            "summary": "Active meeting",
                            "value": {
                                "meeting_code": "847-2910-556",
                                "status": "ACTIVE",
                                "started_at": "2026-08-01T14:02:00Z",
                                "ended_at": None,
                            },
                        },
                        "ended": {
                            "summary": "Ended meeting",
                            "value": {
                                "meeting_code": "847-2910-556",
                                "status": "ENDED",
                                "started_at": "2026-08-01T14:02:00Z",
                                "ended_at": "2026-08-01T15:05:00Z",
                            },
                        },
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
def get_meeting_status(
    meeting_code: str,
    service: MeetingService = Depends(get_meeting_service),
) -> MeetingStatusResponse:
    """Return the current lifecycle status of a meeting.

    Args:
        meeting_code: The meeting's unique, public identifier from the
            URL path.
        service: Injected ``MeetingService`` instance.

    Returns:
        A ``MeetingStatusResponse`` containing ``meeting_code``,
        ``status``, ``started_at``, and ``ended_at``.

    Raises:
        MeetingNotFoundError: Propagated from the service; translated to
            ``404`` by the global exception handler.
    """
    meeting = service.get_meeting_by_code(meeting_code)
    return MeetingStatusResponse.model_validate(meeting)


# ---------------------------------------------------------------------------
# GET /meetings/{meeting_id} — Get Meeting by ID
# ---------------------------------------------------------------------------


@router.get(
    "/{meeting_id}",
    response_model=MeetingResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a meeting by ID",
    description=(
        "Fetch a single meeting by its **internal integer ID** (`id` "
        "column). Returns full meeting details.\n\n"
        "To look up a meeting by its shareable code (e.g. "
        "`847-2910-556`), use `GET /meetings/code/{meeting_code}` instead."
    ),
    responses={
        status.HTTP_200_OK: {
            "description": "Meeting found.",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "meeting_code": "847-2910-556",
                        "title": "Q3 Planning",
                        "description": "Sprint planning for Q3.",
                        "meeting_type": "SCHEDULED",
                        "status": "ACTIVE",
                        "host_id": 1,
                        "scheduled_at": "2026-08-01T14:00:00Z",
                        "duration_minutes": 60,
                        "started_at": "2026-08-01T14:02:00Z",
                        "ended_at": None,
                        "created_at": "2026-07-11T00:00:00Z",
                        "updated_at": "2026-08-01T14:02:00Z",
                    }
                }
            },
        },
        status.HTTP_404_NOT_FOUND: {
            "description": "No meeting exists with this ID.",
            "content": {
                "application/json": {
                    "example": {
                        "error": "not_found",
                        "message": "Meeting with ID 99 was not found.",
                    }
                }
            },
        },
    },
)
def get_meeting(
    meeting_id: int,
    service: MeetingService = Depends(get_meeting_service),
) -> MeetingResponse:
    """Fetch a meeting by its internal primary key.

    Args:
        meeting_id: The meeting's surrogate integer primary key.
        service: Injected ``MeetingService`` instance.

    Returns:
        The matching ``MeetingResponse``.

    Raises:
        MeetingNotFoundError: Propagated from the service; translated to
            ``404`` by the global exception handler in ``main.py``.
    """
    meeting = service.get_meeting_by_id(meeting_id)
    return MeetingResponse.model_validate(meeting)


# ---------------------------------------------------------------------------
# GET /meetings/code/{meeting_code} — Find Meeting by Code
# ---------------------------------------------------------------------------


@router.get(
    "/code/{meeting_code}",
    response_model=MeetingResponse,
    status_code=status.HTTP_200_OK,
    summary="Find a meeting by its shareable code",
    description=(
        "Fetch a single meeting using the **human-readable meeting code** "
        "(e.g. `847-2910-556`).  This is the lookup used when a "
        "participant follows an invite link or enters a code in the "
        "Join Meeting modal (Engineering Design Document Section 1.10)."
    ),
    responses={
        status.HTTP_200_OK: {
            "description": "Meeting found.",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "meeting_code": "847-2910-556",
                        "title": "Q3 Planning",
                        "description": None,
                        "meeting_type": "INSTANT",
                        "status": "ACTIVE",
                        "host_id": 1,
                        "scheduled_at": None,
                        "duration_minutes": None,
                        "started_at": "2026-08-01T14:02:00Z",
                        "ended_at": None,
                        "created_at": "2026-07-11T00:00:00Z",
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
    },
)
def get_meeting_by_code(
    meeting_code: str,
    service: MeetingService = Depends(get_meeting_service),
) -> MeetingResponse:
    """Fetch a meeting by its public, shareable meeting code.

    Args:
        meeting_code: The unique, human-shareable meeting code.
        service: Injected ``MeetingService`` instance.

    Returns:
        The matching ``MeetingResponse``.

    Raises:
        MeetingNotFoundError: Propagated from the service; translated to
            ``404`` by the global exception handler in ``main.py``.
    """
    meeting = service.get_meeting_by_code(meeting_code)
    return MeetingResponse.model_validate(meeting)


# ---------------------------------------------------------------------------
# PATCH /meetings/{meeting_id} — Update Meeting
# ---------------------------------------------------------------------------


@router.patch(
    "/{meeting_id}",
    response_model=MeetingResponse,
    status_code=status.HTTP_200_OK,
    summary="Partially update a meeting",
    description=(
        "Apply a **partial update** to an existing meeting identified by "
        "its integer ID.  Only fields included in the request body are "
        "modified; omitted fields are left unchanged.\n\n"
        "**Lifecycle transitions** are performed by including `status` "
        "in the payload.  The transition graph is forward-only:\n"
        "`SCHEDULED → ACTIVE → ENDED`.\n\n"
        "Setting `status` to `ACTIVE` records `started_at`; setting it "
        "to `ENDED` records `ended_at`.  Invalid transitions (e.g. "
        "`ENDED → SCHEDULED`) are rejected with `409 Conflict`."
    ),
    responses={
        status.HTTP_200_OK: {
            "description": "Meeting updated.",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "meeting_code": "847-2910-556",
                        "title": "Q3 Planning (Updated)",
                        "description": "Revised agenda.",
                        "meeting_type": "SCHEDULED",
                        "status": "ACTIVE",
                        "host_id": 1,
                        "scheduled_at": "2026-08-01T14:00:00Z",
                        "duration_minutes": 90,
                        "started_at": "2026-08-01T14:05:00Z",
                        "ended_at": None,
                        "created_at": "2026-07-11T00:00:00Z",
                        "updated_at": "2026-08-01T14:05:00Z",
                    }
                }
            },
        },
        status.HTTP_404_NOT_FOUND: {
            "description": "No meeting exists with this ID.",
            "content": {
                "application/json": {
                    "example": {
                        "error": "not_found",
                        "message": "Meeting with ID 99 was not found.",
                    }
                }
            },
        },
        status.HTTP_409_CONFLICT: {
            "description": "Requested status transition violates the forward-only lifecycle.",
            "content": {
                "application/json": {
                    "example": {
                        "error": "conflict",
                        "message": "Cannot transition meeting 847-2910-556 from ENDED to SCHEDULED.",
                    }
                }
            },
        },
        status.HTTP_400_BAD_REQUEST: {
            "description": "Business rule violation (e.g. `scheduled_at` in the past).",
            "content": {
                "application/json": {
                    "example": {
                        "error": "validation_error",
                        "message": "scheduled_at must be in the future",
                    }
                }
            },
        },
    },
)
def update_meeting(
    meeting_id: int,
    payload: MeetingUpdate,
    service: MeetingService = Depends(get_meeting_service),
) -> MeetingResponse:
    """Apply a partial update to a meeting.

    Args:
        meeting_id: The meeting's surrogate integer primary key.
        payload: Fields to update; all are optional.
        service: Injected ``MeetingService`` instance.

    Returns:
        The updated ``MeetingResponse``.

    Raises:
        MeetingNotFoundError: Propagated from the service; translated to
            ``404`` by the global exception handler.
        InvalidMeetingStatusTransitionError: Propagated from the service;
            translated to ``409`` by the global exception handler.
        InvalidMeetingScheduleError: Propagated from the service;
            translated to ``400`` by the global exception handler.
    """
    meeting = service.update_meeting_by_id(meeting_id, payload)
    return MeetingResponse.model_validate(meeting)


# ---------------------------------------------------------------------------
# DELETE /meetings/{meeting_id} — Delete Meeting
# ---------------------------------------------------------------------------


@router.delete(
    "/{meeting_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a meeting",
    description=(
        "Permanently delete a meeting by its integer ID.  "
        "All associated participants are cascade-deleted by the database "
        "(Engineering Design Document Section 14.5).\n\n"
        "Returns `204 No Content` on success with no response body."
    ),
    responses={
        status.HTTP_204_NO_CONTENT: {"description": "Meeting deleted successfully."},
        status.HTTP_404_NOT_FOUND: {
            "description": "No meeting exists with this ID.",
            "content": {
                "application/json": {
                    "example": {
                        "error": "not_found",
                        "message": "Meeting with ID 99 was not found.",
                    }
                }
            },
        },
    },
)
def delete_meeting(
    meeting_id: int,
    service: MeetingService = Depends(get_meeting_service),
) -> None:
    """Delete a meeting and all its participants.

    Args:
        meeting_id: The meeting's surrogate integer primary key.
        service: Injected ``MeetingService`` instance.

    Returns:
        ``None`` — FastAPI renders this as ``204 No Content``.

    Raises:
        MeetingNotFoundError: Propagated from the service; translated to
            ``404`` by the global exception handler.
    """
    service.delete_meeting_by_id(meeting_id)
