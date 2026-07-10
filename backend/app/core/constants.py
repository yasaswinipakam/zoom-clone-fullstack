"""Fixed application constants.

Per Constitution Section 13.2, constants that are truly fixed (i.e. not
environment-dependent, and therefore not configurable via `.env`) live
here rather than inside `Settings`. Feature-specific constants (e.g.
`MEETING_ID_LENGTH`, `MAX_PARTICIPANTS`) will be added in the milestone
that introduces the corresponding feature — this file currently holds
only infrastructure-level constants needed by Milestone 1.
"""

# --- API versioning (Constitution Section 5.8) ---
API_V1_PREFIX: str = "/api/v1"

# --- HTTP header used to propagate/trace a single request across logs ---
CORRELATION_ID_HEADER: str = "X-Correlation-ID"

# --- Service identity, used in the /health payload ---
SERVICE_NAME: str = "zoom-clone-backend"

# --- Logging ---
DEFAULT_LOG_FORMAT: str = (
    "%(asctime)s | %(levelname)-8s | %(name)s | "
    "correlation_id=%(correlation_id)s | %(message)s"
)
DEFAULT_LOG_DATE_FORMAT: str = "%Y-%m-%d %H:%M:%S"

# --- Meeting domain (Milestone 2) ---
# Per Constitution Section 17.3, meeting codes are generated with
# `secrets`, not `random`. Digits-only, hyphenated in groups of three,
# matching the Engineering Design Document Section 5.3 example
# ("847-2910-556").
MEETING_CODE_SEGMENT_LENGTHS: tuple[int, int, int] = (3, 4, 3)
MEETING_CODE_ALPHABET: str = "0123456789"
MEETING_CODE_MAX_GENERATION_ATTEMPTS: int = 5

# Default title applied by the service layer to untitled instant
# meetings (Engineering Design Document Section 6.1).
DEFAULT_INSTANT_MEETING_TITLE: str = "Instant Meeting"

# Duration bounds, mirrored by the MeetingCreate/MeetingUpdate schema
# field constraints (Engineering Design Document Section 5.3).
MEETING_DURATION_MIN_MINUTES: int = 5
MEETING_DURATION_MAX_MINUTES: int = 480
