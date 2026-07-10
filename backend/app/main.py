"""FastAPI application instantiation.

Per Constitution Section 3.1/3.2, this module owns app creation only:
metadata, middleware registration, exception-handler registration,
router mounting, and the startup/shutdown lifecycle. It contains no
business logic and no route bodies beyond the infrastructure-level
health check.
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.constants import API_V1_PREFIX, SERVICE_NAME
from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.core.logger import get_logger
from app.core.logging_config import configure_logging
from app.core.middleware import RequestContextMiddleware
from app.routers import meeting_router, participant_router

# Configured at import time — before the module-level `logger` below is
# even created, and before FastAPI or any other module in this process
# has a chance to emit a log line. Waiting until the lifespan's startup
# phase (as an earlier draft of this file did) leaves a window where
# anything imported above this line could log with the logging module's
# unconfigured defaults instead of the app's format/level.
configure_logging()

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage application startup and shutdown.

    Logging is already configured by the time this runs (see the
    module-level `configure_logging()` call above), so startup only
    needs to announce that the app is live. Shutdown currently has
    nothing to release (the DB engine's connection pool is closed by
    the process exiting); a hook is kept here so a future resource
    (e.g. a cache client) has a defined place to register cleanup.

    Args:
        app: The FastAPI application instance being managed.

    Yields:
        Control back to FastAPI for the application's running lifetime.
    """
    logger.info(
        "Starting %s v%s (env=%s)",
        settings.app_name,
        settings.app_version,
        settings.environment,
    )
    yield
    logger.info("Shutting down %s", settings.app_name)


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "Backend API for a Zoom-style video conferencing platform "
        "(SDE Fullstack Assignment)."
    ),
    lifespan=lifespan,
)

# --- Middleware registration -------------------------------------------
# Order matters: middleware registered last runs first on the request
# path. CORS must wrap the request-context middleware so preflight
# responses still carry CORS headers.
app.add_middleware(RequestContextMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_credentials=True,
    # Wildcard methods/headers are acceptable for local development,
    # where the exact route surface isn't finalized yet. Before
    # deployment, narrow `allow_methods` to what the API actually
    # exposes (e.g. GET, POST, PATCH, DELETE) per Constitution
    # Section 17 (Security Standards).
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Exception handler registration -------------------------------------
# Pydantic/FastAPI request validation → 422 (below).
# Domain exceptions (NotFoundError → 404, ConflictError → 409,
# ValidationError → 400) are registered after the catch-all handler
# to satisfy FastAPI's registration order and are mapped centrally so
# routers stay free of try/except (Constitution Section 11.2).
@app.exception_handler(RequestValidationError)
async def handle_validation_error(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Return FastAPI's standard 422 shape for request validation errors.

    Args:
        request: The request that failed validation.
        exc: The validation error raised by FastAPI/Pydantic.

    Returns:
        A 422 response with the default FastAPI error detail structure.
    """
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"error": "validation_error", "message": exc.errors()},
    )


@app.exception_handler(Exception)
async def handle_unhandled_exception(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all handler for unhandled exceptions.

    Logs the full traceback server-side (Constitution Section 11.3) and
    returns a sanitized response that never leaks internals to the
    client (Constitution Section 11.2).

    Args:
        request: The request being processed when the exception occurred.
        exc: The unhandled exception.

    Returns:
        A 500 response with a generic, non-leaky error message.
    """
    logger.error(
        "Unhandled exception on %s %s", request.method, request.url.path, exc_info=exc
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "internal_server_error",
            "message": "An unexpected error occurred",
        },
    )


@app.exception_handler(NotFoundError)
async def handle_not_found_error(request: Request, exc: NotFoundError) -> JSONResponse:
    """Map domain ``NotFoundError`` to HTTP 404.

    Per Constitution Section 11.2, domain exceptions are translated to
    HTTP responses in a single, central location (here) so individual
    routers remain free of ``try/except`` blocks.

    Args:
        request: The request that triggered the exception.
        exc: The domain-level not-found error.

    Returns:
        A 404 JSON response with a consistent error shape.
    """
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"error": "not_found", "message": str(exc)},
    )


@app.exception_handler(ConflictError)
async def handle_conflict_error(request: Request, exc: ConflictError) -> JSONResponse:
    """Map domain ``ConflictError`` to HTTP 409.

    Covers duplicate-code and invalid status-transition errors.

    Args:
        request: The request that triggered the exception.
        exc: The domain-level conflict error.

    Returns:
        A 409 JSON response with a consistent error shape.
    """
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"error": "conflict", "message": str(exc)},
    )


@app.exception_handler(ValidationError)
async def handle_domain_validation_error(
    request: Request, exc: ValidationError
) -> JSONResponse:
    """Map domain ``ValidationError`` to HTTP 400.

    Distinct from Pydantic's 422 ``RequestValidationError`` — this 400
    is for business-rule failures that the schema layer cannot catch
    (e.g. a ``scheduled_at`` that was in the future when the Pydantic
    validator ran but had passed by the time the service processed it).

    Args:
        request: The request that triggered the exception.
        exc: The domain-level validation error.

    Returns:
        A 400 JSON response with a consistent error shape.
    """
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"error": "validation_error", "message": str(exc)},
    )


# --- Router registration -------------------------------------------------
# Domain exception handlers (NotFoundError → 404, ConflictError → 409,
# ValidationError → 400) are registered above. Per Constitution
# Section 11.2, they handle domain exceptions centrally so routers
# remain free of try/except blocks.
app.include_router(meeting_router, prefix=API_V1_PREFIX)
app.include_router(participant_router, prefix=API_V1_PREFIX)


# --- Health endpoint -------------------------------------------------------
# Defined inline (not in routers/) since it is infrastructure-level,
# not a domain resource, and no router package exists for it.
@app.get("/health", tags=["Infrastructure"], summary="Liveness check")
def health_check() -> dict[str, str]:
    """Report that the application process is up and serving requests.

    Returns:
        A JSON payload identifying the service, its status, and version
        — enough for a load balancer or engineer to confirm both that
        the process is alive and which build is running.
    """
    return {
        "status": "healthy",
        "service": SERVICE_NAME,
        "version": settings.app_version,
    }
