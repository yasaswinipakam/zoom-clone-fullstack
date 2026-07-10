# BACKEND ENGINEERING CONSTITUTION
## Zoom Clone — SDE Fullstack Assignment
### Version 1.0 — Ratified as the Permanent Engineering Law for this Project

> This document is not documentation. It is not a tutorial. It is **law**.
> Every backend file generated for this project — past, present, or future —
> must comply with every rule in this constitution. Where the Assignment
> Specification or the Engineering Design Document define *what* to build,
> this constitution defines *how* it must be built, structured, named,
> validated, and reviewed. No implementation may contradict it.

---

## Table of Contents

1. Engineering Philosophy
2. Backend Architecture Rules
3. Project Folder Rules
4. Python Coding Standards
5. FastAPI Standards
6. SQLAlchemy Standards
7. Pydantic Standards
8. Repository Layer Standards
9. Service Layer Standards
10. Router Layer Standards
11. Exception Handling Standards
12. Logging Standards
13. Configuration Standards
14. Database Rules
15. API Design Rules
16. Validation Rules
17. Security Standards
18. Performance Standards
19. Testing Philosophy
20. Documentation Standards
21. Code Quality Checklist
22. Review Checklist
23. AI Implementation Rules
24. Interview Readiness

---

## 1. Engineering Philosophy

### 1.1 Core Belief

Code is written once and read a hundred times — by reviewers, by future
engineers, by the evaluator in this internship, and by the author six months
later. Every decision in this constitution optimizes for the **reader**, not
the writer.

### 1.2 The Seven Pillars

| Pillar | Meaning | Litmus Test |
|---|---|---|
| **Simplicity** | The simplest design that satisfies the requirement wins | Could a junior engineer understand this in one pass? |
| **Readability** | Code should read like well-written prose | Does the code need a comment to explain *what* it does (bad) or only *why* (acceptable)? |
| **Maintainability** | Change should be local, not viral | Does adding a field require touching 1 file or 10? |
| **Scalability** | Design should not block growth, even if growth isn't built yet | Could this handle 10x load with config changes, not rewrites? |
| **Separation of Concerns** | Each unit does exactly one job | Can you describe the file's job in one sentence without "and"? |
| **Production Mindset** | Treat a take-home assignment like production code | Would this pass a Zoom code review, not just an assignment rubric? |
| **Interview Friendliness** | Every choice must be explainable and defensible | Can you justify this decision in 30 seconds to a Principal Engineer? |

### 1.3 Non-Negotiables

- No feature is implemented "because it's easy" — it is implemented because
  the Assignment Specification or Engineering Design Document requires it.
- No architectural decision is made "to save time" — a shortcut that
  compromises layering is not a shortcut, it is future rework.
- Clever code is a liability, not an achievement. If a reviewer must pause to
  understand *how* something works, it is rewritten.
- Every file has exactly one reason to change (Single Responsibility
  Principle applied at the file level, not just the class level).

---

## 2. Backend Architecture Rules

### 2.1 Layered Architecture

The backend follows a strict **five-layer architecture**. Requests flow
downward. Data flows upward. No layer may be skipped.

```
┌─────────────────────────────────────────────┐
│                Client (Next.js)              │
└───────────────────┬───────────────────────────┘
                     │ HTTP/JSON
┌───────────────────▼───────────────────────────┐
│  ROUTER LAYER        (FastAPI routes)          │
│  - Parse request, call service, format response│
└───────────────────┬───────────────────────────┘
                     │ calls
┌───────────────────▼───────────────────────────┐
│  SERVICE LAYER       (business logic)          │
│  - Rules, validation, orchestration            │
└───────────────────┬───────────────────────────┘
                     │ calls
┌───────────────────▼───────────────────────────┐
│  REPOSITORY LAYER    (data access)             │
│  - CRUD, queries, no business logic            │
└───────────────────┬───────────────────────────┘
                     │ uses
┌───────────────────▼───────────────────────────┐
│  MODEL LAYER         (SQLAlchemy ORM models)   │
│  - Table structure, relationships              │
└───────────────────┬───────────────────────────┘
                     │ persists to
┌───────────────────▼───────────────────────────┐
│              SQLite Database                   │
└─────────────────────────────────────────────────┘
```

### 2.2 Layer Responsibility Table

| Layer | Owns | Never Owns |
|---|---|---|
| Router | HTTP concerns: parsing input, status codes, response shape | Business logic, DB queries, validation logic beyond schema shape |
| Service | Business rules, orchestration across repositories, transaction boundaries | HTTP concerns, raw SQL/ORM queries, request/response schema knowledge |
| Repository | Data access, query construction, persistence | Business rules, HTTP concerns, cross-entity orchestration |
| Model | Table schema, relationships, constraints | Any logic beyond computed/hybrid properties strictly tied to data shape |
| Schema (Pydantic) | Input/output contracts, field-level validation | Database access, business rules |

### 2.3 Dependency Direction Rule

Dependencies point **downward only**:

```
Router  →  Service  →  Repository  →  Model
```

- A Router may import a Service. A Router must **never** import a Repository
  or a Model directly.
- A Service may import a Repository. A Service must **never** import another
  Service's Router, nor import FastAPI-specific objects (e.g. `Request`,
  `HTTPException`).
- A Repository may import a Model. A Repository must **never** import a
  Service or a Router.
- Models never import anything from Repository, Service, or Router layers.

Violating upward dependency (e.g. a Repository importing a Service) is
treated as a critical architecture violation and must be rejected in review.

### 2.4 Forbidden Cross-Layer Shortcuts

| Shortcut | Why Forbidden |
|---|---|
| Router queries DB directly | Bypasses business rules, breaks testability |
| Service returns ORM model to Router | Leaks internal schema, breaks API contract stability |
| Repository contains `if` business rules (e.g. "don't allow past dates") | Business logic must be centralized in Service layer |
| Router catches generic `Exception` and swallows it | Hides bugs, breaks observability |
| Two repositories call each other directly | Cross-entity orchestration belongs in Service layer |

### 2.5 File Ownership

Every file has exactly one owning layer and one owning responsibility. A file
that does two layers' worth of work (e.g. a router function that also runs a
raw SQL query) is a **constitution violation** and must be split.

---

## 3. Project Folder Rules

### 3.1 Canonical Folder Structure

```
backend/
├── app/
│   ├── main.py                  # FastAPI app instantiation only
│   ├── core/
│   │   ├── config.py            # Settings (Pydantic BaseSettings)
│   │   ├── logging_config.py    # Logging setup
│   │   └── exceptions.py        # Custom exception classes
│   ├── db/
│   │   ├── base.py               # Declarative base + metadata
│   │   ├── session.py            # Engine + SessionLocal + get_db()
│   │   └── migrations/           # Alembic migration scripts
│   ├── models/
│   │   ├── meeting.py
│   │   ├── participant.py
│   │   └── user.py
│   ├── schemas/
│   │   ├── meeting.py             # MeetingCreate, MeetingResponse, etc.
│   │   ├── participant.py
│   │   └── common.py              # Shared/reusable schemas (pagination, errors)
│   ├── repositories/
│   │   ├── meeting_repository.py
│   │   └── participant_repository.py
│   ├── services/
│   │   ├── meeting_service.py
│   │   └── participant_service.py
│   ├── routers/
│   │   ├── meeting_router.py
│   │   └── participant_router.py
│   └── utils/
│       ├── id_generator.py        # Meeting ID / UUID generation
│       └── datetime_utils.py
├── tests/
│   ├── unit/
│   ├── integration/
│   └── conftest.py
├── alembic.ini
├── requirements.txt
├── .env.example
└── README.md
```

### 3.2 Purpose of Every Folder

| Folder | Purpose |
|---|---|
| `core/` | Cross-cutting infrastructure: settings, logging, custom exceptions. No business logic. |
| `db/` | Database engine, session lifecycle, migrations. No business logic. |
| `models/` | SQLAlchemy ORM table definitions only. |
| `schemas/` | Pydantic request/response contracts only. |
| `repositories/` | Data access functions. One file per aggregate entity. |
| `services/` | Business logic. One file per feature/domain. |
| `routers/` | HTTP route declarations. One file per resource. |
| `utils/` | Small, pure, stateless helper functions with no framework dependency. |

### 3.3 Naming Conventions

| Item | Convention | Example |
|---|---|---|
| File names | `snake_case`, singular entity + role | `meeting_service.py` |
| Class names | `PascalCase` | `MeetingService` |
| Function/variable names | `snake_case` | `get_meeting_by_id` |
| Constants | `UPPER_SNAKE_CASE` | `MEETING_ID_LENGTH` |
| Pydantic schemas | `PascalCase` + role suffix | `MeetingCreate`, `MeetingResponse`, `MeetingUpdate` |
| SQLAlchemy models | `PascalCase` singular noun | `Meeting`, `Participant` |
| Router prefixes | plural, kebab-safe | `/meetings`, `/participants` |

### 3.4 Allowed / Forbidden Imports Per Folder

| Folder | Allowed to Import | Forbidden to Import |
|---|---|---|
| `routers/` | `services/`, `schemas/`, `core/exceptions.py`, `db/session.py` (only for `Depends(get_db)`) | `repositories/`, `models/` |
| `services/` | `repositories/`, `schemas/`, `core/exceptions.py`, `utils/` | `routers/`, FastAPI request objects |
| `repositories/` | `models/`, `db/session.py` | `services/`, `routers/`, `schemas/` |
| `models/` | SQLAlchemy only | Everything else in `app/` |
| `schemas/` | Pydantic, `utils/` (pure functions only) | `models/`, `repositories/`, `services/` |

### 3.5 File Size and Responsibility Limits

- **Maximum file length (guideline):** 300 lines. Beyond this, split by
  sub-responsibility (e.g. `meeting_service.py` → `meeting_service.py` +
  `meeting_schedule_service.py` if scheduling logic grows large).
- **Maximum function length (guideline):** 40 lines. If longer, extract a
  private helper function.
- **One class per file** in `models/` and one primary service class per file
  in `services/`.
- A router file may contain multiple route functions **for the same
  resource only**.

---

## 4. Python Coding Standards

### 4.1 Language Version

- Python **3.12**. Use modern syntax (`X | None` instead of `Optional[X]`,
  built-in generics `list[str]` instead of `List[str]`).

### 4.2 Type Hints

- Every function signature must have full type hints on parameters and
  return type, with no exceptions — including `-> None`.
- No use of bare `Any` unless interfacing with truly dynamic third-party
  data (e.g. raw JSON from an external webhook), and even then it must be
  narrowed via a Pydantic model as soon as possible.

### 4.3 Docstrings

- Every public function, class, and module has a docstring using
  **Google-style** format:

```python
def get_meeting_by_code(db: Session, meeting_code: str) -> Meeting | None:
    """Fetch a single meeting by its unique meeting code.

    Args:
        db: Active database session.
        meeting_code: The unique, human-shareable meeting identifier.

    Returns:
        The matching Meeting instance, or None if not found.
    """
```

- Private/internal helper functions (prefixed `_`) require a docstring only
  if their behavior is non-obvious from the name and signature.

### 4.4 Imports

- Order: standard library → third-party → local application, each group
  separated by one blank line, alphabetized within group.
- No wildcard imports (`from x import *`).
- No unused imports — enforced via linter (`ruff` or `flake8`).

### 4.5 Formatting

- Formatter: `black` (line length 88) or `ruff format`. No manual style
  debates — the formatter is the source of truth.
- Linter: `ruff` with `E`, `F`, `I`, `UP`, `B` rule sets enabled.

### 4.6 Naming

| Element | Convention |
|---|---|
| Functions/variables | `snake_case`, verb-first for functions (`create_meeting`, not `meeting_create`) |
| Booleans | Prefixed `is_`, `has_`, `can_` (`is_active`, `has_ended`) |
| Classes | `PascalCase`, noun-based |
| Constants/Enums | `UPPER_SNAKE_CASE` |
| Private members | Prefixed with single underscore `_helper()` |

### 4.7 Constants and Magic Numbers

- No magic numbers or strings in logic. All fixed values live in
  `core/config.py` or a dedicated `constants.py`.
- Example: meeting ID length, max participants, default meeting duration —
  all named constants, never inline literals.

### 4.8 Enums

- Use `enum.Enum` (or `StrEnum` in 3.12) for fixed value sets: meeting
  status (`SCHEDULED`, `ONGOING`, `ENDED`), participant role (`HOST`,
  `PARTICIPANT`). Never represent these as raw strings scattered through
  code.

### 4.9 Comments

- Comments explain **why**, never **what** (the code already shows what).
- No commented-out code committed. Delete it — version control remembers.

### 4.10 Code Duplication

- DRY is enforced at the function level. If logic is copy-pasted more than
  once, extract a shared utility or repository method.

### 4.11 Line Length and Function Size

- Line length: 88 characters (Black default).
- Function size: soft limit 40 lines; if exceeded, extract helpers.
- Method size: same limit applies to class methods.

---

## 5. FastAPI Standards

### 5.1 Router Rules

- One `APIRouter()` per resource file, mounted in `main.py` with an explicit
  `prefix` and `tags`.
- Route functions are thin: parse request → call service → return response
  model. No business logic inline.

```python
router = APIRouter(prefix="/meetings", tags=["Meetings"])

@router.post("", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
def create_meeting(
    payload: MeetingCreate,
    service: MeetingService = Depends(get_meeting_service),
) -> MeetingResponse:
    """Create an instant or scheduled meeting."""
    return service.create_meeting(payload)
```

### 5.2 Dependency Injection

- All services and DB sessions are injected via `Depends()`. No global
  session objects, no manual instantiation inside route bodies.
- Provider functions (e.g. `get_meeting_service`) live alongside the router
  or in a dedicated `dependencies.py`.

### 5.3 Response Models

- Every route declares an explicit `response_model`. Never return a raw
  ORM object or a raw `dict` from a router.
- List endpoints return a wrapping schema (e.g. `MeetingListResponse`) even
  if it only contains an `items` field, to allow future pagination metadata
  without breaking the contract.

### 5.4 Validation

- All request validation happens via Pydantic schemas at the router
  boundary. No manual `if not payload.title: raise ...` in routers.

### 5.5 HTTP Status Codes

| Action | Status Code |
|---|---|
| Successful GET | 200 |
| Successful POST (creation) | 201 |
| Successful PATCH/PUT | 200 |
| Successful DELETE | 204 |
| Validation error | 422 |
| Not found | 404 |
| Conflict (e.g. duplicate code) | 409 |
| Business rule violation | 400 |
| Unexpected server error | 500 |

### 5.6 Error Responses

- All error responses follow the shared error schema (Section 15.9). No ad
  hoc error dicts inside individual routes.

### 5.7 Route Naming

- Plural nouns, no verbs: `POST /meetings`, `GET /meetings/{meeting_id}`,
  `GET /meetings/{meeting_id}/participants`.
- Actions that aren't pure CRUD use a sub-resource or clear verb suffix:
  `POST /meetings/{meeting_id}/join`, `POST /meetings/{meeting_id}/end`.

### 5.8 Versioning

- All routes mounted under `/api/v1` in `main.py`, even though only one
  version exists today — this future-proofs breaking changes.

### 5.9 Exception Handling

- Global exception handlers registered in `main.py` for custom domain
  exceptions and unhandled exceptions (see Section 11).

### 5.10 OpenAPI Documentation

- Every router/route includes `summary` and `description`, and every
  Pydantic field includes a `Field(..., description=...)` where the meaning
  isn't self-evident. Auto-generated Swagger docs must be presentation
  quality, not default boilerplate.

---

## 6. SQLAlchemy Standards

### 6.1 ORM Conventions

- SQLAlchemy 2.0 style only: typed `Mapped[...]` and `mapped_column(...)`,
  never legacy `Column()` declarative style.

```python
class Meeting(Base):
    __tablename__ = "meetings"

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_code: Mapped[str] = mapped_column(String(12), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(200))
    status: Mapped[MeetingStatus] = mapped_column(Enum(MeetingStatus), default=MeetingStatus.SCHEDULED)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    participants: Mapped[list["Participant"]] = relationship(back_populates="meeting", cascade="all, delete-orphan")
```

### 6.2 Relationships

- Always declare `back_populates` explicitly on both sides — never rely on
  implicit backrefs.
- Cascade behavior is explicit and intentional (e.g.
  `cascade="all, delete-orphan"` for owned child records like participants).

### 6.3 Foreign Keys, Indexes, Constraints

- Every foreign key column is indexed.
- Unique business identifiers (e.g. `meeting_code`) have a `unique=True`
  constraint at the database level, not just application-level checks.
- Nullable is explicit and intentional — never left to default inference.

### 6.4 Session Handling

- One request = one session, provided via `Depends(get_db)` using a
  generator that guarantees `close()` in a `finally` block.
- Sessions are never created inside repositories or services directly —
  always injected from the router boundary downward.

### 6.5 Transactions

- The **Service layer owns transaction boundaries** (commit/rollback).
  Repositories perform `add`/`flush` but do not `commit` — this allows a
  service to coordinate multi-repository operations atomically.

### 6.6 Query Style

- Use SQLAlchemy 2.0 `select()` construct, not legacy `Query` API.
- No raw SQL strings unless a query is provably inexpressible in the ORM,
  and even then it must be parameterized (never string-interpolated).

### 6.7 Lazy vs Eager Loading

- Default to lazy loading; use `selectinload()` explicitly in repository
  queries when a known N+1 pattern exists (e.g. fetching a meeting with its
  participants for a detail view).

### 6.8 Migration Strategy

- Alembic manages all schema changes. No manual `Base.metadata.create_all()`
  in production code paths (a seed script may use it for local
  bootstrapping only, clearly marked as dev-only).
- Every schema change is a new Alembic revision with a descriptive message.

---

## 7. Pydantic Standards

### 7.1 Schema Types Per Entity

| Schema | Purpose |
|---|---|
| `{Entity}Create` | Input for creation endpoints |
| `{Entity}Update` | Input for partial update endpoints (all fields optional) |
| `{Entity}Response` | Output shape returned to client |
| `{Entity}InDB` (if needed) | Internal representation including DB-only fields |

### 7.2 Validation

- Field-level constraints declared via `Field(...)` (`min_length`,
  `max_length`, `gt`, `pattern`, etc.) rather than manual checks.
- Cross-field validation uses `@model_validator(mode="after")`.

### 7.3 Field Validators

```python
class MeetingCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    scheduled_at: datetime | None = None
    duration_minutes: int = Field(default=30, gt=0, le=480)

    @field_validator("scheduled_at")
    @classmethod
    def scheduled_at_must_be_future(cls, v: datetime | None) -> datetime | None:
        if v and v < datetime.utcnow():
            raise ValueError("scheduled_at must be in the future")
        return v
```

### 7.4 Serialization

- `model_config = ConfigDict(from_attributes=True)` on every `Response`
  schema to allow direct construction from ORM instances.
- Datetimes serialized as ISO 8601 UTC strings.

### 7.5 Naming and Inheritance

- Shared fields factored into a `{Entity}Base` schema, inherited by
  `Create`/`Update`/`Response` to avoid duplication — but `Response` always
  adds `id`, `created_at`, and other server-generated fields explicitly.

---

## 8. Repository Layer Standards

### 8.1 Responsibilities

- Repositories are the **only** layer allowed to write SQLAlchemy queries.
- One repository per aggregate root entity (`MeetingRepository`,
  `ParticipantRepository`).

### 8.2 Allowed Operations

- CRUD methods: `create`, `get_by_id`, `get_by_code`, `list`, `update`,
  `delete`.
- Query composition helpers (filtering, sorting) specific to that entity.

### 8.3 Forbidden Operations

- No business rule evaluation (e.g. "can this meeting be joined?") inside a
  repository.
- No calling another repository directly — cross-entity work belongs to the
  service layer.
- No `commit()` calls — only `flush()` when an ID is needed before the
  service-level commit.

### 8.4 Query Organization

```python
class MeetingRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_code(self, meeting_code: str) -> Meeting | None:
        stmt = select(Meeting).where(Meeting.meeting_code == meeting_code)
        return self.db.execute(stmt).scalar_one_or_none()

    def create(self, meeting: Meeting) -> Meeting:
        self.db.add(meeting)
        self.db.flush()
        return meeting
```

### 8.5 Reusable Query Design

- Common filters (e.g. "upcoming meetings", "recent meetings") are named
  repository methods (`list_upcoming`, `list_recent`), not inline query
  logic duplicated across services.

---

## 9. Service Layer Standards

### 9.1 Responsibilities

- All business logic lives here: meeting code generation rules, join
  eligibility, scheduling conflicts, status transitions.

### 9.2 Interaction Rules

- Services depend on one or more Repositories, injected via constructor.
- Services never import FastAPI-specific types (`Request`, `Response`,
  `HTTPException`) — they raise **domain exceptions** (Section 11), which
  routers translate to HTTP responses.

### 9.3 State Transitions

- Meeting status transitions (`SCHEDULED → ONGOING → ENDED`) are validated
  in the service layer; invalid transitions raise a domain exception.

```python
class MeetingService:
    def __init__(self, meeting_repo: MeetingRepository) -> None:
        self.meeting_repo = meeting_repo

    def create_instant_meeting(self, payload: MeetingCreate) -> Meeting:
        meeting = Meeting(
            meeting_code=generate_meeting_code(),
            title=payload.title,
            status=MeetingStatus.ONGOING,
        )
        created = self.meeting_repo.create(meeting)
        self.meeting_repo.db.commit()
        return created
```

### 9.4 Exception Throwing

- Services raise typed domain exceptions (`MeetingNotFoundError`,
  `InvalidMeetingCodeError`) — never generic `Exception` or raw
  `HTTPException`.

---

## 10. Router Layer Standards

### 10.1 Responsibilities

- Parse and validate input (delegated to Pydantic), invoke exactly one
  service method, map the result to a `response_model`.

### 10.2 Error Mapping

- Routers do not catch domain exceptions individually — a global exception
  handler (Section 11) maps domain exceptions to HTTP responses centrally,
  keeping routers free of `try/except` clutter.

### 10.3 Logging

- Routers do not log business events directly; the service layer logs
  business-relevant events. Routers may log at DEBUG level for request
  tracing only, via middleware, not inline per route.

---

## 11. Exception Handling Standards

### 11.1 Custom Exception Hierarchy

```python
class DomainError(Exception):
    """Base class for all domain-level errors."""

class NotFoundError(DomainError):
    """Requested resource does not exist."""

class ConflictError(DomainError):
    """Resource already exists / state conflict."""

class ValidationError(DomainError):
    """Business-rule validation failure (distinct from Pydantic validation)."""
```

Entity-specific exceptions inherit from these:
`MeetingNotFoundError(NotFoundError)`, `DuplicateMeetingCodeError(ConflictError)`.

### 11.2 Global Exception Handlers

Registered once in `main.py`:

| Exception Type | HTTP Status | Response Body |
|---|---|---|
| `NotFoundError` | 404 | `{ "error": "not_found", "message": ... }` |
| `ConflictError` | 409 | `{ "error": "conflict", "message": ... }` |
| `ValidationError` | 400 | `{ "error": "validation_error", "message": ... }` |
| `RequestValidationError` (Pydantic/FastAPI) | 422 | FastAPI default detail structure |
| Unhandled `Exception` | 500 | `{ "error": "internal_server_error", "message": "An unexpected error occurred" }` (never leak stack traces to the client) |

### 11.3 Logging on Failure

- Every unhandled exception is logged at `ERROR` level with full traceback
  server-side before returning the sanitized 500 response.

### 11.4 Recovery Strategy

- No silent failure. Every `except` block either re-raises a typed
  exception or logs and handles a genuinely recoverable condition — never a
  bare `except: pass`.

---

## 12. Logging Standards

### 12.1 Format

- Structured logging (JSON in production-style config, human-readable in
  dev) via Python's standard `logging` module configured once in
  `core/logging_config.py`.

### 12.2 Log Levels

| Level | Use Case |
|---|---|
| `DEBUG` | Detailed request/response tracing, local dev only |
| `INFO` | Business events: meeting created, participant joined |
| `WARNING` | Recoverable anomalies: retry occurred, deprecated field used |
| `ERROR` | Unhandled exceptions, failed operations |
| `CRITICAL` | System-level failure (DB unreachable) |

### 12.3 Sensitive Information

- Never log full request bodies containing user-identifying data beyond
  what's needed. No secrets, tokens, or connection strings in logs.

### 12.4 Request/Error Logging

- A single logging middleware logs method, path, status code, and duration
  per request. Business events are logged from within the service layer,
  not duplicated elsewhere.

---

## 13. Configuration Standards

### 13.1 Settings Management

- All configuration centralized in `core/config.py` using Pydantic
  `BaseSettings`, reading from environment variables with sensible
  defaults for local dev.

```python
class Settings(BaseSettings):
    database_url: str = "sqlite:///./zoom_clone.db"
    meeting_code_length: int = 10
    default_meeting_duration_minutes: int = 30
    log_level: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()
```

### 13.2 Rules

- No hardcoded database paths, ports, or secrets anywhere outside
  `config.py`.
- `.env` is git-ignored; `.env.example` is committed with placeholder
  values.
- Constants that are truly fixed (not environment-dependent) live in a
  separate `constants.py`, not mixed into `Settings`.

### 13.3 Future Scalability

- `database_url` is abstracted so swapping SQLite for PostgreSQL later is a
  one-line config change, not a code rewrite — no SQLite-specific syntax
  used anywhere outside the migration layer.

---

## 14. Database Rules

### 14.1 Naming

- Table names: plural, `snake_case` (`meetings`, `participants`).
- Column names: `snake_case`, no abbreviations (`scheduled_at`, not `sch_at`).

### 14.2 Primary and Foreign Keys

- Every table has a surrogate integer primary key `id`.
- Foreign keys named `{referenced_table_singular}_id` (e.g. `meeting_id` on
  `participants`).

### 14.3 Audit Fields

- Every table includes `created_at` and `updated_at` (server-side defaults,
  `updated_at` auto-updated via `onupdate=func.now()`).

### 14.4 Timezones

- All datetimes stored in UTC. Conversion to local time is a frontend
  concern only.

### 14.5 Deletion Strategy

- Soft-delete is not required for this assignment's scope (no auth/data
  retention need), but cascading deletes must be explicit and intentional
  (e.g. deleting a meeting cascades to its participants) — never implicit
  or accidental.

---

## 15. API Design Rules

### 15.1 REST Philosophy

- Resources are nouns, actions are HTTP verbs. Non-CRUD actions use a
  clear sub-path verb (`/meetings/{id}/join`), never a query parameter
  masquerading as an action.

### 15.2 Endpoint Naming and Pluralization

- All resource collections are plural: `/meetings`, `/participants`.

### 15.3 Versioning

- `/api/v1` prefix on all routes from day one.

### 15.4 Response Consistency

- Every success response has a consistent top-level shape per resource
  type. List endpoints always return `{ "items": [...], "total": n }` even
  before pagination is implemented, so the contract doesn't change later.

### 15.5 Pagination

- Not required by the assignment's Core Features, but the `items`/`total`
  wrapper shape is used from day one so pagination (`limit`/`offset` query
  params) can be added without a breaking contract change.

### 15.6 Filtering and Sorting

- Upcoming/Recent meetings use dedicated, explicit endpoints
  (`GET /meetings/upcoming`, `GET /meetings/recent`) rather than a generic
  `?filter=` query parameter, matching the two distinct dashboard sections
  in the Assignment Specification.

### 15.7 Error Format

Single consistent shape across the entire API:

```json
{
  "error": "not_found",
  "message": "Meeting with code ABC-123 was not found."
}
```

---

## 16. Validation Rules

### 16.1 Trust Boundaries

| Boundary | Validation Type | Enforced By |
|---|---|---|
| Client → API | Shape, type, format validation | Pydantic schemas |
| API → Business Logic | Business rules (e.g. join window, capacity) | Service layer |
| Business Logic → Database | Data integrity (uniqueness, FK, not-null) | DB constraints |

- No layer trusts the layer above it blindly. Even though Pydantic already
  validated shape, the service layer independently enforces business
  invariants, and the database independently enforces structural
  invariants. This defense-in-depth is intentional, not redundant.

---

## 17. Security Standards

### 17.1 SQL Injection

- Impossible by construction: only parameterized ORM queries are used, no
  string-formatted SQL.

### 17.2 Input Sanitization

- All input validated and type-coerced by Pydantic before reaching
  business logic. Free-text fields (title, description) length-capped.

### 17.3 Meeting Code / UUID Safety

- Meeting codes generated using `secrets.choice()` (cryptographically
  secure), not `random`, even though there's no login — this prevents
  trivial guessing of other users' meeting codes.
- Uniqueness enforced at the database level (`unique=True`), with a retry
  loop in the service layer on collision.

### 17.4 CORS

- Explicit `CORSMiddleware` allow-list of the frontend's origin(s) — never
  `allow_origins=["*"]` combined with credentials.

### 17.5 Secrets and Environment Variables

- No secrets in source control. `.env` git-ignored. `.env.example` provided.

### 17.6 Future Authentication

- Because "no login" is explicit in the spec, all endpoints currently
  operate under an assumed default user — but the schema and service layer
  are designed so a `user_id` foreign key / dependency-injected "current
  user" can be introduced later without restructuring existing tables or
  services.

### 17.7 Rate Limiting

- Out of scope for this assignment's timeline, but noted as a
  production gap in the README.

---

## 18. Performance Standards

### 18.1 Database Optimization

- Indexes on all foreign keys and on `meeting_code` (unique + indexed).
- `selectinload()` used explicitly wherever a meeting's participants are
  fetched alongside it, to avoid N+1 queries.

### 18.2 Connection Reuse

- A single SQLAlchemy `Engine` is created once at app startup and reused
  across all requests via the session factory — never recreated per
  request.

### 18.3 Response Size

- Response schemas return only fields the frontend needs; no full ORM
  object dumps.

### 18.4 Future Scaling

- SQLite is acceptable for this assignment's scale; the repository layer's
  abstraction is what allows a future swap to PostgreSQL with connection
  pooling, without touching services or routers.

---

## 19. Testing Philosophy

### 19.1 Principles

- Tests validate **behavior**, not implementation detail. A refactor that
  preserves behavior should not break tests.

### 19.2 Unit Testing

- Service layer logic is unit-tested with repositories mocked/faked —
  business rules (e.g. code generation, status transitions) are the
  primary unit test target.

### 19.3 Repository Testing

- Repository methods are tested against a real in-memory SQLite database
  (not mocks), since their entire job is correct query behavior.

### 19.4 Integration/API Testing

- FastAPI's `TestClient` used to test full request → response cycles for
  each core feature (create meeting, join meeting, schedule meeting).

### 19.5 Manual Testing

- Every core feature from the Assignment Specification is manually
  verified end-to-end via the Swagger UI before frontend integration, and
  again after, per the README's setup instructions.

---

## 20. Documentation Standards

### 20.1 Docstrings

- Required on all public functions/classes per Section 4.3.

### 20.2 README

Must include:
- Tech stack used
- Setup instructions (env creation, migrations, seeding, running server)
- Assumptions made (e.g. default logged-in user, no real video streaming)
- API overview or link to Swagger UI

### 20.3 OpenAPI

- Swagger UI (`/docs`) must be presentation-quality: every route has a
  summary, description, and example values where non-obvious.

### 20.4 Architecture Documentation

- This constitution plus the Engineering Design Document together
  constitute the full architecture documentation. No separate,
  contradictory architecture notes are to be created.

---

## 21. Code Quality Checklist

Every generated file must satisfy **all** of the following before being
considered complete:

- [ ] File belongs to exactly one layer and one responsibility
- [ ] All imports respect the allowed/forbidden import rules (Section 3.4)
- [ ] Full type hints on every function signature
- [ ] Docstrings on every public function/class
- [ ] No magic numbers or strings — all constants named
- [ ] No business logic in routers or repositories
- [ ] No raw ORM objects returned from routers
- [ ] No `commit()` calls outside the service layer
- [ ] No bare `except:` or swallowed exceptions
- [ ] No commented-out code or TODOs
- [ ] Naming conventions followed exactly (Section 3.3 / 4.6)
- [ ] Function length within guideline or justified
- [ ] Formatted via `black`/`ruff format`, linted clean

---

## 22. Review Checklist

Every pull request (conceptual, even if solo-reviewed) must satisfy:

- [ ] Feature matches Assignment Specification and Engineering Design
      Document exactly — no invented scope
- [ ] Layering respected end-to-end for the feature (router → service →
      repository → model)
- [ ] All new endpoints have response models, status codes, and OpenAPI docs
- [ ] All new tables have Alembic migrations
- [ ] All new business rules have corresponding unit tests
- [ ] Error paths tested (not just happy path)
- [ ] No secrets or hardcoded config introduced
- [ ] README updated if setup/assumptions changed
- [ ] Code Quality Checklist (Section 21) passes for every touched file

---

## 23. AI Implementation Rules

Any AI system implementing this backend must obey the following without
exception:

1. Never write business logic inside routers.
2. Never access the database directly from routers.
3. Never duplicate validation logic across layers beyond the intentional
   defense-in-depth described in Section 16.
4. Never duplicate query logic — reuse or extend repository methods.
5. Never expose ORM models directly in API responses — always map through
   a Pydantic response schema.
6. Always use `response_model` on every route.
7. Always use dependency injection for sessions and services.
8. Always use complete type hints.
9. Always write production-quality code — no placeholders, no stubs.
10. Always prefer readability over cleverness.
11. Never generate placeholder code (`pass  # implement later`).
12. Never leave `TODO` comments in submitted code.
13. Never invent architecture beyond what this constitution and the
    Engineering Design Document define.
14. Never violate the Engineering Design Document's feature scope.
15. Never violate folder or layering boundaries (Sections 2–3).
16. Never generate files unrelated to the current feature being implemented.
17. Generate **one feature at a time**, in the order defined by the
    Engineering Design Document.
18. Wait for explicit approval before proceeding to the next feature.
19. Every file generated must be interview-ready: the author must be able
    to explain every line and every design choice.
20. If a request from the user conflicts with this constitution, flag the
    conflict explicitly rather than silently complying.

---

## 24. Interview Readiness

For every non-trivial engineering decision made during implementation, the
following must be articulable:

| Question | Expected Answer Style |
|---|---|
| **Why does this exist?** | Tie back to a specific requirement in the Assignment Spec or a named principle in this constitution |
| **What was the alternative?** | Name at least one concrete alternative considered |
| **What's the tradeoff?** | State what was gained and what was given up |

### Sample Interview Q&A Bank

**Q: Why a layered architecture instead of putting everything in the router?**
A: Separation of concerns keeps business logic testable independent of
HTTP, and keeps routers thin and swappable (e.g. if the frontend framework
or transport changes, business logic is untouched). Tradeoff: more files
and more initial boilerplate for a small assignment, but it demonstrates
production-grade thinking and interviews well.

**Q: Why does the Service layer own the transaction, not the Repository?**
A: A single business operation may need to touch multiple repositories
atomically (e.g. creating a meeting and its first participant record).
If each repository committed independently, a failure partway through
would leave inconsistent state. Centralizing commit/rollback in the
service layer guarantees atomicity per business operation.

**Q: Why generate meeting codes with `secrets` instead of `random`?**
A: `random` is not cryptographically secure and its output is predictable
given enough samples. Since meeting codes are effectively access tokens
(anyone with the code can join), they must resist guessing — even though
this assignment has no authentication layer.

**Q: Why wrap list responses in `{ items, total }` instead of returning a
bare array?**
A: A bare array response can never add metadata (pagination, counts)
without becoming a breaking API change for existing clients. Wrapping from
day one costs nothing now and avoids a breaking change later.

**Q: Why SQLite now but abstract the database URL?**
A: SQLite satisfies the assignment's stated tech stack and needs zero
setup, which matters for a one-day deadline. Abstracting the connection
through `config.py` and using only portable SQLAlchemy/ORM constructs
means a future move to PostgreSQL is a configuration change, not a
rewrite — demonstrating awareness of production scaling without
over-engineering the actual deliverable.

---

## Closing Statement

This constitution is binding. Any implementation prompt that follows must
reference this document as the definitive standard. Where ambiguity exists
between this constitution and any other instruction, this constitution
takes precedence unless it directly contradicts the Assignment
Specification or the Engineering Design Document, in which case the
conflict must be surfaced explicitly rather than silently resolved.
