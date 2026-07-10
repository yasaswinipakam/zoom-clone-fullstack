"""Request-scoped middleware.

Per Constitution Section 12.4, a single logging middleware logs method,
path, status code, and duration per request. This module also assigns
a correlation ID per request so related log lines can be traced across
a single request's lifecycle. CORS is registered separately in
`main.py` via FastAPI's built-in `CORSMiddleware`, since it needs no
custom logic.
"""

import time
import uuid
from collections.abc import Awaitable, Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.constants import CORRELATION_ID_HEADER
from app.core.logger import get_logger

logger = get_logger(__name__)

_RequestHandler = Callable[[Request], Awaitable[Response]]


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Attach a correlation ID and log request method/path/status/duration.

    Responsibilities:
        - Read an inbound `X-Correlation-ID` header, or generate one.
        - Store it on `request.state` so downstream code (dependencies,
          exception handlers) can access it.
        - Echo it back on the response so clients can correlate logs.
        - Emit one INFO-level log line per request with timing, per
          Constitution Section 12.4.

    This middleware intentionally does not log business events —
    Constitution Section 10.3 reserves that for the service layer.
    """

    async def dispatch(self, request: Request, call_next: _RequestHandler) -> Response:
        """Process a single request/response cycle.

        Args:
            request: The incoming Starlette request.
            call_next: The next handler in the middleware chain.

        Returns:
            The response, with the correlation ID header attached.
        """
        correlation_id = request.headers.get(CORRELATION_ID_HEADER) or str(uuid.uuid4())
        request.state.correlation_id = correlation_id

        start_time = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start_time) * 1000

        response.headers[CORRELATION_ID_HEADER] = correlation_id

        logger.info(
            "%s %s -> %d (%.2fms)",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            extra={"correlation_id": correlation_id},
        )
        return response
