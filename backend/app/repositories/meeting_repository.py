"""Meeting data-access layer.

Per Constitution Section 8, this is the only module allowed to write
SQLAlchemy queries for the Meeting aggregate. No business rules, no
HTTP concerns, no cross-entity orchestration, and no `commit()` calls
(the service layer owns transaction boundaries, Section 6.5/9.2).
"""

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import MeetingStatus
from app.models.meeting import Meeting


class MeetingRepository:
    """Data-access methods for the `Meeting` aggregate."""

    def __init__(self, db: Session) -> None:
        """Bind this repository to a request-scoped session.

        Args:
            db: Active database session, injected from the router
                boundary downward (Constitution Section 6.4).
        """
        self.db = db

    def create(self, meeting: Meeting) -> Meeting:
        """Stage a new meeting for insertion.

        Args:
            meeting: A transient `Meeting` instance to persist.

        Returns:
            The same instance, flushed so its generated `id` is
            available to the caller. Not committed — the service layer
            commits (Constitution Section 8.3).
        """
        self.db.add(meeting)
        self.db.flush()
        return meeting

    def get_by_id(self, meeting_id: int) -> Meeting | None:
        """Fetch a single meeting by its internal primary key.

        Args:
            meeting_id: The meeting's surrogate primary key.

        Returns:
            The matching `Meeting`, or `None` if not found.
        """
        stmt = select(Meeting).where(Meeting.id == meeting_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_code(self, meeting_code: str) -> Meeting | None:
        """Fetch a single meeting by its unique, public meeting code.

        Args:
            meeting_code: The unique, human-shareable meeting identifier.

        Returns:
            The matching `Meeting`, or `None` if not found.
        """
        stmt = select(Meeting).where(Meeting.meeting_code == meeting_code)
        return self.db.execute(stmt).scalar_one_or_none()

    def list_upcoming(
        self, host_id: int | None = None, limit: int | None = None
    ) -> Sequence[Meeting]:
        """List meetings that have not yet started, soonest first.

        Backs the dashboard's Upcoming Meetings section (Assignment
        Specification, Core Feature 1) and uses the
        `(status, scheduled_at)` index (Engineering Design Document
        Section 5.3).

        Args:
            host_id: If provided, restrict results to this host.
            limit: If provided, cap the number of rows returned.

        Returns:
            Matching meetings ordered by `scheduled_at` ascending.
        """
        stmt = (
            select(Meeting)
            .where(Meeting.status == MeetingStatus.SCHEDULED)
            .order_by(Meeting.scheduled_at.asc())
        )
        if host_id is not None:
            stmt = stmt.where(Meeting.host_id == host_id)
        if limit is not None:
            stmt = stmt.limit(limit)
        return self.db.execute(stmt).scalars().all()

    def list_recent(
        self, host_id: int | None = None, limit: int | None = None
    ) -> Sequence[Meeting]:
        """List ended meetings, most recently ended first.

        Backs the dashboard's Recent Meetings section (Assignment
        Specification, Core Feature 1) and uses the `(host_id, status)`
        index (Engineering Design Document Section 5.3).

        Args:
            host_id: If provided, restrict results to this host.
            limit: If provided, cap the number of rows returned.

        Returns:
            Matching meetings ordered by `ended_at` descending.
        """
        stmt = (
            select(Meeting)
            .where(Meeting.status == MeetingStatus.ENDED)
            .order_by(Meeting.ended_at.desc())
        )
        if host_id is not None:
            stmt = stmt.where(Meeting.host_id == host_id)
        if limit is not None:
            stmt = stmt.limit(limit)
        return self.db.execute(stmt).scalars().all()

    def update(self, meeting: Meeting) -> Meeting:
        """Flush pending changes made to an already-tracked meeting.

        Args:
            meeting: A `Meeting` instance already attached to this
                repository's session, with mutated attributes.

        Returns:
            The same instance, flushed. Not committed.
        """
        self.db.flush()
        return meeting

    def delete(self, meeting: Meeting) -> None:
        """Stage a meeting for deletion.

        Args:
            meeting: The `Meeting` instance to remove.
        """
        self.db.delete(meeting)
        self.db.flush()

    def exists(self, meeting_code: str) -> bool:
        """Check whether a meeting code is already in use.

        Used by the service layer's code-generation retry loop
        (Constitution Section 17.3).

        Args:
            meeting_code: The candidate meeting code to check.

        Returns:
            `True` if a meeting with this code already exists.
        """
        stmt = select(Meeting.id).where(Meeting.meeting_code == meeting_code)
        return self.db.execute(stmt).scalar_one_or_none() is not None
