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
from app.schemas.meeting import (
    MeetingCreate,
    MeetingListResponse,
    MeetingResponse,
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
