"""Meeting business logic.

Per Constitution Section 9, this module owns all Meeting business
rules: code generation, scheduling validation, and lifecycle
transitions. It never imports FastAPI-specific objects and raises only
typed domain exceptions (`app.core.exceptions`), never `HTTPException`.
"""

import logging
import secrets
from datetime import UTC, datetime

from app.core.constants import (
    DEFAULT_INSTANT_MEETING_TITLE,
    MEETING_CODE_ALPHABET,
    MEETING_CODE_MAX_GENERATION_ATTEMPTS,
    MEETING_CODE_SEGMENT_LENGTHS,
)
from app.core.exceptions import (
    DuplicateMeetingCodeError,
    InvalidMeetingScheduleError,
    InvalidMeetingStatusTransitionError,
    MeetingNotFoundError,
)
from app.models.enums import MeetingStatus, MeetingType
from app.models.meeting import Meeting
from app.models.participant import Participant
from app.repositories.meeting_repository import MeetingRepository
from app.repositories.participant_repository import ParticipantRepository
from app.repositories.user_repository import UserRepository
from app.schemas.meeting import MeetingCreate, MeetingUpdate

logger = logging.getLogger(__name__)

# Forward-only lifecycle graph (Engineering Design Document Section 6.5).
_ALLOWED_STATUS_TRANSITIONS: dict[MeetingStatus, frozenset[MeetingStatus]] = {
    MeetingStatus.SCHEDULED: frozenset({MeetingStatus.ACTIVE}),
    MeetingStatus.ACTIVE: frozenset({MeetingStatus.ENDED}),
    MeetingStatus.ENDED: frozenset(),
}


def _generate_candidate_code() -> str:
    """Generate one candidate meeting code.

    Uses `secrets.choice()` rather than `random`, per Constitution
    Section 17.3, since meeting codes function as access tokens.

    Returns:
        A digit-only code formatted as hyphenated groups, e.g.
        "847-2910-556" (Engineering Design Document Section 5.3).
    """
    segments = [
        "".join(secrets.choice(MEETING_CODE_ALPHABET) for _ in range(length))
        for length in MEETING_CODE_SEGMENT_LENGTHS
    ]
    return "-".join(segments)


class MeetingService:
    """Business logic for creating, retrieving, and transitioning meetings."""

    def __init__(
        self,
        meeting_repo: MeetingRepository,
        user_repo: UserRepository,
        participant_repo: ParticipantRepository,
    ) -> None:
        """Initialize the service with its repository dependency.

        Args:
            meeting_repo: Data-access layer for the Meeting aggregate.
            user_repo: Data-access layer used to validate meeting ownership.
        """
        self.meeting_repo = meeting_repo
        self.user_repo = user_repo
        self.participant_repo = participant_repo

    def _generate_unique_meeting_code(self) -> str:
        """Generate a meeting code guaranteed unique at creation time.

        Retries on collision up to
        `MEETING_CODE_MAX_GENERATION_ATTEMPTS` times (Constitution
        Section 17.3). Uniqueness is additionally enforced at the
        database level via the `meeting_code` unique constraint
        (Constitution Section 16.1 defense-in-depth).

        Returns:
            A meeting code not currently in use.

        Raises:
            DuplicateMeetingCodeError: If no free code was found within
                the retry budget.
        """
        for _ in range(MEETING_CODE_MAX_GENERATION_ATTEMPTS):
            candidate = _generate_candidate_code()
            if not self.meeting_repo.exists(candidate):
                return candidate
        logger.error(
            "Exhausted %d meeting code generation attempts",
            MEETING_CODE_MAX_GENERATION_ATTEMPTS,
        )
        raise DuplicateMeetingCodeError(
            "Could not generate a unique meeting code; please retry."
        )

    def create_meeting(self, payload: MeetingCreate) -> Meeting:
        """Create an instant or scheduled meeting.

        Args:
            payload: Validated creation input. `meeting_type` selects
                which business rules apply (Engineering Design Document
                Sections 6.1 and 6.2).

        Returns:
            The newly created, persisted `Meeting`.

        Raises:
            InvalidMeetingScheduleError: If `meeting_type` is
                `SCHEDULED` and `scheduled_at` is not strictly in the
                future by the time this runs (re-checked here as
                defense-in-depth per Constitution Section 16.1, even
                though the schema already validated it).
        """
        host = self.user_repo.get_by_id(payload.host_id)
        if host is None:
            raise MeetingNotFoundError(f"Host user with ID {payload.host_id} was not found.")

        meeting_code = self._generate_unique_meeting_code()

        if payload.meeting_type == MeetingType.INSTANT:
            meeting = Meeting(
                meeting_code=meeting_code,
                title=payload.title or DEFAULT_INSTANT_MEETING_TITLE,
                description=payload.description,
                meeting_type=MeetingType.INSTANT,
                status=MeetingStatus.ACTIVE,
                host_id=payload.host_id,
                started_at=datetime.now(UTC),
            )
        else:
            if (
                payload.scheduled_at is not None
                and payload.scheduled_at <= datetime.now(UTC)
            ):
                raise InvalidMeetingScheduleError("scheduled_at must be in the future")
            # payload.title is guaranteed non-None here: MeetingCreate's
            # validate_scheduled_fields requires it for SCHEDULED meetings.
            meeting = Meeting(
                meeting_code=meeting_code,
                title=payload.title,
                description=payload.description,
                meeting_type=MeetingType.SCHEDULED,
                status=MeetingStatus.SCHEDULED,
                host_id=payload.host_id,
                scheduled_at=payload.scheduled_at,
                duration_minutes=payload.duration_minutes,
            )

        created = self.meeting_repo.create(meeting)
        self.participant_repo.create(
            Participant(
                meeting_id=created.id,
                display_name=host.name,
                is_host=True,
            )
        )
        self.meeting_repo.db.commit()
        logger.info(
            "Meeting created: code=%s type=%s host_id=%s",
            created.meeting_code,
            created.meeting_type,
            created.host_id,
        )
        return created

    def get_meeting_by_id(self, meeting_id: int) -> Meeting:
        """Fetch a meeting by its internal primary key, or raise if absent.

        Args:
            meeting_id: The meeting's surrogate integer primary key.

        Returns:
            The matching `Meeting`.

        Raises:
            MeetingNotFoundError: If no meeting has this ID.
        """
        meeting = self.meeting_repo.get_by_id(meeting_id)
        if meeting is None:
            raise MeetingNotFoundError(
                f"Meeting with ID {meeting_id} was not found."
            )
        return meeting

    def get_meeting_by_code(self, meeting_code: str) -> Meeting:
        """Fetch a meeting by its public code, or raise if absent.

        Args:
            meeting_code: The unique, human-shareable meeting identifier.

        Returns:
            The matching `Meeting`.

        Raises:
            MeetingNotFoundError: If no meeting has this code.
        """
        meeting = self.meeting_repo.get_by_code(meeting_code)
        if meeting is None:
            raise MeetingNotFoundError(
                f"Meeting with code {meeting_code} was not found."
            )
        return meeting

    def list_upcoming_meetings(
        self, host_id: int | None = None, limit: int | None = None
    ) -> list[Meeting]:
        """List meetings not yet started, soonest first.

        Args:
            host_id: If provided, restrict results to this host.
            limit: If provided, cap the number of results.

        Returns:
            Upcoming meetings ordered by `scheduled_at` ascending.
        """
        return list(self.meeting_repo.list_upcoming(host_id=host_id, limit=limit))

    def list_recent_meetings(
        self, host_id: int | None = None, limit: int | None = None
    ) -> list[Meeting]:
        """List ended meetings, most recently ended first.

        Args:
            host_id: If provided, restrict results to this host.
            limit: If provided, cap the number of results.

        Returns:
            Recent meetings ordered by `ended_at` descending.
        """
        return list(self.meeting_repo.list_recent(host_id=host_id, limit=limit))

    def update_meeting(self, meeting_code: str, payload: MeetingUpdate) -> Meeting:
        """Apply a partial update to a meeting located by its public code.

        Status changes submitted via `payload.status` are delegated to
        `_apply_status_transition()` so the forward-only lifecycle rule
        is enforced in exactly one place.

        Args:
            meeting_code: The unique, human-shareable meeting identifier.
            payload: Fields to update; unset fields are left unchanged.

        Returns:
            The updated `Meeting`.

        Raises:
            MeetingNotFoundError: If no meeting has this code.
            InvalidMeetingScheduleError: If the resulting `scheduled_at`
                is not strictly in the future.
            InvalidMeetingStatusTransitionError: If `payload.status`
                requests an invalid lifecycle transition.
        """
        meeting = self.get_meeting_by_code(meeting_code)
        return self._apply_update(meeting, payload)

    def update_meeting_by_id(self, meeting_id: int, payload: MeetingUpdate) -> Meeting:
        """Apply a partial update to a meeting located by its integer ID.

        Delegates to ``_apply_update()`` to keep field-mutation and
        lifecycle-transition logic in one place (DRY, Constitution
        Section 4.10).

        Args:
            meeting_id: The meeting's surrogate integer primary key.
            payload: Fields to update; unset fields are left unchanged.

        Returns:
            The updated `Meeting`.

        Raises:
            MeetingNotFoundError: If no meeting has this ID.
            InvalidMeetingScheduleError: If the resulting `scheduled_at`
                is not strictly in the future.
            InvalidMeetingStatusTransitionError: If `payload.status`
                requests an invalid lifecycle transition.
        """
        meeting = self.get_meeting_by_id(meeting_id)
        return self._apply_update(meeting, payload)

    def _apply_update(self, meeting: Meeting, payload: MeetingUpdate) -> Meeting:
        """Mutate and persist fields from a validated update payload.

        Extracted to avoid duplicating field-assignment logic between
        ``update_meeting`` (code-based) and ``update_meeting_by_id``
        (ID-based).

        Args:
            meeting: The already-fetched, session-attached `Meeting`
                instance to mutate.
            payload: Fields to apply; ``None`` values are skipped.

        Returns:
            The updated `Meeting`, committed.

        Raises:
            InvalidMeetingScheduleError: If `payload.scheduled_at` is
                not strictly in the future.
            InvalidMeetingStatusTransitionError: If `payload.status`
                requests an invalid lifecycle transition.
        """
        if payload.title is not None:
            meeting.title = payload.title
        if payload.description is not None:
            meeting.description = payload.description
        if payload.scheduled_at is not None:
            if payload.scheduled_at <= datetime.now(UTC):
                raise InvalidMeetingScheduleError("scheduled_at must be in the future")
            meeting.scheduled_at = payload.scheduled_at
        if payload.duration_minutes is not None:
            meeting.duration_minutes = payload.duration_minutes

        updated = self.meeting_repo.update(meeting)

        if payload.status is not None:
            updated = self._apply_status_transition(updated, payload.status)

        self.meeting_repo.db.commit()
        return updated

    def delete_meeting_by_id(self, meeting_id: int) -> None:
        """Delete a meeting and its cascaded participants by integer ID.

        Args:
            meeting_id: The meeting's surrogate integer primary key.

        Returns:
            None.

        Raises:
            MeetingNotFoundError: If no meeting has this ID.
        """
        meeting = self.get_meeting_by_id(meeting_id)
        self.meeting_repo.delete(meeting)
        self.meeting_repo.db.commit()
        logger.info("Meeting deleted: id=%s code=%s", meeting_id, meeting.meeting_code)

    def transition_status(
        self, meeting_code: str, new_status: MeetingStatus
    ) -> Meeting:
        """Move a meeting to a new lifecycle status.

        Args:
            meeting_code: The unique, human-shareable meeting identifier.
            new_status: The requested target status.

        Returns:
            The updated `Meeting`.

        Raises:
            MeetingNotFoundError: If no meeting has this code.
            InvalidMeetingStatusTransitionError: If the transition is
                not forward-only (`SCHEDULED -> ACTIVE -> ENDED`).
        """
        meeting = self.get_meeting_by_code(meeting_code)
        updated = self._apply_status_transition(meeting, new_status)
        self.meeting_repo.db.commit()
        return updated

    def _apply_status_transition(
        self, meeting: Meeting, new_status: MeetingStatus
    ) -> Meeting:
        """Validate and apply a status transition, without committing.

        Args:
            meeting: The meeting being transitioned.
            new_status: The requested target status.

        Returns:
            The mutated `Meeting`, flushed but not committed.

        Raises:
            InvalidMeetingStatusTransitionError: If `new_status` is not
                reachable from the meeting's current status.
        """
        allowed = _ALLOWED_STATUS_TRANSITIONS.get(meeting.status, frozenset())
        if new_status not in allowed:
            raise InvalidMeetingStatusTransitionError(
                f"Cannot transition meeting {meeting.meeting_code} "
                f"from {meeting.status} to {new_status}."
            )

        now = datetime.now(UTC)
        if new_status == MeetingStatus.ACTIVE:
            meeting.started_at = now
        elif new_status == MeetingStatus.ENDED:
            meeting.ended_at = now

        meeting.status = new_status
        result = self.meeting_repo.update(meeting)
        logger.info(
            "Meeting status transitioned: code=%s status=%s",
            result.meeting_code,
            result.status,
        )
        return result
