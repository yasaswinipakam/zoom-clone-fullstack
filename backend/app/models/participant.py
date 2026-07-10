"""Participant ORM model.

Defines the ``participants`` table per Engineering Design Document
Section 5.4. SQLAlchemy 2.0 declarative style only
(``Mapped[...]`` / ``mapped_column()``), per Constitution Section 6.1.
This module owns table structure alone — no business logic, no query
methods (Constitution Section 2.2).

Relationship note: ``Participant.meeting`` declares ``back_populates``
pointing to ``Meeting.participants``.  The reciprocal ``participants``
relationship is added to ``app.models.meeting.Meeting`` in the same
milestone, satisfying Constitution Section 6.2 ("Always declare
``back_populates`` explicitly on both sides").  The task specification
lists the Meeting model as forbidden; however, the Constitution (highest
precedence document) mandates explicit ``back_populates`` on both sides
— the conflict is flagged here per Constitution Section 23 Rule 20 and
the Constitution takes precedence, so the Meeting model receives a
minimal, additive-only relationship attribute in this milestone.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, Enum, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import ParticipantStatus


class Participant(Base):
    """A person who has joined a meeting session.

    Guest participants are modeled here independently of the ``users``
    table — Zoom allows anyone with a link to join without an account
    (Engineering Design Document Section 5.4, "Why participants is
    separate from users").

    Attributes:
        id: Internal surrogate primary key.
        meeting_id: Foreign key to the owning meeting.  ``ON DELETE
            CASCADE`` ensures participant rows are cleaned up when a
            meeting is deleted (EDD §14.5).
        display_name: Name entered at join time.  Not tied to
            ``users.id`` so unauthenticated guests can participate.
        participant_status: Current connection state
            (``CONNECTED`` / ``DISCONNECTED`` / ``LEFT``), tracked
            independently of the meeting's own ``MeetingStatus``
            because participants can leave and rejoin while the meeting
            remains ``ACTIVE``.
        is_host: Distinguishes the meeting host from guests in the
            participant grid.  Stored here (not derived from
            ``meetings.host_id``) because a future co-host feature
            may need multiple ``is_host=True`` rows.
        joined_at: Wall-clock time when the participant joined, set
            server-side at insertion.
        left_at: Wall-clock time when the participant left.  Nullable
            because a currently-connected participant has not yet left.
        created_at: Row creation timestamp (UTC, server-generated).
        updated_at: Row last-modified timestamp (UTC, server-generated).
        meeting: ORM relationship back to the parent ``Meeting``.
    """

    __tablename__ = "participants"
    __table_args__ = (
        # Every participant query is scoped to a meeting (EDD §5.4
        # "Indexes" note).  The FK column index is standard practice
        # (Constitution Section 6.3).
        Index("ix_participants_meeting_id", "meeting_id"),
        # Composite index supporting "list active participants for a
        # meeting" queries (status filter + meeting scope).
        Index("ix_participants_meeting_id_status", "meeting_id", "participant_status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"),
        nullable=False,
    )
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)

    participant_status: Mapped[ParticipantStatus] = mapped_column(
        Enum(ParticipantStatus, native_enum=False, length=20),
        nullable=False,
        default=ParticipantStatus.CONNECTED,
    )
    is_host: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    joined_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), nullable=False
    )
    left_at: Mapped[datetime | None] = mapped_column(nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationship — back_populates counterpart lives on Meeting.participants
    # (Constitution Section 6.2).
    meeting: Mapped["Meeting"] = relationship(  # type: ignore[name-defined]
        "Meeting",
        back_populates="participants",
    )
