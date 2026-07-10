"""Meeting ORM model.

Defines the `meetings` table per Engineering Design Document Section 5.3.
SQLAlchemy 2.0 declarative style only (`Mapped[...]` / `mapped_column()`),
per Constitution Section 6.1. This module owns table structure alone —
no business logic, no query methods (Constitution Section 2.2).
"""

from datetime import datetime

from sqlalchemy import CheckConstraint, Enum, ForeignKey, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import MeetingStatus, MeetingType


class Meeting(Base):
    """A video conferencing meeting, instant or scheduled.

    Attributes:
        id: Internal surrogate primary key. Never exposed in API
            responses or URLs — `meeting_code` is the public identifier
            (Engineering Design Document Section 5.3, "Why each field
            exists").
        meeting_code: Unique, human-shareable identifier used in invite
            links and join lookups.
        title: Display title. Required; the "Instant Meeting" default
            for untitled instant meetings is a business rule applied by
            the service layer (Constitution Section 9.1), not a column
            default, since the correct default can depend on meeting
            type.
        description: Free-text details, primarily used for scheduled
            meetings.
        meeting_type: Immutable classification of how the meeting was
            created (`INSTANT` or `SCHEDULED`).
        status: Current lifecycle state (`SCHEDULED`, `ACTIVE`,
            `ENDED`). Modeled separately from `meeting_type` because it
            changes over time while `meeting_type` does not (Engineering
            Design Document Section 5.3).
        host_id: Foreign key to the owning user. The `User` model is
            introduced in a later milestone (per this milestone's scope
            freeze); the column is defined now so the schema is correct
            from day one, per Constitution Section 17.6.
        scheduled_at: Planned start time, set only for scheduled
            meetings.
        duration_minutes: Planned duration in minutes, constrained to
            the 5-480 range agreed in the Engineering Design Document.
        started_at: Actual start time, set when the meeting transitions
            to `ACTIVE`. Distinct from `scheduled_at` because actual and
            planned start can differ.
        ended_at: Actual end time, set when the meeting transitions to
            `ENDED`.
        created_at: Row creation timestamp (UTC, server-generated).
        updated_at: Row last-modified timestamp (UTC, server-generated).
    """

    __tablename__ = "meetings"
    __table_args__ = (
        Index("ix_meetings_status_scheduled_at", "status", "scheduled_at"),
        Index("ix_meetings_host_id_status", "host_id", "status"),
        CheckConstraint(
            "duration_minutes IS NULL OR "
            "(duration_minutes >= 5 AND duration_minutes <= 480)",
            name="ck_meetings_duration_minutes_range",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    meeting_code: Mapped[str] = mapped_column(
        String(20), unique=True, index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    meeting_type: Mapped[MeetingType] = mapped_column(
        Enum(MeetingType, native_enum=False, length=20), nullable=False
    )
    status: Mapped[MeetingStatus] = mapped_column(
        Enum(MeetingStatus, native_enum=False, length=20), nullable=False
    )

    host_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), index=True, nullable=False
    )

    scheduled_at: Mapped[datetime | None] = mapped_column(nullable=True)
    duration_minutes: Mapped[int | None] = mapped_column(nullable=True)

    started_at: Mapped[datetime | None] = mapped_column(nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now(), nullable=False
    )
