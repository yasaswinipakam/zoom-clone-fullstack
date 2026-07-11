"""Central dependency-injection providers.

Per Constitution Section 5.2, all services and DB sessions are injected
via ``Depends()``, with provider functions living in this dedicated
module. Each provider constructs its object graph from the innermost
dependency outward: ``Session → Repository → Service``. Route functions
never instantiate services or repositories manually.

Milestone 3 adds ``get_meeting_service`` for the Meeting API layer.
Task 5 adds ``get_participant_service`` for the Participant API layer.
"""

from collections.abc import Generator

from fastapi import Depends
from sqlalchemy.orm import Session

from app.db.session import get_db as _get_db
from app.repositories.meeting_repository import MeetingRepository
from app.repositories.participant_repository import ParticipantRepository
from app.repositories.user_repository import UserRepository
from app.services.auth_service import AuthService
from app.services.meeting_service import MeetingService
from app.services.participant_service import ParticipantService


def get_db_session() -> Generator[Session, None, None]:
    """Provide a request-scoped database session.

    Thin wrapper around `app.db.session.get_db` so routers depend on
    `app.dependencies` exclusively, rather than reaching into `app.db`
    directly — keeping the dependency surface for route functions in
    one predictable module.

    Yields:
        An active SQLAlchemy ``Session``.
    """
    yield from _get_db()


def get_meeting_service(
    db: Session = Depends(get_db_session),
) -> MeetingService:
    """Construct and return a ``MeetingService`` for the current request.

    Wires the full dependency chain:
    ``Session → MeetingRepository → MeetingService``.

    Per Constitution Section 5.2, routers never instantiate services
    or repositories manually — they declare this function as a
    ``Depends()`` parameter so FastAPI resolves the chain automatically.

    Args:
        db: The request-scoped database session, injected by FastAPI.

    Returns:
        A ``MeetingService`` bound to the current session.
    """
    return MeetingService(
        meeting_repo=MeetingRepository(db=db),
        user_repo=UserRepository(db=db),
        participant_repo=ParticipantRepository(db=db),
    )


def get_participant_service(
    db: Session = Depends(get_db_session),
) -> ParticipantService:
    """Construct and return a ``ParticipantService`` for the current request.

    Wires the full dependency chain:
    ``Session → MeetingRepository + ParticipantRepository → ParticipantService``.

    ``ParticipantService`` receives both repositories because it
    coordinates across the Participant and Meeting aggregates for
    meeting-existence and joinability checks (Constitution Section 9.2).

    Args:
        db: The request-scoped database session, injected by FastAPI.

    Returns:
        A ``ParticipantService`` bound to the current session.
    """
    return ParticipantService(
        participant_repo=ParticipantRepository(db=db),
        meeting_repo=MeetingRepository(db=db),
    )


def get_auth_service(db: Session = Depends(get_db_session)) -> AuthService:
    """Provide the optional authentication service for the request."""
    return AuthService(user_repo=UserRepository(db=db))
