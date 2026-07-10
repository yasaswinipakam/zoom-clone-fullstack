"""Participant business logic.

Per Constitution Section 9, this module owns all Participant business
rules: join eligibility, duplicate prevention, and lifecycle
transitions.  It never imports FastAPI-specific objects and raises only
typed domain exceptions (``app.core.exceptions``), never
``HTTPException``.
"""

import logging
from datetime import UTC, datetime

from app.core.exceptions import (
    DuplicateParticipantError,
    MeetingNotFoundError,
    MeetingNotJoinableError,
    ParticipantNotFoundError,
)
from app.models.enums import MeetingStatus, ParticipantStatus
from app.models.participant import Participant
from app.repositories.meeting_repository import MeetingRepository
from app.repositories.participant_repository import ParticipantRepository
from app.schemas.participant import ParticipantCreate, ParticipantUpdate

logger = logging.getLogger(__name__)


class ParticipantService:
    """Business logic for adding, removing, and managing participants."""

    def __init__(
        self,
        participant_repo: ParticipantRepository,
        meeting_repo: MeetingRepository,
    ) -> None:
        """Initialize the service with its repository dependencies.

        Two repositories are injected because this service coordinates
        across the Participant and Meeting aggregates (Constitution
        Section 9.2 — cross-entity orchestration belongs in the service
        layer, not in either repository).

        Args:
            participant_repo: Data-access layer for the Participant aggregate.
            meeting_repo: Data-access layer for the Meeting aggregate,
                used to validate meeting existence and joinability.
        """
        self.participant_repo = participant_repo
        self.meeting_repo = meeting_repo

    def add_participant(self, payload: ParticipantCreate) -> Participant:
        """Register a new participant in a meeting.

        Business rules enforced here (Constitution Section 9.1):
        1. The meeting must exist.
        2. The meeting must not be ``ENDED``.
        3. No active participant with the same ``display_name`` may
           already exist in this meeting (prevents duplicate joins).

        Args:
            payload: Validated creation input containing ``meeting_id``,
                ``display_name``, and optional ``is_host`` flag.

        Returns:
            The newly created, persisted ``Participant``.

        Raises:
            MeetingNotFoundError: If no meeting has this ID.
            MeetingNotJoinableError: If the meeting has already ended.
            DuplicateParticipantError: If a participant with this
                display name is already active in the meeting.
        """
        meeting = self.meeting_repo.get_by_id(payload.meeting_id)
        if meeting is None:
            raise MeetingNotFoundError(
                f"Meeting with ID {payload.meeting_id} was not found."
            )

        if meeting.status == MeetingStatus.ENDED:
            raise MeetingNotJoinableError(
                f"Meeting {meeting.meeting_code} has already ended and "
                "cannot accept new participants."
            )

        if self.participant_repo.exists(payload.meeting_id, payload.display_name):
            raise DuplicateParticipantError(
                f'A participant named "{payload.display_name}" is already '
                f"active in meeting {meeting.meeting_code}."
            )

        participant = Participant(
            meeting_id=payload.meeting_id,
            display_name=payload.display_name,
            is_host=payload.is_host,
            participant_status=ParticipantStatus.CONNECTED,
        )
        created = self.participant_repo.create(participant)
        self.participant_repo.db.commit()
        logger.info(
            "Participant joined: name=%r meeting_code=%s is_host=%s",
            created.display_name,
            meeting.meeting_code,
            created.is_host,
        )
        return created

    def get_participant_by_id(self, participant_id: int) -> Participant:
        """Fetch a participant by its internal primary key, or raise.

        Args:
            participant_id: The participant's surrogate integer primary key.

        Returns:
            The matching ``Participant``.

        Raises:
            ParticipantNotFoundError: If no participant has this ID.
        """
        participant = self.participant_repo.get_by_id(participant_id)
        if participant is None:
            raise ParticipantNotFoundError(
                f"Participant with ID {participant_id} was not found."
            )
        return participant

    def list_participants(
        self,
        meeting_id: int,
        status: ParticipantStatus | None = None,
    ) -> list[Participant]:
        """Return participants for a meeting, optionally filtered by status.

        Validates meeting existence so callers receive a clear
        ``MeetingNotFoundError`` rather than an empty list for an
        unknown meeting ID.

        Args:
            meeting_id: The meeting whose participants to list.
            status: If provided, restrict results to this connection state.

        Returns:
            Participants ordered by ``joined_at`` ascending.

        Raises:
            MeetingNotFoundError: If no meeting has this ID.
        """
        meeting = self.meeting_repo.get_by_id(meeting_id)
        if meeting is None:
            raise MeetingNotFoundError(
                f"Meeting with ID {meeting_id} was not found."
            )
        return list(self.participant_repo.list_by_meeting(meeting_id, status=status))

    def update_participant(
        self, participant_id: int, payload: ParticipantUpdate
    ) -> Participant:
        """Apply a partial update to a participant record.

        Per Constitution Section 7.1, only explicitly provided fields
        are applied; ``None`` values mean "leave unchanged."

        Args:
            participant_id: The participant's surrogate integer primary key.
            payload: Fields to update.

        Returns:
            The updated ``Participant``.

        Raises:
            ParticipantNotFoundError: If no participant has this ID.
        """
        participant = self.get_participant_by_id(participant_id)

        if payload.participant_status is not None:
            participant.participant_status = payload.participant_status
        if payload.left_at is not None:
            participant.left_at = payload.left_at

        updated = self.participant_repo.update(participant)
        self.participant_repo.db.commit()
        logger.info(
            "Participant updated: id=%s status=%s",
            updated.id,
            updated.participant_status,
        )
        return updated

    def remove_participant(self, participant_id: int) -> None:
        """Mark a participant as ``LEFT`` and record their departure time.

        Soft-removes the participant by transitioning their status to
        ``LEFT`` and setting ``left_at`` to the current UTC time, rather
        than deleting the row — preserving the join/leave history for
        the meeting record.

        Args:
            participant_id: The participant's surrogate integer primary key.

        Raises:
            ParticipantNotFoundError: If no participant has this ID.
        """
        participant = self.get_participant_by_id(participant_id)
        participant.participant_status = ParticipantStatus.LEFT
        participant.left_at = datetime.now(UTC)
        self.participant_repo.update(participant)
        self.participant_repo.db.commit()
        logger.info(
            "Participant left: id=%s name=%r",
            participant.id,
            participant.display_name,
        )

    # -----------------------------------------------------------------------
    # Code-based entry points (Task 5 — Participant API layer)
    # -----------------------------------------------------------------------
    # The Participant API routes all use ``meeting_code`` in the URL (EDD
    # §6.6).  The existing methods above use ``meeting_id`` (int) because
    # the service layer works against primary keys internally.  These two
    # thin wrappers resolve the code once, then delegate to the id-based
    # methods — keeping all business logic in one place (DRY) and keeping
    # the router free of any resolution logic (Constitution §10.2).

    def join_meeting(
        self, meeting_code: str, display_name: str, is_host: bool = False
    ) -> Participant:
        """Join a meeting identified by its public code.

        Resolves the meeting code to an internal ID, then delegates to
        ``add_participant`` for the full suite of business-rule checks.

        Args:
            meeting_code: The unique, human-shareable meeting code from
                the URL path.
            display_name: The name the participant will appear as in the
                grid (1–100 characters).
            is_host: Whether this participant is the meeting host.
                Defaults to ``False`` for guest joins.

        Returns:
            The newly created ``Participant``.

        Raises:
            MeetingNotFoundError: If no meeting has this code.
            MeetingNotJoinableError: If the meeting has already ended.
            DuplicateParticipantError: If a participant with this display
                name is already active in the meeting.
        """
        meeting = self.meeting_repo.get_by_code(meeting_code)
        if meeting is None:
            raise MeetingNotFoundError(
                f"Meeting with code {meeting_code} was not found."
            )
        payload = ParticipantCreate(
            meeting_id=meeting.id,
            display_name=display_name,
            is_host=is_host,
        )
        return self.add_participant(payload)

    def list_by_meeting_code(
        self,
        meeting_code: str,
        status: ParticipantStatus | None = None,
    ) -> list[Participant]:
        """List participants for a meeting identified by its public code.

        Resolves the meeting code to an internal ID, then delegates to
        ``list_participants``.

        Args:
            meeting_code: The unique, human-shareable meeting code from
                the URL path.
            status: If provided, restrict results to this connection state.

        Returns:
            Participants ordered by ``joined_at`` ascending.

        Raises:
            MeetingNotFoundError: If no meeting has this code.
        """
        meeting = self.meeting_repo.get_by_code(meeting_code)
        if meeting is None:
            raise MeetingNotFoundError(
                f"Meeting with code {meeting_code} was not found."
            )
        return self.list_participants(meeting.id, status=status)

    def leave_meeting_participant(self, participant_id: int) -> Participant:
        """Soft-remove a participant and return the updated record.

        Identical to ``remove_participant`` but returns the mutated
        ``Participant`` so the `/leave` route can produce a
        ``ParticipantResponse`` body (the caller expects ``200 OK``
        with the updated state, not ``204 No Content``).

        Args:
            participant_id: The participant's surrogate integer primary key.

        Returns:
            The updated ``Participant`` with ``participant_status=LEFT``
            and ``left_at`` set.

        Raises:
            ParticipantNotFoundError: If no participant has this ID.
        """
        self.remove_participant(participant_id)
        return self.get_participant_by_id(participant_id)

    def hard_delete_participant(self, participant_id: int) -> None:
        """Permanently delete a participant row.

        Hard-deletes the row (no soft-remove), preserving no history.
        Used for administrative removal by a host.  Contrast with
        ``remove_participant``, which soft-deletes by setting
        ``participant_status = LEFT`` and recording ``left_at``.

        Transaction note: commit is issued through ``meeting_repo.db``
        rather than ``participant_repo.db``.  Both are bound to the
        same request-scoped ``Session`` (see ``get_participant_service``
        in ``app.dependencies``), so the effect is identical.  Using
        the meeting-repo session here follows the same pattern as
        ``MeetingService.delete_meeting_by_id``, which also commits
        through its single injected repository — keeping session access
        off the participant-repo interface in this service method.

        Args:
            participant_id: The participant's surrogate integer primary key.

        Raises:
            ParticipantNotFoundError: If no participant has this ID.
        """
        participant = self.get_participant_by_id(participant_id)
        self.participant_repo.delete(participant)
        logger.info("Participant hard-deleted: id=%s", participant_id)
        self.meeting_repo.db.commit()
