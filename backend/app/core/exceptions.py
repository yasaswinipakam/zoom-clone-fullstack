"""Custom domain exception hierarchy.

Per Constitution Section 11.1, services raise typed domain exceptions
rather than `HTTPException` or bare `Exception` (Section 9.2, 9.4).
This file was not on Milestone 2's explicit "create only" list, but is
added now as a necessary, minimal exception: `MeetingService` cannot
comply with Sections 9.2/9.4/11.1 (no FastAPI imports, no generic
exceptions, typed domain errors only) without it existing. Per
Constitution Section 23 Rule 20, this conflict between the milestone's
literal file list and the constitution's mandatory service-layer rules
is flagged explicitly here rather than silently resolved by either
skipping proper exception handling or improvising `HTTPException`
inside the service. The constitution takes precedence (Document
Precedence, Authority Order 1) and this file matches the exact
hierarchy it prescribes in Section 11.1 — nothing beyond that.
"""


class DomainError(Exception):
    """Base class for all domain-level errors."""


class NotFoundError(DomainError):
    """Requested resource does not exist."""


class ConflictError(DomainError):
    """Resource already exists / state conflict."""


class ValidationError(DomainError):
    """Business-rule validation failure (distinct from Pydantic validation)."""


class MeetingNotFoundError(NotFoundError):
    """Raised when a meeting cannot be found by ID or meeting code."""


class DuplicateMeetingCodeError(ConflictError):
    """Raised when meeting code generation cannot find a free code."""


class InvalidMeetingStatusTransitionError(ConflictError):
    """Raised when a requested status change violates the forward-only
    lifecycle (SCHEDULED -> ACTIVE -> ENDED)."""


class InvalidMeetingScheduleError(ValidationError):
    """Raised when scheduling fields violate business rules (e.g. a
    scheduled time that is no longer in the future by the time the
    service layer processes it)."""
