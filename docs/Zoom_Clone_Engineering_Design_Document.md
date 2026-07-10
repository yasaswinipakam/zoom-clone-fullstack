# Zoom Clone — Engineering Implementation Document
### Design Review: Video Conferencing Platform (Meeting Management Layer)
**Prepared as a pre-development architecture proposal, in the style of a Staff Engineer design review.**

Stack: Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui | FastAPI + SQLAlchemy + Alembic | SQLite

---

## 1. High-Level Architecture

### 1.1 System Overview

This is a **three-tier web application**:

```
┌─────────────────────┐        HTTPS/JSON (REST)        ┌──────────────────────┐        SQL         ┌────────────┐
│   Next.js Frontend   │ ───────────────────────────────▶│   FastAPI Backend     │ ──────────────────▶│   SQLite   │
│  (App Router, SSR +  │◀─────────────────────────────── │  (routers/services/   │◀────────────────── │  (via      │
│   Client Components) │           JSON responses         │   models layers)      │     ORM results     │ SQLAlchemy)│
└─────────────────────┘                                   └──────────────────────┘                     └────────────┘
```

There is deliberately **no video/WebRTC layer** — the "Meeting Room" is a state-display screen (meeting metadata, participant list placeholder, mock controls). This keeps scope realistic for a 1-day assignment while preserving the full *illusion* and information architecture of Zoom.

### 1.2 Why this architecture for an internship assignment

An evaluator reviewing this in an interview is not judging whether you built Zoom. They're judging:
1. Can you cleanly separate concerns (UI vs API vs data)?
2. Do you understand REST and relational modeling?
3. Is the code something a team could extend tomorrow?

A **monolithic decoupled architecture** (separate frontend/backend, communicating over REST) is the correct choice — not a Next.js-only full-stack app with API routes — because:
- It **mirrors real production systems** at companies like Zoom, where frontend and backend are owned by different teams and deployed independently.
- It **forces you to design a real API contract**, which is explicitly graded ("API Design" isn't graded if you use Next.js server actions/route handlers directly against the DB).
- It demonstrates **polyglot competence** (TS on frontend, Python on backend) — valuable signal for a full-stack role.
- It's still simple enough to build in a day: FastAPI's automatic OpenAPI docs, Pydantic validation, and SQLAlchemy's declarative models remove most boilerplate.

The alternative — a Next.js monolith with Route Handlers and Prisma — is *faster* to build but throws away the graded backend criteria entirely (no FastAPI, no Python, no separate service layer). Given the explicit tech stack in the assignment, the decoupled approach is not just preferable, it's required.

### 1.3 Frontend Architecture (conceptual)

Next.js App Router is used as a **client-rendered SPA-like shell** with selective Server Components for initial data (dashboard lists), and Client Components for anything interactive (forms, modals, timers, copy-to-clipboard).

- **Server Components** fetch initial page data (e.g., dashboard's upcoming/recent meetings) directly from the FastAPI backend at request time — this avoids a loading spinner on first paint and mirrors how production Next.js apps use SSR for data-heavy pages.
- **Client Components** own all interactivity: modals (New Meeting, Schedule Meeting, Join Meeting), forms, and the Meeting Room screen (which needs `useEffect`/`useState` for a live clock, copy-link button, etc.).
- All *mutations* (create meeting, schedule meeting, join) happen client-side via a typed API client, so the UI can show optimistic/loading/error states — this is more realistic for a "product" than doing everything as Server Actions, and it keeps the FastAPI backend as the single source of truth reachable by any future client (mobile app, etc.).

### 1.4 Backend Architecture (conceptual)

FastAPI backend is layered:

```
Router (HTTP layer)  →  Service (business logic)  →  Repository/CRUD (DB access via SQLAlchemy)  →  SQLite
                ↑
           Pydantic Schemas (request/response contracts, validation)
```

Each layer has **one job**. Routers never touch SQLAlchemy directly; services never know about HTTP status codes; the DB layer never knows about Pydantic. This separation is the single most "interview-friendly" decision in the whole project, because it lets you answer "how would you test this" and "how would you swap SQLite for Postgres" cleanly.

### 1.5 API Communication

- Format: JSON over REST, versioned under `/api/v1/`.
- Frontend uses a single typed API client module (`lib/api-client.ts`) wrapping `fetch`, so every network call goes through one place (centralized error handling, base URL, headers).
- CORS is enabled on FastAPI for the Next.js origin (dev: `localhost:3000`; prod: the deployed frontend URL).

### 1.6 Database Interaction

- SQLAlchemy ORM (declarative models) for all reads/writes.
- Alembic manages schema migrations from day one — even though this is a small project, **showing you understand migrations** (rather than `Base.metadata.create_all()` only) is a strong signal of production habits.
- A `database.py` module owns the engine/session factory; a FastAPI dependency (`get_db`) yields a session per-request and closes it after — standard, safe, testable.

### 1.7 Component Hierarchy (Frontend, conceptual)

```
app/layout.tsx (root shell: fonts, providers, Toaster)
 └─ app/page.tsx (Dashboard)
     ├─ <Navbar />
     ├─ <QuickActionButtons /> (New / Join / Schedule)
     ├─ <NewMeetingModal />
     ├─ <JoinMeetingModal />
     ├─ <ScheduleMeetingModal />
     ├─ <UpcomingMeetingsSection>
     │    └─ <MeetingCard /> × N
     └─ <RecentMeetingsSection>
          └─ <MeetingCard /> × N
 └─ app/meeting/[meetingId]/page.tsx (Meeting Room)
     ├─ <MeetingHeader /> (title, id, timer)
     ├─ <ParticipantGrid /> (mocked self-tile)
     ├─ <MeetingControlsBar /> (mute/video/leave — inert/mock)
     └─ <InviteLinkPanel />
```

### 1.8 Request Flow (generic)

`User interaction → Client Component handler → api-client function → fetch() to FastAPI → Router → Service → CRUD → SQLAlchemy → SQLite → Response bubbles back → Pydantic serializes → JSON → Client updates state (React Query cache or useState) → UI re-renders`

### 1.9 Meeting Creation Flow (Instant Meeting)

1. User clicks "New Meeting" → Client Component calls `POST /api/v1/meetings/instant`.
2. Router validates request (empty body or optional host name) → calls `MeetingService.create_instant_meeting()`.
3. Service generates a unique `meeting_code` (see §5 for format), sets `status=ACTIVE`, `type=INSTANT`, `started_at=now()`.
4. CRUD layer inserts a `meetings` row.
5. Response returns the full meeting object including generated `meeting_code` and invite URL.
6. Frontend receives response, uses Next.js router to `push(/meeting/{meeting_code})`.
7. Meeting Room page Server Component fetches meeting details by code and renders.

### 1.10 Meeting Joining Flow

1. User clicks "Join Meeting" → modal collects `meeting_code_or_link` and `display_name`.
2. Frontend parses the input: if it's a full URL, extract the code; otherwise treat as raw code.
3. Client calls `GET /api/v1/meetings/{code}` to validate existence *before* navigating (fail fast, show inline error "Meeting not found").
4. On success, calls `POST /api/v1/meetings/{code}/participants` with `display_name` to register a `participants` row (join event).
5. Redirect to `/meeting/{code}?name={display_name}`.
6. Meeting Room reads the display name from the query param (or a lightweight client store) to greet the user and show them in the participant grid.

### 1.11 Scheduling Flow

1. User opens "Schedule Meeting" modal → fills title, description, date/time, duration.
2. Client-side validation (Zod schema) ensures date/time is in the future and duration > 0.
3. `POST /api/v1/meetings/scheduled` with payload.
4. Service generates `meeting_code`, sets `type=SCHEDULED`, `status=SCHEDULED`, stores `scheduled_at`, `duration_minutes`.
5. Response includes the generated invite link.
6. Frontend closes modal, shows a success toast with a "Copy Link" action, and revalidates/refetches the Upcoming Meetings list (or optimistically prepends the new meeting).
7. Dashboard's Upcoming Meetings section queries `GET /api/v1/meetings?status=SCHEDULED&order=scheduled_at.asc`.

---

## 2. Folder Structure

### 2.1 Frontend (`/frontend`)

```
frontend/
├── app/
│   ├── layout.tsx                 # Root layout: fonts, ThemeProvider, Toaster
│   ├── page.tsx                   # Dashboard (Server Component, fetches lists)
│   ├── globals.css                # Tailwind base + Zoom color tokens
│   ├── meeting/
│   │   └── [meetingId]/
│   │       └── page.tsx           # Meeting Room screen
│   └── join/
│       └── page.tsx               # Optional standalone join-by-link landing (deep link target)
│
├── components/
│   ├── layout/
│   │   ├── navbar.tsx
│   │   └── footer.tsx
│   ├── dashboard/
│   │   ├── quick-actions.tsx      # New/Join/Schedule buttons row
│   │   ├── meeting-card.tsx       # Reusable card for upcoming/recent
│   │   ├── upcoming-meetings.tsx
│   │   └── recent-meetings.tsx
│   ├── modals/
│   │   ├── new-meeting-modal.tsx
│   │   ├── join-meeting-modal.tsx
│   │   └── schedule-meeting-modal.tsx
│   ├── meeting-room/
│   │   ├── meeting-header.tsx
│   │   ├── participant-grid.tsx
│   │   ├── participant-tile.tsx
│   │   ├── controls-bar.tsx
│   │   └── invite-panel.tsx
│   └── ui/                        # shadcn/ui primitives (button, dialog, input, card, etc.)
│
├── lib/
│   ├── api-client.ts              # fetch wrapper, typed endpoints
│   ├── types.ts                   # Shared TS types mirroring backend Pydantic schemas
│   ├── validators.ts              # Zod schemas for forms
│   ├── utils.ts                   # cn(), formatDate(), formatDuration(), generateInviteUrl()
│   └── constants.ts               # API base URL, meeting code regex, etc.
│
├── hooks/
│   ├── use-meetings.ts            # Data-fetching hook (list, create, join) — wraps api-client
│   ├── use-copy-to-clipboard.ts
│   └── use-meeting-timer.ts       # Elapsed-time ticker for Meeting Room
│
├── public/
│   └── (icons/illustrations, no copyrighted Zoom assets)
│
├── .env.local                     # NEXT_PUBLIC_API_URL
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

**Rationale:**
- `app/` holds *routes only* — no business logic, so pages stay thin and readable.
- `components/` is split **by domain** (`dashboard`, `modals`, `meeting-room`) rather than dumping everything in one folder — this signals you think about feature boundaries, not just file count.
- `components/ui/` is kept separate because it's shadcn-generated/primitive and shouldn't mix with app-specific components.
- `lib/` vs `hooks/`: `lib` is pure functions/config (no React), `hooks` is anything using React state/effects — a common and interview-recognizable convention.
- Naming convention: **kebab-case filenames**, **PascalCase component names**, **camelCase functions/variables** — matches Next.js/shadcn ecosystem norms.

### 2.2 Backend (`/backend`)

```
backend/
├── app/
│   ├── main.py                    # FastAPI app instance, CORS, router registration
│   ├── config.py                  # Settings (Pydantic BaseSettings): DB URL, CORS origins
│   ├── database.py                # Engine, SessionLocal, Base, get_db() dependency
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── meeting.py             # Meeting ORM model
│   │   ├── participant.py         # Participant ORM model
│   │   └── user.py                # User ORM model (single seeded default user)
│   │
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── meeting.py             # MeetingCreate, MeetingResponse, MeetingUpdate
│   │   ├── participant.py
│   │   └── user.py
│   │
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── meetings.py            # /api/v1/meetings/*
│   │   ├── participants.py        # /api/v1/meetings/{code}/participants
│   │   └── users.py                # /api/v1/users/me
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── meeting_service.py     # Business logic: code generation, status transitions
│   │   └── participant_service.py
│   │
│   ├── crud/
│   │   ├── __init__.py
│   │   ├── meeting_crud.py        # Pure DB queries (get, create, list, filter)
│   │   └── participant_crud.py
│   │
│   ├── core/
│   │   ├── exceptions.py          # Custom exceptions (MeetingNotFoundError, etc.)
│   │   └── security_stub.py       # Placeholder for future auth (documented, unused)
│   │
│   └── utils/
│       ├── code_generator.py      # Meeting code / ID generation logic
│       └── datetime_utils.py
│
├── alembic/
│   ├── versions/
│   └── env.py
├── alembic.ini
├── seed.py                        # Populates default user + sample meetings
├── requirements.txt
├── .env
└── README.md
```

**Rationale:**
- `models` vs `schemas`: strict separation between **DB shape** (SQLAlchemy) and **API contract** (Pydantic) — this is the #1 thing interviewers probe on FastAPI projects ("why not just return the ORM object?"). Answer: coupling API responses to DB models leaks internal fields and breaks the moment you refactor the schema.
- `routers` = HTTP concerns only (status codes, path/query params, calling one service method).
- `services` = orchestration/business rules (e.g., "a scheduled meeting's time must be in the future," "generate a code and retry on collision").
- `crud` = the only layer allowed to write SQLAlchemy queries — makes unit testing trivial (mock the CRUD layer, test services in isolation).
- `core/security_stub.py` is intentionally included **empty but documented** — it's a strong interview talking point ("I designed the layer so auth can be dropped in without touching routers").

---

## 3. Frontend Architecture

### 3.1 Pages

| Route | Type | Purpose |
|---|---|---|
| `/` | Server Component | Dashboard: navbar, quick actions, upcoming + recent meetings |
| `/meeting/[meetingId]` | Server Component (shell) + Client children | Meeting Room |
| `/join` | Client Component | Optional: deep-link target when a user opens a shared invite URL directly |

### 3.2 Reusable Components

| Component | Reusability | Props (conceptual) |
|---|---|---|
| `MeetingCard` | Used in both Upcoming and Recent sections | `meeting`, `variant: 'upcoming' \| 'recent'` |
| `Modal` (shadcn `Dialog` wrapper) | Used by all 3 action modals | `open`, `onOpenChange`, `title`, `children` |
| `CopyableField` | Invite link display in both Schedule confirmation and Meeting Room | `value`, `label` |
| `EmptyState` | Used when Upcoming/Recent lists are empty | `icon`, `message` |
| `LoadingSkeleton` | Used during list fetches | `count` |
| `ParticipantTile` | Reused per-participant in the grid (even with 1 mock participant, built for N) | `name`, `isMuted`, `isVideoOn` |

### 3.3 UI Primitives (shadcn/ui)

`Button`, `Dialog`, `Input`, `Label`, `Textarea`, `Select` (duration), `Calendar` + `Popover` (date picker), `Card`, `Avatar`, `Badge` (status pill: Live/Scheduled/Ended), `Toast`/`Sonner` (notifications), `Tabs` (Upcoming/Recent switch on mobile), `Skeleton`.

### 3.4 Custom Hooks

| Hook | Responsibility |
|---|---|
| `useMeetings(filter)` | Fetches meetings list (upcoming/recent), exposes `data, isLoading, error, refetch` |
| `useCreateInstantMeeting()` | Mutation hook: POST instant meeting, returns `mutate, isPending` |
| `useScheduleMeeting()` | Mutation hook for scheduling with validation error surfacing |
| `useJoinMeeting()` | Validates code + registers participant |
| `useCopyToClipboard()` | Generic clipboard copy with "Copied!" feedback state |
| `useMeetingTimer(startedAt)` | Returns formatted elapsed time, ticking every second, for the Meeting Room header |

**Recommendation:** use **TanStack Query (React Query)** as the data layer instead of hand-rolled `useEffect` fetching. It gives caching, refetch-on-focus, and loading/error states for free — and "why TanStack Query over useEffect" is a great, easy interview answer (avoids race conditions, waterfalls, duplicate requests).

### 3.5 Utility Functions

- `formatDate(iso: string): string` — human-readable date ("Jul 12, 2026, 3:00 PM")
- `formatDuration(minutes: number): string` — "1h 30m"
- `getMeetingCodeFromInput(input: string): string` — strips a full URL down to the code
- `generateInviteUrl(code: string): string`
- `cn(...classes)` — shadcn's class-merge utility

### 3.6 State Inventory

| State | Scope | Owner |
|---|---|---|
| Modal open/closed (3 modals) | Local | Each modal's parent (`QuickActions`) or lifted to `page.tsx` if only one modal open at a time |
| Form field values | Local | Inside each modal, via `react-hook-form` |
| Meetings list (server state) | Global-ish (per-page) | TanStack Query cache, keyed `['meetings', filter]` |
| Copy-link "Copied!" flash | Local | `useCopyToClipboard` |
| Meeting Room elapsed time | Local | `useMeetingTimer` |
| Display name (join flow) | Passed via query param or a tiny Zustand store if we want it to persist across the meeting room without prop-drilling | See below |

**Global vs local vs server state — why this split is sufficient:**
- **Local state** (`useState`) is used for anything that dies with the component (modal toggles, form inputs) — no need for a global store, which would be over-engineering for this scope.
- **Server state** (TanStack Query) owns anything that originates from the API — meetings lists — so the UI is never out of sync with the DB, and refetching after a mutation is a one-liner (`queryClient.invalidateQueries`).
- **No heavy global state manager (Redux) is needed.** The only cross-page value is the joining user's display name, which is small enough for a query param or a minimal Zustand atom — introducing Redux here would be an over-engineering red flag in an interview, not a plus.

### 3.7 Loading / Error / Empty States

- **Loading:** Skeleton cards for meeting lists; disabled + spinner on submit buttons during mutations.
- **Error:** Inline form errors (Zod validation messages) for client-side; toast notifications for server errors (e.g., "Meeting not found," "Failed to schedule meeting — try again").
- **Empty:** `EmptyState` component in Upcoming/Recent sections ("No upcoming meetings. Schedule one to get started.").

### 3.8 Optimistic Updates

For **Schedule Meeting**, optimistically insert the new meeting into the TanStack Query cache immediately on submit, then reconcile with the real server response (or roll back on error). This is a good bonus talking point but not load-bearing — for Instant Meeting/Join, no optimistic update is needed since the user is redirected immediately.

---

## 4. Backend Architecture

### 4.1 Layer Responsibilities

| Layer | Responsibility | Must NOT do |
|---|---|---|
| **Router** | Parse path/query/body params, call one service method, map result → HTTP response/status code | Contain business rules, direct DB queries |
| **Service** | Business logic: code generation + collision retry, status transitions (SCHEDULED → ACTIVE → ENDED), validation that needs DB context (e.g., "does this code already exist") | Know about `Request`/`Response` objects, HTTP status codes |
| **CRUD** | Raw SQLAlchemy queries: `get_by_code`, `create`, `list_by_status`, `update` | Contain business rules or validation logic |
| **Schemas (Pydantic)** | Define/validate request and response shapes; auto-generate OpenAPI docs | Touch the database |
| **Models (SQLAlchemy)** | Define table structure and relationships | Know about HTTP or Pydantic |

### 4.2 Dependency Injection

FastAPI's `Depends()` is used for:
- `get_db()` — yields a `Session`, closes it in a `finally` block, injected into every router function.
- (Documented, not implemented) `get_current_user()` — stubbed to always return the single seeded default user; structured so real auth can replace it later without touching route signatures.

### 4.3 Error Handling

- Custom exceptions in `core/exceptions.py`: `MeetingNotFoundError`, `InvalidMeetingCodeError`, `MeetingAlreadyEndedError`.
- A **global exception handler** (`@app.exception_handler(MeetingNotFoundError)`) maps these to consistent JSON error responses: `{"detail": "Meeting not found", "code": "MEETING_NOT_FOUND"}` with the correct HTTP status (404, 400, 409).
- This avoids scattering `try/except` + `HTTPException` calls throughout routers, and gives the frontend a **stable error shape** to branch on.

### 4.4 Validation

- Pydantic schemas validate types, string lengths (e.g., title max 200 chars), and enums (`MeetingType`, `MeetingStatus`).
- Custom validators: `scheduled_at` must be timezone-aware and in the future (`@field_validator`); `duration_minutes` between 5 and 480.
- Service-layer validation for anything requiring a DB round-trip (uniqueness of generated code).

---

## 5. Complete Database Design

### 5.1 Entity-Relationship Overview

```
users (1) ────────< (N) meetings ────────< (N) participants
                         │
                         └── host_id (FK → users.id)
```

Three tables is the right scope: it's normalized, it supports every required feature, and it leaves obvious, clean extension points (see §11) without redesigning anything.

### 5.2 Table: `users`

| Column | Type | Constraints | Purpose |
|---|---|---|---|
| `id` | INTEGER | PK, autoincrement | Surrogate key |
| `name` | VARCHAR(100) | NOT NULL | Display name of the default seeded user |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Ready for future auth; also used as a stable identifier |
| `avatar_url` | VARCHAR(500) | NULLABLE | Profile placeholder in navbar |
| `created_at` | DATETIME | NOT NULL, default `now()` | Audit field |

*Even though there's "no login required," this table exists so `host_id` on meetings is a real foreign key, not a hardcoded string — this is exactly the kind of forward-looking modeling decision graders and interviewers look for.*

### 5.3 Table: `meetings`

| Column | Type | Constraints | Purpose |
|---|---|---|---|
| `id` | INTEGER | PK, autoincrement | Internal surrogate key |
| `meeting_code` | VARCHAR(20) | UNIQUE, NOT NULL, INDEXED | Public-facing ID (e.g., `847-2910-556`), used in URLs |
| `title` | VARCHAR(200) | NOT NULL, default `"Untitled Meeting"` for instant meetings | Display title |
| `description` | TEXT | NULLABLE | Only used for scheduled meetings |
| `type` | VARCHAR(20) | NOT NULL, CHECK IN (`INSTANT`, `SCHEDULED`) | Distinguishes flows |
| `status` | VARCHAR(20) | NOT NULL, CHECK IN (`SCHEDULED`, `ACTIVE`, `ENDED`), default `SCHEDULED`/`ACTIVE` | Drives Upcoming vs Recent sections |
| `host_id` | INTEGER | FK → `users.id`, NOT NULL | Owner of the meeting |
| `scheduled_at` | DATETIME | NULLABLE | Only for `SCHEDULED` type |
| `duration_minutes` | INTEGER | NULLABLE, CHECK (`5–480`) | Planned duration |
| `started_at` | DATETIME | NULLABLE | Set when meeting becomes `ACTIVE` |
| `ended_at` | DATETIME | NULLABLE | Set when meeting becomes `ENDED` |
| `created_at` | DATETIME | NOT NULL, default `now()` | Audit field |
| `updated_at` | DATETIME | NOT NULL, `onupdate=now()` | Audit field |

**Indexes:** `UNIQUE INDEX` on `meeting_code` (looked up on every join); composite `INDEX (status, scheduled_at)` for the Upcoming Meetings query; `INDEX (host_id, status)` for Recent Meetings per user.

**Why each field exists:**
- `meeting_code` is separate from `id` so URLs never leak sequential DB IDs (`/meeting/1`, `/meeting/2` is both ugly and a minor info-leak pattern; Zoom-style codes are the correct UX match).
- `type` + `status` are separate on purpose: `type` never changes after creation (immutable classification), `status` is a lifecycle field that transitions over time — conflating them would make querying "all scheduled-type meetings that already ended" awkward.
- `started_at`/`ended_at` are nullable and distinct from `scheduled_at` because a scheduled meeting's *actual* start can differ from its *planned* time — this is realistic modeling, and a good schema-design talking point.

### 5.4 Table: `participants`

| Column | Type | Constraints | Purpose |
|---|---|---|---|
| `id` | INTEGER | PK, autoincrement | Surrogate key |
| `meeting_id` | INTEGER | FK → `meetings.id`, NOT NULL, ON DELETE CASCADE | Links participant to meeting |
| `display_name` | VARCHAR(100) | NOT NULL | Name entered at join time (not tied to `users`, since guests can join) |
| `joined_at` | DATETIME | NOT NULL, default `now()` | When they joined |
| `left_at` | DATETIME | NULLABLE | When they left (future use / bonus host-controls) |
| `is_host` | BOOLEAN | NOT NULL, default `false` | Distinguishes host from guests in the grid |

**Indexes:** `INDEX (meeting_id)` — every participant query is scoped to a meeting.

**Why `participants` is separate from `users`:** Zoom allows guests without accounts to join via a link. Modeling `participants` as its own lightweight table (rather than requiring a `user_id`) correctly captures this real-world requirement and avoids forcing every guest through the `users` table.

### 5.5 Normalization

The schema is in **3NF**: every non-key column depends only on its table's primary key (no transitive dependencies — e.g., `host_id` references `users` rather than duplicating host name/email onto every `meetings` row). This is intentional and worth stating explicitly in review: normalization here isn't academic, it prevents update anomalies (renaming the host would otherwise require updating every meeting row).

### 5.6 Sample Query Patterns (to justify indexes)

- Upcoming: `SELECT * FROM meetings WHERE status='SCHEDULED' ORDER BY scheduled_at ASC` → uses `(status, scheduled_at)` index.
- Recent: `SELECT * FROM meetings WHERE status='ENDED' ORDER BY ended_at DESC LIMIT 10` → benefits from a similar composite index on `(status, ended_at)`, or a shared `(status)` index if data volume is small (fine to note as a future addition rather than over-indexing a SQLite dev DB now).
- Join validation: `SELECT * FROM meetings WHERE meeting_code = ?` → unique index, O(log n) lookup.

### 5.7 Future Scalability Notes (kept brief here, expanded in §11)

The schema already anticipates: recurring meetings (`recurrence_rule` column could be added to `meetings` without breaking anything), authenticated participants (`participants.user_id` nullable FK could be added), and waiting rooms/co-hosts (`participants.role` enum extension).

---

## 6. API Design

Base path: `/api/v1`

### 6.1 `POST /meetings/instant`

- **Request body:** `{ "title"?: string }` (optional; defaults to `"Instant Meeting"`)
- **Response (201):** Full `MeetingResponse` — `id, meeting_code, title, type, status, host, started_at, invite_url`
- **Validation:** `title` max 200 chars if provided.
- **Errors:** `500` on code-generation collision retries exhausted (extremely unlikely, handled internally with retry).
- **Why it exists:** Powers the "New Meeting" button — single responsibility, no scheduling fields needed.

### 6.2 `POST /meetings/scheduled`

- **Request body:** `{ "title": string, "description"?: string, "scheduled_at": ISO8601 string, "duration_minutes": int }`
- **Response (201):** `MeetingResponse` with `scheduled_at`, `duration_minutes`, `invite_url`.
- **Validation:** `title` required; `scheduled_at` must be in the future (422 otherwise); `duration_minutes` in [5, 480].
- **Errors:** `422 Unprocessable Entity` for validation failures (FastAPI/Pydantic default — clean, no custom code needed).
- **Why it exists:** Distinct endpoint from instant creation because the required fields and business rules genuinely differ — merging them into one endpoint with a `type` flag would force conditional validation logic that's harder to read and document.

### 6.3 `GET /meetings`

- **Query params:** `status` (`SCHEDULED` | `ACTIVE` | `ENDED`, optional), `host_id` (optional, defaults to seeded user), `limit`, `offset`
- **Response (200):** `{ "items": MeetingResponse[], "total": int }`
- **Why it exists:** Single flexible list endpoint powers both Upcoming (`?status=SCHEDULED`) and Recent (`?status=ENDED`) sections — avoids two near-duplicate endpoints.

### 6.4 `GET /meetings/{meeting_code}`

- **Response (200):** `MeetingResponse` including a nested `participants: ParticipantResponse[]`
- **Errors:** `404` via `MeetingNotFoundError` if code doesn't exist.
- **Why it exists:** Used both for join-validation and for rendering the Meeting Room page.

### 6.5 `PATCH /meetings/{meeting_code}/status`

- **Request body:** `{ "status": "ACTIVE" | "ENDED" }`
- **Response (200):** Updated `MeetingResponse`
- **Validation:** Only forward transitions allowed (`SCHEDULED → ACTIVE → ENDED`); rejects invalid transitions with `409 Conflict`.
- **Why it exists:** Called when a user enters a meeting room (marks it `ACTIVE`, sets `started_at`) and when they leave/end it (`ENDED`, sets `ended_at`) — this is what actually moves a meeting from Upcoming into Recent.

### 6.6 `POST /meetings/{meeting_code}/participants`

- **Request body:** `{ "display_name": string }`
- **Response (201):** `ParticipantResponse`
- **Errors:** `404` if meeting doesn't exist; `409` if meeting has already `ENDED`.
- **Why it exists:** Records the join event; separated from the meeting-status endpoint because "a participant joined" and "the meeting's lifecycle state changed" are different concerns/actors.

### 6.7 `GET /users/me`

- **Response (200):** The single seeded default `UserResponse` (`id, name, email, avatar_url`).
- **Why it exists:** Powers the navbar profile placeholder; also gives the frontend a stable "current user" concept to build against, ready for real auth later without an interface change.

### 6.8 Status Code Summary

| Code | Meaning | Used for |
|---|---|---|
| 200 | OK | Successful GET/PATCH |
| 201 | Created | POST creating a resource |
| 404 | Not Found | Unknown `meeting_code` |
| 409 | Conflict | Invalid status transition, joining an ended meeting |
| 422 | Unprocessable Entity | Pydantic validation failure (auto) |

---

## 7. State Management Strategy

| Category | Approach | Reasoning |
|---|---|---|
| **Local UI state** | React `useState` inside components | Cheapest option; scoped to component lifetime; no need to share |
| **Form state** | `react-hook-form` + `zod` resolver | Handles validation, dirty/touched state, error messages without manual wiring |
| **Global state** | Minimal — a single Zustand store (or just query params) for "current display name" | Avoids Redux overhead; only one small cross-page value exists |
| **Server state** | TanStack Query | Caching, refetch-on-mutation, dedupes requests, gives `isLoading`/`isError` for free |
| **Loading states** | Skeletons for lists; button spinners for mutations | Matches Zoom's own perceived-performance patterns |
| **Error states** | Inline (forms) + toast (network/server) | Right error, right place — form errors shouldn't interrupt with a toast |
| **Empty states** | Dedicated `EmptyState` component | Prevents a "broken-looking" blank section |
| **Optimistic updates** | Only for Schedule Meeting list insertion | High-value, low-risk optimistic UX; other mutations already redirect immediately so optimism adds no benefit |

**Why this is sufficient:** the app has exactly one non-trivial cross-cutting piece of client state (the joining participant's name) and a handful of server-derived lists. Reaching for Redux/Context-heavy architecture here would be solving a problem this app doesn't have — and an interviewer asking "why not Redux?" should get exactly that answer.

---

## 8. Zoom UI Breakdown

*(Describing patterns to recreate — no copyrighted assets, icons, or logos are used; all elements are built from scratch with shadcn/Tailwind using Zoom's layout language, not its actual imagery.)*

### 8.1 Homepage / Dashboard

- **Navbar:** fixed top, white background, subtle bottom border/shadow. Left: wordmark/logo placeholder. Right: search icon placeholder, help icon, settings gear, circular avatar.
- **Layout:** centered content column, max-width ~1100px, generous vertical rhythm (`py-10`, section gaps of `space-y-8`).
- **Quick action buttons:** large, icon-on-top-of-label tiles in a horizontal row (New Meeting = blue filled, Join/Schedule = outlined) — Zoom uses a blue accent (`#2D8CFF`-family) as its single brand color against neutral grays.
- **Typography:** clean sans-serif (Inter/system-ui is a faithful substitute), bold semibold headings (`font-semibold`), body text in gray-600/700 for secondary info (times, durations).
- **Meeting cards:** left color bar or icon indicating status, title bold, subtitle line with date/time/duration in muted gray, right-aligned action button ("Start"/"Join"/"Copy Invitation").
- **Hover animations:** subtle `scale-[1.01]` + shadow elevation on card hover (`transition-shadow duration-150`), button color darkening on hover (`hover:bg-blue-600`).

### 8.2 Modals

Centered dialog, white card, rounded-xl corners (`rounded-xl`), soft shadow (`shadow-lg`), header with title + close (X) icon top-right, footer with secondary (Cancel) + primary (filled blue) action buttons right-aligned.

### 8.3 Meeting Room

- Dark theme (`bg-neutral-900`) — a deliberate contrast from the light dashboard, matching Zoom's actual in-call UI.
- Central participant grid area (self-tile with initials avatar since no video).
- Bottom control bar: dark, translucent, centered row of circular icon buttons (Mute, Video, Participants, Chat, Leave) — Leave button in red.
- Top-left overlay: meeting title + elapsed timer; top-right: meeting ID + copy button.

### 8.4 Icons & Colors

Use `lucide-react` (already available) for all icons — never Zoom's actual icon set. Color palette: primary blue `#2D8CFF`-equivalent (`blue-500/600` in Tailwind), neutral grays for surfaces/text, red `#E02828`-equivalent for destructive/leave actions, green for "Active/Live" status badges.

### 8.5 Responsive Behavior

- Desktop: quick actions in a row, two-column meeting sections (Upcoming | Recent) or stacked with tabs.
- Tablet: quick actions wrap to 2×2 grid.
- Mobile: quick actions stack vertically or become a horizontal scroll; sections become swipeable tabs; Meeting Room controls bar remains fixed-bottom with larger touch targets.

---

## 9. Development Roadmap

| Milestone | Goal | Est. Files Touched | Dependencies | Expected Output | Verification Checklist |
|---|---|---|---|---|---|
| **M0 — Scaffolding** | Init Next.js + FastAPI projects, install deps, configure Tailwind/shadcn, set up SQLAlchemy/Alembic | ~15 (config only) | None | Both servers boot; `/docs` loads on FastAPI; blank Next.js page renders | `npm run dev` and `uvicorn` both run without errors |
| **M1 — Database & Models** | Define `users`, `meetings`, `participants` models; first Alembic migration; seed script | 8 | M0 | SQLite file created with correct schema, seeded data visible | Inspect DB with a SQLite browser; seed runs idempotently |
| **M2 — Backend Core API** | Implement schemas, CRUD, services, routers for meetings + participants + users | 12 | M1 | All endpoints in §6 functional via `/docs` (Swagger) | Manually hit every endpoint in Swagger UI, confirm status codes |
| **M3 — Frontend Shell** | Navbar, layout, dashboard skeleton, api-client, types | 10 | M2 (needs live API) | Dashboard renders with real (empty) data from backend | Network tab shows successful GET to `/meetings` |
| **M4 — Instant + Join Flows** | New Meeting modal + redirect; Join modal + validation + Meeting Room shell | 8 | M3 | Can create instant meeting and land on Meeting Room; can join via code | Manually create → verify redirect → verify DB row created |
| **M5 — Schedule Flow** | Schedule modal with date/time picker, validation, Upcoming section wired to real data | 6 | M3 | Scheduled meetings appear in Upcoming, sorted correctly | Schedule 3 meetings, confirm ordering and persistence after refresh |
| **M6 — Meeting Room Polish** | Timer, invite panel, mock controls, participant grid, status transition (ACTIVE→ENDED on leave) | 6 | M4 | Leaving a meeting moves it into Recent | Join → leave → confirm it appears under Recent |
| **M7 — UI Polish & Responsiveness** | Zoom-style visual pass, hover states, mobile breakpoints, empty/loading/error states | N/A (CSS/component tweaks) | M4–M6 | App visually resembles Zoom across breakpoints | Test at 375px, 768px, 1440px widths |
| **M8 — README, Seed Data, Deploy** | Write README, finalize seed script, deploy both services | 3 | All | Public GitHub repo + live deployed link | Fresh clone + `README` steps reproduce the app from scratch |

This order **minimizes refactoring** because the database schema (M1) and API contract (M2) are locked *before* any frontend data-fetching code is written — the single biggest source of rework in fast-timeline projects is building UI against an API shape that later changes.

---

## 10. Engineering Decisions

| Decision | Why | Alternative considered | Why rejected |
|---|---|---|---|
| **FastAPI** | Async-ready, automatic OpenAPI/Swagger docs (huge for a 1-day project — free API testing UI), Pydantic validation built in, minimal boilerplate | Django (as offered in the assignment) | Django's batteries (admin, ORM, templating) are overkill for a pure API; FastAPI is faster to stand up and more idiomatic for a decoupled SPA backend |
| **SQLite** | Zero-config, file-based, perfectly adequate for single-user demo scope, required by assignment | PostgreSQL | Would require a hosted DB service for deployment — unnecessary operational overhead for this scope; schema is written to be Postgres-portable anyway (see §11) |
| **SQLAlchemy + Alembic** | Industry-standard ORM; Alembic migrations demonstrate production discipline instead of `create_all()` | Raw SQL | Raw SQL is more error-prone and harder to evolve; ORM also gives type-safety and relationship management (`meeting.participants`) for free |
| **Next.js App Router** | Explicit assignment requirement; Server Components reduce client JS and give fast first paint for data-heavy dashboard | Pages Router | App Router is the current standard, has better data-fetching ergonomics, and is what most companies are migrating to — stronger signal |
| **TypeScript** | Compile-time safety matching backend Pydantic contracts; catches API-shape mismatches before runtime | Plain JS | No safety net for the frontend/backend contract, which is the highest-risk seam in a decoupled architecture |
| **shadcn/ui** | Accessible, unstyled-by-default primitives that are fully owned (copied into the repo, not a black-box dependency) — easy to reskin toward Zoom's look | MUI / Chakra | Heavier, harder to override to match a specific non-generic visual identity like Zoom's |
| **Tailwind CSS** | Utility-first matches rapid iteration needs of a 1-day build; pairs natively with shadcn | CSS Modules / styled-components | Slower to iterate visually; Tailwind's design-token system also makes the Zoom color palette trivial to centralize in `tailwind.config.ts` |
| **REST over GraphQL** | Assignment scope is CRUD-shaped with few, well-defined resources — REST's simplicity wins; FastAPI's REST + auto-docs tooling is more mature than its GraphQL story | GraphQL | Adds a schema/resolver layer and client complexity (Apollo/urql) with no benefit at this scale — over-engineering for 6 endpoints |
| **Layered backend (router/service/crud)** | Testability, separation of concerns, mirrors real production FastAPI codebases | Fat routers (logic directly in route functions) | Fast to write but unmaintainable and hard to unit test — a red flag in code-quality review |
| **`meeting_code` separate from `id`** | Clean, non-sequential public identifiers; matches real Zoom UX | Expose `id` directly in URLs | Leaks row counts, looks unprofessional, harder to make memorable/shareable |

---

## 11. Scalability Discussion — "If this became a real SaaS"

The current architecture is intentionally structured so these additions are **extensions, not rewrites**:

- **Authentication (JWT):** `core/security_stub.py`'s `get_current_user()` dependency gets replaced with real JWT verification; no router signatures change since they already depend on an injected "current user." `users.email` already exists as a login identifier.
- **Real-time signaling (WebSockets):** Add a `websockets` router (`/ws/meetings/{code}`) purely for presence/chat/control events — orthogonal to the existing REST API, doesn't touch the meeting CRUD layer.
- **Actual video (WebRTC):** The Meeting Room's `ParticipantGrid` component is already structured to render N participant tiles; each tile would mount a `<video>` element bound to a WebRTC `MediaStream`. A signaling server (via the new WebSocket layer) coordinates SDP/ICE exchange; FastAPI stays as the metadata/control-plane API, not the media plane (media flows peer-to-peer or through an SFU like mediasoup/LiveKit).
- **PostgreSQL:** Because SQLAlchemy models use portable types (no SQLite-specific features), migration is essentially a connection-string + Alembic-dialect change plus enabling connection pooling.
- **Redis:** Introduced for (a) caching hot `GET /meetings/{code}` lookups, (b) pub/sub backing for the WebSocket layer across multiple backend instances, (c) rate limiting.
- **AWS S3:** For recordings/avatars — `users.avatar_url` and a future `meetings.recording_url` already anticipate storing a URL rather than a blob in the DB.
- **Docker + CI/CD:** Each service (`frontend`, `backend`) gets its own `Dockerfile`; a `docker-compose.yml` wires them with Postgres/Redis for local parity with prod; GitHub Actions runs lint/test/build on PRs and deploys on merge to `main`.
- **Background jobs:** A task queue (Celery/RQ/Arq) handles email invitations and reminder notifications asynchronously so API responses stay fast — the service layer already isolates "what should happen" (send an invite) from "how" (SMTP call), so swapping a synchronous call for `queue.enqueue(send_invite, ...)` is localized to `meeting_service.py`.
- **Email invitations:** `POST /meetings/scheduled` would enqueue an email job; no schema change needed beyond possibly a `meeting_invites` join table if inviting specific emails (natural extension of `participants`).
- **Recurring meetings:** Add `recurrence_rule` (e.g., RFC 5545 RRULE string) to `meetings`, plus a scheduled job that materializes upcoming occurrences — doesn't touch existing single-meeting logic.
- **Calendar integrations (Google/Outlook):** New `integrations` service calling external OAuth APIs on meeting creation; isolated behind the existing service layer, triggered as a side effect of `MeetingService.create_scheduled_meeting()`.

The throughline for every one of these: **because routers/services/crud/schemas are separated today, each future feature has one obvious place to live**, and none of them require touching the frontend's component structure — only its data-fetching hooks.

---

## 12. Interview Preparation

**Q: Why did you separate schemas from models?**
A: Models describe database structure; schemas describe the public API contract. Coupling them means every DB refactor risks breaking API consumers, and it leaks internal fields (like foreign keys or timestamps we don't want exposed) directly into responses. Pydantic schemas let me control exactly what's serialized.

**Q: Why FastAPI over Django, given Django was offered as an option?**
A: This is a pure API service with no server-rendered templates or admin panel needs — FastAPI's async support, automatic OpenAPI docs, and Pydantic-native validation give me more relevant tooling with less boilerplate for this specific shape of project.

**Q: Why is `meeting_code` separate from the primary key?**
A: The primary key is an internal, sequential implementation detail. Exposing it in URLs leaks information (row counts, creation order) and doesn't match how Zoom's actual product works — a public, non-sequential code is both better UX and better practice.

**Q: How would you test this backend?**
A: Because CRUD is the only layer touching SQLAlchemy, I can unit-test `services` by mocking the CRUD layer, and integration-test routers with FastAPI's `TestClient` against an in-memory SQLite database — no layer requires mocking more than one level down.

**Q: Why TanStack Query instead of Redux or plain useEffect?**
A: The app's shared state is almost entirely server-derived (meeting lists). TanStack Query gives caching, automatic refetching, and loading/error states specifically for that use case, without the boilerplate of Redux for state that doesn't need to live outside the data layer.

**Q: What was the hardest design decision?**
A: Deciding whether `type` and `status` on `meetings` should be one field or two. I kept them separate because `type` (instant vs scheduled) is immutable metadata about how the meeting was created, while `status` is a lifecycle field that changes over time — conflating them would make filtering ("all scheduled-type meetings that are now ENDED") awkward and semantically confused.

**Q: How would you add authentication without a rewrite?**
A: The `get_current_user()` dependency already exists as a stub returning the seeded user. Replacing its internals with real JWT decoding is a one-file change — no router or service signature changes, since they already depend on an injected user object rather than reading it ad hoc.

**Q: Difficult one — how do you prevent meeting code collisions?**
A: Codes are generated randomly within a fixed format (e.g., 10 digits) and the service layer attempts an insert; on a unique-constraint violation it retries with a new code, up to a small retry limit. With a large enough code space, collision probability is negligible, but handling it defensively is still correct engineering.

**Q: Difficult one — why not put everything in Next.js Server Actions and skip FastAPI entirely?**
A: That would be faster to build, but it collapses the API layer entirely — no separate service boundary, no language-agnostic contract other clients (mobile, another frontend) could use, and it doesn't satisfy the assignment's explicit backend requirement. A decoupled REST API is also simply more representative of how most real engineering orgs are structured.

---

## 13. Risk Analysis

| Pitfall | Why it happens | How to avoid it | What inexperienced devs typically do |
|---|---|---|---|
| **Business logic leaking into routers** | Feels faster to just write the query inline | Enforce the router→service→crud discipline from the first endpoint, not "later" | Write `db.query(Meeting).filter(...)` directly inside a route handler |
| **Returning ORM objects directly as JSON** | FastAPI *will* serialize them if you forget `response_model` | Always set `response_model=` on every route explicitly | Skip `response_model`, later gets bitten when a relationship causes a circular serialization error |
| **Timezone bugs on `scheduled_at`** | Mixing naive and aware datetimes between browser, API, and SQLite | Store all datetimes in UTC; convert to local time only at render time in the frontend | Store local time as-is, meetings appear at the wrong time after deploy to a different server timezone |
| **N+1 queries on participant lists** | Lazy-loading `meeting.participants` in a loop when listing meetings | Use `joinedload`/`selectinload` when eager-loading is needed, or simply don't include participants in the list endpoint (only in the detail endpoint) | Load meetings, then loop and separately query participants for each |
| **Frontend/backend type drift** | Manually keeping `types.ts` in sync with Pydantic schemas by hand | Treat `lib/types.ts` as generated-in-spirit from the OpenAPI schema (even if copied manually, review both together on every schema change); consider `openapi-typescript` as a stretch goal | Update a Pydantic field, forget the TS type, get a silent `undefined` in the UI |
| **CORS misconfiguration on deploy** | Works on `localhost` (permissive defaults), breaks in prod | Explicitly configure `allow_origins` for the deployed frontend URL and test end-to-end before final submission | Hardcode `localhost:3000` and discover the deployed app can't reach the API |
| **Over-scoping the Meeting Room** | Tempting to try to fake video with a webcam preview and scope-creep into WebRTC territory | Re-read the "DO NOT IMPLEMENT VIDEO CALLING" constraint before starting M6; timebox this milestone | Burn half the available time trying to get `getUserMedia` working, at the cost of core CRUD polish |
| **SQLite file not persisted on deploy** | Ephemeral filesystems on some PaaS providers reset the DB on redeploy | Choose a host with persistent disk (Render/Railway volumes) or document this limitation clearly and re-seed on boot | Deploy, demo works once, DB is empty after the platform restarts the container |

---

## 14. Time Estimation

Total budget: **~24 hours** (1-day deadline). Suggested allocation:

| Milestone | Estimated Time |
|---|---|
| M0 — Scaffolding | 1.5 hrs |
| M1 — Database & Models | 1.5 hrs |
| M2 — Backend Core API | 3 hrs |
| M3 — Frontend Shell | 2 hrs |
| M4 — Instant + Join Flows | 2.5 hrs |
| M5 — Schedule Flow | 2 hrs |
| M6 — Meeting Room Polish | 2 hrs |
| M7 — UI Polish & Responsiveness | 3 hrs |
| M8 — README, Seed, Deploy | 2.5 hrs |
| Buffer (debugging deploy issues, CORS, etc.) | 4 hrs |

**Most efficient build order:** backend-first, vertical-slice by feature (finish Instant Meeting end-to-end — DB → API → UI — before starting Schedule), rather than "all backend, then all frontend." This means something demoable exists after M4, which de-risks the deadline: if time runs out, you have a working core rather than two half-finished layers.

---

## 15. Final Checklist (Before Writing Any Code)

- [ ] Repo initialized with two folders (`frontend/`, `backend/`) and a root `README.md`
- [ ] `.env`/`.env.local` patterns decided (API base URL, DB URL) and `.env.example` files committed
- [ ] Alembic initialized and first migration plan written down (all 3 tables) before any model code
- [ ] API contract (§6) written down and treated as frozen before frontend work starts
- [ ] Zod validators mirror Pydantic constraints (title length, duration bounds, future-date rule) so errors are consistent client/server
- [ ] Tailwind theme tokens for the Zoom palette defined once in `tailwind.config.ts` — no ad hoc hex codes in components
- [ ] Seed script produces: 1 default user, 2–3 upcoming meetings, 2–3 recent/ended meetings, so the dashboard never demos empty
- [ ] CORS origins list includes both local and deployed frontend URLs
- [ ] Deployment target chosen for both services (e.g., frontend → Vercel, backend → Render/Railway) and persistent storage confirmed for SQLite
- [ ] README includes: tech stack, setup steps for both services, assumptions (no auth, no video), and any known limitations
- [ ] Manual end-to-end pass: create instant meeting → join it → schedule a meeting → confirm it appears in Upcoming → "end" a meeting → confirm it moves to Recent
- [ ] Responsive check at mobile/tablet/desktop breakpoints
- [ ] Confirm scope discipline: no WebRTC, no real login — time protected for polish instead

---

*End of design document. This document intentionally contains no code or pseudocode, per the review constraints — it is meant to be the artifact you'd walk an interviewer through before ever opening an editor.*
