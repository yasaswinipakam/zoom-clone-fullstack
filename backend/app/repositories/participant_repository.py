"""Participant data-access layer.

Per Constitution Section 8, this is the only module allowed to write
SQLAlchemy queries for the Participant aggregate.  No business rules,
no HTTP concerns, no cross-entity orchestration, and no ``commit()``
calls (the service layer owns transaction boundaries,
Constitution Section 6.5/9.2).
"""

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import ParticipantStatus
from app.models.participant import Participant


class ParticipantRepository:
    """Data-access methods for the ``Participant`` aggregate."""

    def __init__(self, db: Session) -> None:
        """Bind this repository to a request-scoped session.

        Args:
            db: Active database session, injected from the router
                boundary downward (Constitution Section 6.4).
        """
        self.db = db

    def create(self, participant: Participant) -> Participant:
        """Stage a new participant for insertion.

        Args:
            participant: A transient ``Participant`` instance to persist.

        Returns:
            The same instance, flushed so its generated ``id`` is
            available to the caller.  Not committed — the service layer
            commits (Constitution Section 8.3).
        """
        self.db.add(participant)
        self.db.flush()
        return participant

    def get_by_id(self, participant_id: int) -> Participant | None:
        """Fetch a single participant by its internal primary key.

        Args:
            participant_id: The participant's surrogate primary key.

        Returns:
            The matching ``Participant``, or ``None`` if not found.
        """
        stmt = select(Participant).where(Participant.id == participant_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def list_by_meeting(
        self,
        meeting_id: int,
        status: ParticipantStatus | None = None,
    ) -> Sequence[Participant]:
        """List participants belonging to a meeting.

        Uses the ``ix_participants_meeting_id`` index for O(log n)
        meeting-scoped lookups.

        Args:
            meeting_id: The meeting whose participants to retrieve.
            status: If provided, restrict results to participants with
                this connection status (e.g. only ``CONNECTED`` ones
                for the live participant grid).

        Returns:
            Matching participants ordered by ``joined_at`` ascending
            (join order is the natural display order in the grid).
        """
        stmt = (
            select(Participant)
            .where(Participant.meeting_id == meeting_id)
            .order_by(Participant.joined_at.asc())
        )
        if status is not None:
            stmt = stmt.where(Participant.participant_status == status)
        return self.db.execute(stmt).scalars().all()

    def exists(self, meeting_id: int, display_name: str) -> bool:
        """Check whether a participant with this name is already in the meeting.

        Used by the service layer to prevent duplicate joins under the
        same display name (business rule enforced there, not here).

        Args:
            meeting_id: The meeting to check within.
            display_name: The display name to look for.

        Returns:
            ``True`` if an active (non-``LEFT``) participant with this
            name already exists in the meeting.
        """
        stmt = select(Participant.id).where(
            Participant.meeting_id == meeting_id,
            Participant.display_name == display_name,
            Participant.participant_status != ParticipantStatus.LEFT,
        )
        return self.db.execute(stmt).scalar_one_or_none() is not None

    def update(self, participant: Participant) -> Participant:
        """Flush pending changes made to an already-tracked participant.

        Args:
            participant: A ``Participant`` instance already attached to
                this repository's session, with mutated attributes.

        Returns:
            The same instance, flushed.  Not committed.
        """
        self.db.flush()
        return participant

    def delete(self, participant: Participant) -> None:
        """Stage a participant for deletion.

        Args:
            participant: The ``Participant`` instance to remove.
        """
        self.db.delete(participant)
        self.db.flush()
