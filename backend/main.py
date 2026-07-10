"""FastAPI application entry point.

This module is responsible ONLY for instantiating the FastAPI application,
its metadata, lifespan events, and the registration points (middleware,
routers, exception handlers) that later sprints will populate. No business
logic, database access, or route implementations belong here — see the
Backend Engineering Constitution, Section 2 (Backend Architecture Rules).
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI

APP_TITLE = "Zoom Clone API"
APP_DESCRIPTION = (
    "Backend API for the Zoom Clone SDE Fullstack Assignment — powers "
    "instant meetings, scheduled meetings, and participant management."
)
APP_VERSION = "0.1.0"


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage application startup and shutdown events.

    Sprint 1 registers no startup/shutdown behavior (no database engine,
    no logging configuration exists yet). This context manager is the
    designated extension point for future sprints.

    Args:
        app: The FastAPI application instance.

    Yields:
        None. Control returns to FastAPI to serve requests.
    """
    # --- Startup placeholder (future sprints: DB engine init, logging, etc.) ---
    yield
    # --- Shutdown placeholder (future sprints: dispose DB engine, etc.) ---


app = FastAPI(
    title=APP_TITLE,
    description=APP_DESCRIPTION,
    version=APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# Middleware registration placeholder
# Future sprints: CORS middleware for the Next.js frontend origin(s), per the
# Engineering Design Document (Section: API Communication).
# Example (not active yet):
#     from fastapi.middleware.cors import CORSMiddleware
#     app.add_middleware(CORSMiddleware, allow_origins=[...])
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Router registration placeholder
# Future sprints: app.include_router(meeting_router, prefix="/api/v1")
# Future sprints: app.include_router(participant_router, prefix="/api/v1")
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Exception handler registration placeholder
# Future sprints: app.add_exception_handler(...) for domain-specific
# exceptions defined in core/exceptions.py, per the shared error schema.
# ---------------------------------------------------------------------------


@app.get("/health", tags=["Health"], summary="Health check")
def health_check() -> dict[str, str]:
    """Report basic application liveness.

    Returns:
        A small status payload confirming the API process is running.
    """
    return {"status": "ok", "service": APP_TITLE, "version": APP_VERSION}
