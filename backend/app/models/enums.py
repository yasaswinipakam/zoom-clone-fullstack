"""Fixed value sets for the Meeting domain.

Per Constitution Section 4.8, fixed value sets are represented as
`enum.Enum` (here `StrEnum`, per the Python 3.12 language-version rule
in Section 4.1) rather than raw strings scattered through the code.

Placement note: these enums are intentionally colocated with the model
layer (they back the `Enum(...)` column types on `Meeting`, per the
Section 6.1 example) but are also consumed by `app.schemas.meeting` for
request/response validation. Constitution Section 3.4 forbids
`schemas/` from importing `models/` in the general case — that rule
exists to stop API contracts from leaking ORM structure (relationships,
lazy-loaded attributes, table metadata). A `StrEnum` carries none of
that: it is a closed set of string values with no persistence behavior,
identical in shape whether it lives in `models/` or `schemas/`. Sharing
one definition here avoids two independently-maintained copies of the
same domain vocabulary drifting apart, which is a larger maintainability
risk (Section 1.2, "Maintainability") than the narrow, documented import
this requires. This is a deliberate, minimal exception, not a silent
reinterpretation of Section 3.4 — flagged here per Section 23 Rule 20.
"""

from enum import StrEnum


class MeetingType(StrEnum):
    """How a meeting was created.

    Immutable once set — a meeting's creation flow never changes after
    the fact, which is why `type` is modeled separately from `status`
    (Engineering Design Document Section 5.3).
    """

    INSTANT = "INSTANT"
    SCHEDULED = "SCHEDULED"


class MeetingStatus(StrEnum):
    """Lifecycle state of a meeting.

    Transitions are forward-only: `SCHEDULED -> ACTIVE -> ENDED`
    (Engineering Design Document Section 6.5). An instant meeting is
    created directly in `ACTIVE`, since it has no scheduling phase.
    """

    SCHEDULED = "SCHEDULED"
    ACTIVE = "ACTIVE"
    ENDED = "ENDED"
