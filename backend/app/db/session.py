"""Database session lifecycle.

Per Constitution Section 6.4, one request = one session, provided via
`Depends(get_db)` using a generator that guarantees `close()` in a
`finally` block. Sessions are never constructed inside repositories or
services directly.
"""

from collections.abc import Generator

from sqlalchemy.orm import Session, sessionmaker

from app.db.engine import engine

SessionLocal: sessionmaker[Session] = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)


def get_db() -> Generator[Session, None, None]:
    """Yield a database session scoped to a single request.

    This is registered as a FastAPI dependency (`Depends(get_db)`) at
    the router boundary. It is intentionally the *only* place a
    `Session` is instantiated.

    Yields:
        An active SQLAlchemy `Session`.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
