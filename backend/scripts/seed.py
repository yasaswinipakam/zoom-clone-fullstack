#!/usr/bin/env python3
"""Database seed script.

Populates the database with a default host, sample meetings, and sample
participants so the API can be explored immediately after setup without
writing any data manually.

Assumptions
-----------
- A ``users`` table with at least an ``id`` (integer PK) column exists,
  because ``meetings.host_id`` is a FK to ``users.id``.  The users table
  is managed by a later milestone; this script inserts a minimal row
  using raw SQL so the FK constraint is satisfied without coupling to
  the future ORM model.
- The database schema has been created (either by Alembic migrations or
  by ``Base.metadata.create_all``).  This script does NOT create tables.

Usage
-----
From the ``backend/`` directory (with the virtual environment active)::

    python scripts/seed.py

The script is **idempotent** — it checks for existing rows before
inserting and skips any that are already present.
"""

import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

# Ensure the backend package is importable when the script is run from
# the project root or the backend/ directory.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text  # noqa: E402

from app.db.database import Base, SessionLocal, engine  # noqa: E402
from app.models.enums import MeetingStatus, MeetingType, ParticipantStatus  # noqa: E402
from app.models.meeting import Meeting  # noqa: E402
from app.models.participant import Participant  # noqa: E402

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DEFAULT_HOST_ID: int = 1
DEFAULT_HOST_NAME: str = "Demo Host"
DEFAULT_HOST_EMAIL: str = "host@example.com"

NOW = datetime.now(UTC)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _ensure_tables_exist() -> None:
    """Create all application tables if they do not already exist.

    The ``meetings`` table declares a FK to ``users.id``, but the
    ``User`` ORM model belongs to a future milestone and is absent from
    ``Base.metadata``.  SQLAlchemy's ``create_all`` sort pass resolves
    FK references *in-memory* against the registered metadata, so it
    raises ``NoReferencedTableError`` before touching the database.

    Fix: register a minimal stub ``Table`` for ``users`` directly into
    ``Base.metadata`` so the sort can proceed.  The stub is a seed-script
    artefact only — no model files are modified.  The actual DDL for
    ``users`` is idempotent (``CREATE TABLE IF NOT EXISTS``), so running
    this function multiple times is safe.

    Note: in production, the preferred flow is ``alembic upgrade head``
    followed by ``python scripts/seed.py``.  This function is a fallback
    for fresh local setups where no migrations have been applied yet.
    """
    from sqlalchemy import Column, Integer, String, Table

    # Only register the stub if `users` is not already known to the metadata
    # (avoids an InvalidRequestError on repeated calls within the same process).
    if "users" not in Base.metadata.tables:
        Table(
            "users",
            Base.metadata,
            Column("id", Integer, primary_key=True, autoincrement=True),
            Column("name", String, nullable=False),
            Column("email", String, nullable=False, unique=True),
        )

    Base.metadata.create_all(bind=engine)
    print("✓ Tables verified / created.")





def _seed_host(db) -> None:
    """Insert the default host user (id=1) if not present."""
    row = db.execute(
        text("SELECT id FROM users WHERE id = :id"),
        {"id": DEFAULT_HOST_ID},
    ).fetchone()
    if row is None:
        db.execute(
            text(
                "INSERT INTO users (id, name, email) VALUES (:id, :name, :email)"
            ),
            {
                "id": DEFAULT_HOST_ID,
                "name": DEFAULT_HOST_NAME,
                "email": DEFAULT_HOST_EMAIL,
            },
        )
        db.commit()
        print(f"✓ Default host user (id={DEFAULT_HOST_ID}) seeded.")
    else:
        print(f"  Default host user (id={DEFAULT_HOST_ID}) already exists — skipped.")


def _seed_meetings(db) -> list[Meeting]:
    """Insert 3 sample meetings if their meeting codes do not exist."""
    samples = [
        Meeting(
            meeting_code="111-0001-001",
            title="Instant Meeting — In Progress",
            description=(
                "A sample instant meeting that is currently active. "
                "Participants can join immediately."
            ),
            meeting_type=MeetingType.INSTANT,
            status=MeetingStatus.ACTIVE,
            host_id=DEFAULT_HOST_ID,
            started_at=NOW - timedelta(minutes=15),
        ),
        Meeting(
            meeting_code="222-0002-002",
            title="Q3 Sprint Planning",
            description=(
                "Scheduled sprint-planning meeting for Q3. "
                "Starts tomorrow at 10:00 UTC."
            ),
            meeting_type=MeetingType.SCHEDULED,
            status=MeetingStatus.SCHEDULED,
            host_id=DEFAULT_HOST_ID,
            scheduled_at=NOW + timedelta(days=1),
            duration_minutes=60,
        ),
        Meeting(
            meeting_code="333-0003-003",
            title="Team Standup — Completed",
            description="Yesterday's daily standup. Meeting has ended.",
            meeting_type=MeetingType.INSTANT,
            status=MeetingStatus.ENDED,
            host_id=DEFAULT_HOST_ID,
            started_at=NOW - timedelta(hours=25),
            ended_at=NOW - timedelta(hours=24, minutes=45),
        ),
    ]

    seeded: list[Meeting] = []
    for meeting in samples:
        from sqlalchemy import select
        existing = db.execute(
            select(Meeting).where(Meeting.meeting_code == meeting.meeting_code)
        ).scalar_one_or_none()
        if existing is None:
            db.add(meeting)
            db.flush()
            seeded.append(meeting)
            print(f"  ✓ Meeting '{meeting.title}' ({meeting.meeting_code}) seeded.")
        else:
            seeded.append(existing)
            print(
                f"  Meeting '{existing.title}' ({existing.meeting_code}) "
                "already exists — skipped."
            )
    db.commit()
    print(f"✓ Meetings: {len(seeded)} total available.")
    return seeded


def _seed_participants(db, meetings: list[Meeting]) -> None:
    """Insert sample participants into the active and ended meetings."""
    # meetings[0] = active instant meeting, meetings[2] = ended meeting
    active_meeting = meetings[0]
    ended_meeting = meetings[2]

    participants_to_add = [
        # Active meeting — 2 connected participants
        Participant(
            meeting_id=active_meeting.id,
            display_name=DEFAULT_HOST_NAME,
            participant_status=ParticipantStatus.CONNECTED,
            is_host=True,
            joined_at=NOW - timedelta(minutes=15),
        ),
        Participant(
            meeting_id=active_meeting.id,
            display_name="Alice Participant",
            participant_status=ParticipantStatus.CONNECTED,
            is_host=False,
            joined_at=NOW - timedelta(minutes=12),
        ),
        Participant(
            meeting_id=active_meeting.id,
            display_name="Bob Participant",
            participant_status=ParticipantStatus.CONNECTED,
            is_host=False,
            joined_at=NOW - timedelta(minutes=8),
        ),
        # Ended meeting — participants who have left
        Participant(
            meeting_id=ended_meeting.id,
            display_name=DEFAULT_HOST_NAME,
            participant_status=ParticipantStatus.LEFT,
            is_host=True,
            joined_at=NOW - timedelta(hours=25),
            left_at=NOW - timedelta(hours=24, minutes=45),
        ),
        Participant(
            meeting_id=ended_meeting.id,
            display_name="Carol Participant",
            participant_status=ParticipantStatus.LEFT,
            is_host=False,
            joined_at=NOW - timedelta(hours=24, minutes=58),
            left_at=NOW - timedelta(hours=24, minutes=45),
        ),
    ]

    from sqlalchemy import select
    added = 0
    for p in participants_to_add:
        existing = db.execute(
            select(Participant).where(
                Participant.meeting_id == p.meeting_id,
                Participant.display_name == p.display_name,
            )
        ).scalar_one_or_none()
        if existing is None:
            db.add(p)
            added += 1
            print(
                f"  ✓ Participant '{p.display_name}' "
                f"→ meeting id={p.meeting_id} seeded."
            )
        else:
            print(
                f"  Participant '{existing.display_name}' "
                f"in meeting id={existing.meeting_id} already exists — skipped."
            )
    db.commit()
    print(f"✓ Participants: {added} inserted.")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def seed() -> None:
    """Run the full seed sequence."""
    print("\n═══════════════════════════════════════")
    print("  Zoom Clone — Database Seed Script")
    print("═══════════════════════════════════════\n")

    _ensure_tables_exist()

    with SessionLocal() as db:
        _seed_host(db)
        meetings = _seed_meetings(db)
        _seed_participants(db, meetings)

    print("\n✅ Seed complete.\n")
    print("You can now explore the API at http://127.0.0.1:8000/docs\n")


if __name__ == "__main__":
    seed()
