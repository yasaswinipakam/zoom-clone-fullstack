# Zoom Clone — Frontend Implementation Plan

**Status:** Planning only — no code, no components, no files generated.
**Source of truth:** Existing FastAPI backend (`backend/` — reviewed directly), `openapi.json`, Backend Engineering Constitution, Zoom Clone Engineering Design Document, Assignment Specification.
**Constraint honored:** No backend endpoints are redesigned, renamed, or invented. Every API call in this plan maps to a route that exists today in `app/routers/meeting_router.py` and `app/routers/participant_router.py`.

---

## 0. Backend Contract Summary (reference for every section below)

All resource routes are prefixed `/api/v1`. Base URL in dev: `http://127.0.0.1:8000`.

### Meetings

| Method | Path | Purpose | Notes |
|---|---|---|---|
| POST | `/api/v1/meetings` | Create instant or scheduled meeting | Body: `MeetingCreate` |
| GET | `/api/v1/meetings/upcoming` | List `SCHEDULED` meetings, soonest first | Query: `host_id?`, `limit?` |
| GET | `/api/v1/meetings/recent` | List `ENDED` meetings, most recent first | Query: `host_id?`, `limit?` |
| GET | `/api/v1/meetings/{meeting_id}` | Fetch by internal integer PK | |
| GET | `/api/v1/meetings/code/{meeting_code}` | Fetch by shareable code | Used for join-by-code / invite links |
| PATCH | `/api/v1/meetings/{meeting_id}` | Partial update, incl. lifecycle via `status` | |
| DELETE | `/api/v1/meetings/{meeting_id}` | Delete meeting (cascades participants) | 204 |
| POST | `/api/v1/meetings/{meeting_code}/start` | `SCHEDULED → ACTIVE` | |
| POST | `/api/v1/meetings/{meeting_code}/end` | `ACTIVE → ENDED` | |
| GET | `/api/v1/meetings/{meeting_code}/status` | Lightweight status poll | |

### Participants (scoped under a meeting's code)

| Method | Path | Purpose | Notes |
|---|---|---|---|
| POST | `/api/v1/meetings/{meeting_code}/participants` | Join meeting | Body: `{ display_name }` |
| GET | `/api/v1/meetings/{meeting_code}/participants` | List participants | Query: `status?` (`CONNECTED`/`DISCONNECTED`/`LEFT`) |
| POST | `/api/v1/meetings/{meeting_code}/participants/{participant_id}/leave` | Soft-remove (voluntary leave) | |
| DELETE | `/api/v1/meetings/{meeting_code}/participants/{participant_id}` | Hard-remove (host ejects) | 204 |

### Infrastructure

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness + DB probe (not under `/api/v1`) |

### Enums (shared vocabulary — must match backend `StrEnum` values exactly)

- `MeetingType`: `INSTANT` \| `SCHEDULED`
- `MeetingStatus`: `SCHEDULED` \| `ACTIVE` \| `ENDED` (forward-only transitions)
- `ParticipantStatus`: `CONNECTED` \| `DISCONNECTED` \| `LEFT`

### Error contract (applies to every endpoint)

All error responses share the shape `{ "error": string, "message": string }`:

| HTTP | `error` value | When |
|---|---|---|
| 400 | `validation_error` | Domain-level rule failure (e.g. `scheduled_at` in the past) |
| 404 | `not_found` | Meeting or participant does not exist |
| 409 | `conflict` | Invalid lifecycle transition, duplicate display name, meeting already ended |
| 422 | `validation_error` | Pydantic request-schema validation failure (different shape: `message` is FastAPI's error list) |
| 500 | `internal_server_error` | Unhandled server exception (generic message, never leaks internals) |

This single, predictable shape is what the frontend's API layer and error-boundary design are built around (Sections 8 and 9).

### Key domain facts that shape frontend design

- **No authentication exists yet.** `host_id` is a plain integer supplied by the client. The frontend must simulate a "current user" without a login screen (Section 5, "No-Auth Identity Strategy").
- **`meeting_code`, not `id`, is the public identifier.** All participant-facing URLs and invite links must use `meeting_code` (format `"847-2910-556"`, three groups of digits), never the internal integer `id`.
- **Instant meetings skip `SCHEDULED`.** They're created directly `ACTIVE`; the `/start` endpoint is only valid for scheduled meetings.
- **Participant leave is soft; host removal is hard.** These are two different endpoints and must not be conflated in the UI.
- **CORS default origin is `http://localhost:3000`.** The chosen dev tooling's port must either match this or the backend's `.env` must be updated — this plan flags it as a coordination point, not a backend change we're making unilaterally (Section 13, Risks).

---

## 1. Architecture Overview

**Frontend architecture:** A single-page application (SPA) using a component-driven, feature-folder architecture. The app is a thin, stateless client over the FastAPI backend — no business logic is duplicated client-side beyond what's needed for responsive form validation (which mirrors, but does not replace, the backend's authoritative validation).

**Data flow (unidirectional):**
```
User action → UI component → hook (React Query mutation/query)
  → Axios API client → FastAPI backend
  → response → React Query cache → component re-render
```
Errors flow back through the same path: Axios interceptor normalizes the `{error, message}` shape → React Query surfaces it as an error state → component renders inline or toast feedback. No global error store is needed; React Query's per-query/mutation error state is sufficient.

**Component hierarchy (top-down):** `App` → `Providers` (React Query, Router, Theme, Toast) → `Layout` (Navbar + content outlet) → `Page` components → feature components → primitive UI components. Detailed in Section 7.

**API integration strategy:** One typed API client module per backend resource (`meetingsApi`, `participantsApi`, `healthApi`), each a thin wrapper around a shared Axios instance. Every function's request/response types are derived from `openapi.json` (Section 9). No component calls Axios directly — all network access goes through React Query hooks that wrap these API modules.

**State management:** Split strictly by nature of the data (Section 8):
- **Server state** (meetings, participants) → React Query exclusively.
- **Global client state** (current display name, theme, in-call device settings) → a small number of React Context providers.
- **Local UI state** (modal open/closed, form field values, hover states) → component-local `useState`.

**Routing:** Client-side routing via React Router, with route params carrying `meetingCode` (never internal `id`), matching the backend's public-identifier convention. Detailed route table in Section 4.

---

## 2. Technology Stack

| Technology | Why it's the right choice here |
|---|---|
| **React** | Assignment's implied ecosystem (component reuse, Zoom's own web client is React-based); largest available library surface for the media/grid UI needed for a meeting room. |
| **TypeScript** | The backend has strict typed contracts (Pydantic schemas, `StrEnum`s, an OpenAPI spec). TypeScript lets those contracts be mirrored 1:1 as interfaces/types, so enum drift (e.g. mistyping `"Active"` vs `"ACTIVE"`) is caught at compile time instead of surfacing as a silent 422/409 at runtime. |
| **Vite** | Fast dev server and HMR; zero-config TypeScript + JSX; trivial proxy configuration to forward `/api/v1/*` to the FastAPI backend during development, sidestepping the CORS coordination noted in Section 0. |
| **Tailwind CSS** | Utility-first styling makes it fast to hand-build a UI that closely resembles Zoom's real interface (dense toolbars, exact spacing, a dark meeting-room theme) without fighting a component library's opinions. Pairs directly with the token-based design system in Section 11. |
| **React Query (TanStack Query)** | The backend is a classic REST CRUD + polling API (meeting status, participant list). React Query gives caching, background refetch, optimistic updates, and de-duplication for free — exactly the shape of "server state" this backend produces. Removes the need for a separate global store for anything server-derived. |
| **React Router** | Standard, well-understood SPA routing; supports the nested layouts and dynamic `:meetingCode` segments this app needs (Section 4) without extra dependencies. |
| **Axios** | Interceptors are used to centralize two cross-cutting concerns in one place: normalizing the backend's uniform `{error, message}` error shape (Section 0) into a typed `ApiError`, and (later) attaching a future auth header without touching every call site. |
| **React Hook Form** | Uncontrolled-by-default forms minimize re-renders in forms with many fields (Schedule Meeting has title, description, date, time, duration) and integrate directly with Zod resolvers. |
| **Zod** | Client-side schemas that mirror the backend's Pydantic validation rules (e.g. `duration_minutes` 5–480, `scheduled_at` must be future, `display_name` 1–100 chars) so invalid submissions are caught before a network round-trip, while the backend remains the actual source of truth. |
| **Lucide Icons** | Lightweight, tree-shakeable icon set with the mute/camera/screen-share/participants glyphs a Zoom-style toolbar needs, without shipping a full icon font. |

---

## 3. Folder Structure

```
frontend/
├── public/
├── src/
│   ├── main.tsx                    # Entry point: mounts <App/>, wraps providers
│   ├── App.tsx                     # Router outlet + top-level providers composition
│   │
│   ├── api/                        # One module per backend resource — the ONLY
│   │   │                           # layer allowed to import axios directly
│   │   ├── client.ts                # Axios instance: baseURL, interceptors, error normalization
│   │   ├── meetings.ts              # createMeeting, getMeetingById, getMeetingByCode,
│   │   │                           #   listUpcoming, listRecent, updateMeeting,
│   │   │                           #   deleteMeeting, startMeeting, endMeeting, getStatus
│   │   ├── participants.ts          # joinMeeting, listParticipants, leaveMeeting,
│   │   │                           #   removeParticipant
│   │   └── health.ts                # getHealth (used by a small connectivity indicator)
│   │
│   ├── types/                      # TypeScript types generated/derived from openapi.json
│   │   ├── meeting.ts                # MeetingResponse, MeetingCreate, MeetingUpdate, etc.
│   │   ├── participant.ts            # ParticipantResponse, ParticipantBase, etc.
│   │   ├── enums.ts                  # MeetingType, MeetingStatus, ParticipantStatus
│   │   └── api-error.ts              # ApiError shape matching backend's {error, message}
│   │
│   ├── hooks/                      # React Query hooks — the ONLY layer components
│   │   │                           # use to touch server state
│   │   ├── queries/
│   │   │   ├── useUpcomingMeetings.ts
│   │   │   ├── useRecentMeetings.ts
│   │   │   ├── useMeetingByCode.ts
│   │   │   ├── useMeetingStatus.ts        # polling hook, used inside the meeting room
│   │   │   └── useParticipants.ts         # polling hook, used inside the meeting room
│   │   └── mutations/
│   │       ├── useCreateMeeting.ts
│   │       ├── useUpdateMeeting.ts
│   │       ├── useDeleteMeeting.ts
│   │       ├── useStartMeeting.ts
│   │       ├── useEndMeeting.ts
│   │       ├── useJoinMeeting.ts
│   │       ├── useLeaveMeeting.ts
│   │       └── useRemoveParticipant.ts
│   │
│   ├── context/                    # Global client state (Section 8)
│   │   ├── CurrentUserContext.tsx    # display name + synthetic host_id persisted locally
│   │   ├── ThemeContext.tsx          # light/dark, defaults to Zoom-style dark meeting room
│   │   └── DeviceSettingsContext.tsx # mic/camera on-off preferences carried into a meeting
│   │
│   ├── routes/                     # One file per route; thin, compose page + layout
│   │   ├── index.tsx                  # "/" — Landing/Dashboard
│   │   ├── join.tsx                   # "/join"
│   │   ├── schedule.tsx               # "/schedule"
│   │   ├── meeting.$meetingCode.tsx   # "/meeting/:meetingCode"
│   │   └── not-found.tsx              # "*"
│   │
│   ├── pages/                      # Page-level components (composition only)
│   │   ├── DashboardPage/
│   │   ├── JoinMeetingPage/
│   │   ├── ScheduleMeetingPage/
│   │   ├── MeetingRoomPage/
│   │   └── NotFoundPage/
│   │
│   ├── components/
│   │   ├── layout/                    # Navbar, PageShell, Footer
│   │   ├── dashboard/                 # MeetingActionButtons, UpcomingList, RecentList,
│   │   │                             #   MeetingCard
│   │   ├── meeting-room/              # Header, ParticipantGrid, ParticipantTile,
│   │   │                             #   BottomToolbar, InviteDialog, ParticipantListPanel,
│   │   │                             #   HostControlsMenu
│   │   ├── forms/                     # ScheduleMeetingForm, JoinMeetingForm,
│   │   │                             #   DisplayNamePrompt
│   │   └── ui/                        # Button, Input, Modal, Toast, Skeleton, ErrorState,
│   │                                 #   EmptyState — pure, backend-agnostic primitives
│   │
│   ├── lib/
│   │   ├── meetingCode.ts             # format/validate the "847-2910-556" pattern client-side
│   │   ├── datetime.ts                # UTC ⇄ local conversions for scheduling
│   │   └── queryClient.ts             # React Query client instance + default options
│   │
│   ├── styles/
│   │   └── tokens.css                 # CSS custom properties (Section 11)
│   │
│   └── docs/
│       └── smoke-test-checklist.md    # Manual pass/fail checklist for the core flows (Section 12)
│
├── index.html
├── vite.config.ts                  # Includes /api proxy → http://127.0.0.1:8000 in dev
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

**Purpose of each top folder, briefly:**
- `api/` — isolates every place the app talks HTTP; nothing else may import `axios`.
- `types/` — single source of truth for shapes crossing the network boundary; kept in lockstep with `openapi.json`.
- `hooks/` — isolates server-state caching/mutation logic from UI; pages/components never call `api/` directly.
- `context/` — the small amount of state that is genuinely global and client-only.
- `routes/` vs `pages/` — routes are wiring (params, loaders, layout selection); pages are the actual screen composition. Splitting them keeps route files trivial to scan.
- `components/` — organized by feature area first (dashboard, meeting-room, forms), with a `ui/` folder for primitives with zero backend awareness — reusable in isolation and easy to unit test.
- `lib/` — pure functions with no React and no network dependency.

---

## 4. Application Routing

| Path | Page | Notes |
|---|---|---|
| `/` | `DashboardPage` | Landing dashboard: navbar, New/Join/Schedule buttons, Upcoming + Recent sections |
| `/join` | `JoinMeetingPage` | Enter meeting code or paste invite link + display name |
| `/schedule` | `ScheduleMeetingPage` | Schedule-meeting form |
| `/meeting/:meetingCode` | `MeetingRoomPage` | The live meeting room, keyed by the backend's public `meeting_code` |
| `*` | `NotFoundPage` | 404 |

**Design decisions:**
- The route param is named `meetingCode` (not `meetingId`) everywhere in the frontend to make it visually obvious, at every call site, which backend identifier is in play — internal integer `id` is never present in a URL.
- An **invite link** (`/meeting/847-2910-556`) and a **manually entered code** on `/join` resolve to the exact same route; `/join` exists only to give a friendly place to type/paste a code before navigating, and to run `GET /api/v1/meetings/code/{meeting_code}` as a validation step (per the assignment's "Validate meeting existence" requirement) prior to redirecting into `/meeting/:meetingCode`.
- **No separate pre-join lobby route.** Display name is captured directly on `/join` (for the join-by-code flow) or in a lightweight inline prompt at the top of `MeetingRoomPage` itself (for the New Meeting / invite-link flow), rather than as its own screen. `MeetingRoomPage` does not call `POST /participants` until a display name is confirmed, so the "enter display name before joining" requirement is still met — it's just handled as a gate inside the room page instead of a dedicated route, saving a screen and a navigation hop.
- Instant meeting creation (`New Meeting` button) does not get its own route — it calls `POST /api/v1/meetings` from the dashboard and redirects straight to `/meeting/:meetingCode` on success, per the assignment's "redirect user to meeting room" requirement.

---

## 5. Global Layout

**Navbar:** Logo/wordmark, profile avatar placeholder (per assignment: "profile/settings placeholders", no real auth), settings icon placeholder. Persistent across all routes except the meeting room, which uses its own minimal in-call header (Section 7) to maximize video real estate — matching Zoom's real UX pattern.

**Sidebar:** None on the dashboard (Zoom's own web dashboard is single-column with a top nav). Inside the meeting room, a collapsible right-hand **panel** (not a persistent sidebar) toggles between Participants and Chat-placeholder views — this matches Zoom's actual interaction model more closely than a permanent sidebar.

**Footer:** Minimal, dashboard-only (copyright/version placeholder). Omitted from the meeting room.

**Providers (composed in `App.tsx`, outside-in):**
1. `QueryClientProvider` (React Query)
2. `CurrentUserProvider` (Section 8)
3. `ThemeProvider`
4. `ToastProvider`
5. `RouterProvider` / `BrowserRouter`

**Theme:** Defaults to a dark, Zoom-style theme for the meeting room and a light/neutral theme for the dashboard — mirroring Zoom's actual product (light marketing/dashboard chrome, dark call surface). Theme tokens are defined once (Section 11) and consumed by both.

**No-Auth Identity Strategy (ties Navbar + global state together):** Since the backend has no auth and expects a raw `host_id` integer, the frontend maintains a `CurrentUserContext` that:
- Generates a stable synthetic `host_id` (default `1`, matching the backend's seeded default host) on first load and persists it in `localStorage`.
- Captures and persists a `display_name` the first time it's needed (schedule/create/join flow), pre-filling it on subsequent visits.
- Is explicitly documented in-code and in the README as a placeholder for a future auth milestone — consistent with how the backend's own README frames `host_id`.

**Loading UI:** Skeleton components (`ui/Skeleton`) matching the shape of the content being fetched (meeting cards, participant tiles) rather than a generic spinner — used for every React Query loading state.

**Error UI:** A shared `ErrorState` component that reads the normalized `ApiError` (Section 9) and renders backend-message-driven text (e.g. "Meeting not found" from a 404) with a retry action where retrying makes sense (query errors) and no retry where it doesn't (409 conflicts — e.g. "This meeting has already ended").

**404 Page:** Simple, on-brand not-found screen with a link back to the dashboard.

---

## 6. Pages

| Page | Backend calls it makes | Core responsibility |
|---|---|---|
| **Landing / Dashboard** | `GET /meetings/upcoming`, `GET /meetings/recent` | Entry point; surfaces the three primary actions + both meeting lists |
| **Create Meeting** (no dedicated page — see Section 4) | `POST /meetings` | Instant creation, immediate redirect |
| **Join Meeting** | `GET /meetings/code/{code}` (validation), captures display name, then navigates straight to Meeting Room | Accepts code or full invite URL, extracts the code, validates existence, collects the display name in one screen — no separate lobby |
| **Schedule Meeting** | `POST /meetings` (`meeting_type: SCHEDULED`) | Form-driven creation; on success, redirects to dashboard with the new meeting visible in Upcoming |
| **Meeting Room** | `GET /meetings/{code}/status` (checked on mount before joining), `POST /participants` (on entry, after display name is confirmed), `GET /participants` (polled), `GET /meetings/{code}/status` (polled), `POST /participants/{id}/leave` (on exit), `POST /meetings/{code}/end` (host only), `DELETE /participants/{id}` (host removing someone) | The core in-call experience. If arriving without a display name already known (e.g. a direct invite-link visit), shows a brief inline name prompt before calling `POST /participants` — no dedicated lobby route |
| **404** | none | Fallback |
| **Loading** | n/a — implemented as per-query skeleton states, not a standalone route | Consistent, contextual loading, not a full-page spinner |
| **Error** | n/a — implemented as a reusable component, not a standalone route | Consistent error presentation across pages |

---

## 7. Component Hierarchy

### Dashboard
```
DashboardPage
├── Navbar
├── MeetingActionButtons        (New Meeting / Join Meeting / Schedule Meeting)
├── UpcomingMeetingsSection
│   └── MeetingCard[]            (title, scheduled_at, host, "Start" action → POST /start)
└── RecentMeetingsSection
    └── MeetingCard[]            (title, ended_at, duration — read-only)
```

### Schedule Meeting
```
ScheduleMeetingPage
├── Navbar
└── ScheduleMeetingForm
    ├── TitleField
    ├── DescriptionField
    ├── DateTimePicker             (produces UTC scheduled_at)
    ├── DurationSelect              (5–480 min, mirrors backend bound)
    └── SubmitButton                (loading/disabled during mutation)
```

### Join Meeting
```
JoinMeetingPage
├── Navbar
└── JoinMeetingForm
    ├── MeetingCodeOrLinkInput      (parses either a raw code or a pasted invite URL)
    ├── DisplayNameInput
    └── SubmitButton                 (→ validates via GET /meetings/code/{code}, then navigates)
```

### Meeting Room (the deepest hierarchy — matches assignment's own example)
```
MeetingRoomPage
├── MeetingRoomHeader
│   ├── MeetingTitleAndCode
│   ├── MeetingDuration               (elapsed time since started_at, recomputed on each status poll — not a live ticking clock, kept simple)
│   └── ConnectionStatusIndicator     (from useHealth or polling failures)
├── ParticipantGrid
│   └── ParticipantTile[]
│       ├── VideoPlaceholder          (no real WebRTC in scope — visual placeholder tile)
│       ├── DisplayNameLabel
│       ├── HostBadge                 (shown when is_host)
│       └── ConnectionStateIcon        (CONNECTED / DISCONNECTED)
├── BottomToolbar
│   ├── MicToggleButton               (local-only UI state, Section 8)
│   ├── CameraToggleButton            (local-only UI state)
│   ├── ParticipantsButton             (opens ParticipantListPanel, shows count)
│   ├── InviteButton                   (opens InviteDialog)
│   ├── HostControlsMenu               (host only: "End meeting for all" → POST /end. No "Mute all" — the backend has no endpoint for it, so it is deliberately not built)
│   └── LeaveButton                    (→ POST /participants/{id}/leave, then navigate to dashboard)
├── ParticipantListPanel               (slide-in panel)
│   └── ParticipantListItem[]
│       └── RemoveParticipantAction     (host only → DELETE /participants/{id})
└── InviteDialog
    ├── MeetingCodeDisplay
    ├── InviteLinkDisplay
    └── CopyToClipboardButton
```

**Reuse notes:** `MeetingCard` is shared between Upcoming and Recent sections with a `variant` prop controlling which action (Start vs. read-only) is shown. `ParticipantTile` and `ParticipantListItem` both consume `ParticipantResponse` but render it differently (grid tile vs. list row) — kept as two components rather than one over-parameterized component, per single-responsibility.

---

## 8. State Management

| State | Owner | Examples |
|---|---|---|
| **Server state** | React Query, exclusively | Meeting list, meeting detail, participant list, meeting status. Never duplicated into Context or component state beyond what a query's `select` transform needs. |
| **Global client state** | React Context | Current synthetic user (`host_id` + `display_name`), theme, device toggle preferences (mic/camera) carried across the join → room transition. |
| **Local state** | Component `useState` | Modal/panel open-closed, form field values pre-submit (owned by React Hook Form), hover/focus UI states, client-side pagination/filter selections on a list. |

**React Query responsibilities:**
- Owns all caching, background refetching, and de-duplication for meetings and participants.
- **Polling:** `useMeetingStatus` and `useParticipants` use `refetchInterval` of **5 seconds** while the Meeting Room is mounted, since the backend has no WebSocket/streaming endpoint — this is a deliberate, documented trade-off (Section 13, Risks) given the backend's REST-only, polling-friendly design (`GET /status` is explicitly built "for polling current state," per the backend's own route description). 5s (rather than a more aggressive 2–3s) is chosen deliberately: the dev/demo backend runs on SQLite, and a 5s interval keeps read load low with no noticeable UX cost for a meeting-status/participant-list use case that isn't latency-sensitive.
- **Optimistic updates:** used narrowly, e.g. the Leave button can optimistically remove the current participant tile before the `leave` mutation resolves, rolling back on error.
- **Cache invalidation:** creating/starting/ending a meeting invalidates the `upcoming`/`recent` list queries; joining/leaving/removing a participant invalidates the `participants` list query for that `meetingCode`.

**Context responsibilities:**
- `CurrentUserContext`: read/write the synthetic `host_id` + `display_name`, persisted to `localStorage`, exposed via a `useCurrentUser()` hook.
- `ThemeContext`: light/dark toggle, though the meeting room forces dark regardless of the global preference (matches real Zoom behavior).
- `DeviceSettingsContext`: mic/camera toggle state, since the assignment scope does not include real WebRTC — these toggles are UI-only preferences, not device permissions, and are explicitly scoped as such.

**What deliberately does *not* get a global store:** anything about a specific meeting or participant record — that always flows through React Query, keyed by `meetingCode`, so there is exactly one cache entry per meeting rather than parallel copies drifting out of sync between the dashboard and the room.

---

## 9. API Layer

One hook per backend operation, each a thin wrapper around the matching `api/*.ts` function. This table is the direct fulfillment of "map every backend endpoint to frontend hooks":

| Backend endpoint | `api/` function | Hook |
|---|---|---|
| `POST /meetings` | `meetingsApi.createMeeting(payload)` | `useCreateMeeting()` (mutation) |
| `GET /meetings/upcoming` | `meetingsApi.listUpcoming(params)` | `useUpcomingMeetings(params)` (query) |
| `GET /meetings/recent` | `meetingsApi.listRecent(params)` | `useRecentMeetings(params)` (query) |
| `GET /meetings/{id}` | `meetingsApi.getMeetingById(id)` | `useMeetingById(id)` (query) |
| `GET /meetings/code/{code}` | `meetingsApi.getMeetingByCode(code)` | `useMeetingByCode(code)` (query) |
| `PATCH /meetings/{id}` | `meetingsApi.updateMeeting(id, payload)` | `useUpdateMeeting()` (mutation) |
| `DELETE /meetings/{id}` | `meetingsApi.deleteMeeting(id)` | `useDeleteMeeting()` (mutation) |
| `POST /meetings/{code}/start` | `meetingsApi.startMeeting(code)` | `useStartMeeting()` (mutation) |
| `POST /meetings/{code}/end` | `meetingsApi.endMeeting(code)` | `useEndMeeting()` (mutation) |
| `GET /meetings/{code}/status` | `meetingsApi.getStatus(code)` | `useMeetingStatus(code)` (polling query) |
| `POST /meetings/{code}/participants` | `participantsApi.joinMeeting(code, payload)` | `useJoinMeeting()` (mutation) |
| `GET /meetings/{code}/participants` | `participantsApi.listParticipants(code, status?)` | `useParticipants(code, status?)` (polling query) |
| `POST /meetings/{code}/participants/{id}/leave` | `participantsApi.leaveMeeting(code, id)` | `useLeaveMeeting()` (mutation) |
| `DELETE /meetings/{code}/participants/{id}` | `participantsApi.removeParticipant(code, id)` | `useRemoveParticipant()` (mutation) |
| `GET /health` | `healthApi.getHealth()` | `useHealth()` (low-frequency background query, powers `ConnectionStatusIndicator`) |

**Axios instance (`api/client.ts`) responsibilities:**
- `baseURL` from an environment variable (`VITE_API_BASE_URL`), defaulting to the Vite dev proxy path so no hardcoded `http://127.0.0.1:8000` ships to production.
- A response interceptor that catches any non-2xx response, reads the backend's `{error, message}` body, and throws a typed `ApiError { kind: 'not_found' | 'conflict' | 'validation_error' | 'internal_server_error', message: string, status: number }` — this is the single place backend error shape knowledge lives, so every hook and component downstream deals with one consistent type regardless of which endpoint failed.
- No retry logic at the Axios layer — retries are React Query's job, configured per-query (Section 8), since not all failures should retry (e.g. a 409 conflict should never blindly retry).

**Type generation:** `types/*.ts` are hand-authored to mirror `openapi.json` exactly (field names, optionality, enum values) at project setup, then spot-checked against the spec whenever a backend schema changes — since the backend is described as complete/stable for this milestone, this is a one-time alignment pass rather than an ongoing codegen pipeline, keeping the toolchain simpler for the assignment's scope.

---

## 10. Forms

| Form | Fields | Zod rules (mirroring backend) | Notes |
|---|---|---|---|
| **Schedule Meeting** | `title`, `description?`, `scheduled_at` (date + time), `duration_minutes` | `title`: required, ≤200 chars. `scheduled_at`: required, must resolve to a future UTC instant. `duration_minutes`: required, integer, 5–480. | Date + time captured as two UI fields, combined into a single UTC ISO string before submission — backend expects one `scheduled_at` datetime. |
| **Join Meeting** | `meetingCodeOrLink`, `display_name` | `meetingCodeOrLink`: required; parsed against the `NNN-NNNN-NNN` pattern or a full URL containing it. `display_name`: required, 1–100 chars. | Code format validated client-side via `lib/meetingCode.ts` before ever calling the API, but the backend's `GET /meetings/code/{code}` 404 remains the authoritative existence check. |
| **Inline Display Name Prompt** (reused component, shown inside `MeetingRoomPage` only when arriving via a direct invite link without a known name) | `display_name` | Required, 1–100 chars (matches `ParticipantBase.display_name`). | Same field/validation as the Join Meeting form's `display_name`; pre-filled from `CurrentUserContext` if previously set. Not a separate route or page. |

**Validation strategy:** Zod schemas colocated with each form, resolved via `@hookform/resolvers/zod`. Client-side validation is a UX optimization only — the backend remains authoritative, so every mutation hook still handles 400/409/422 responses explicitly rather than assuming client validation makes them impossible (e.g. a race where `scheduled_at` was valid when typed but has since passed).

**Error messages:** Field-level errors from Zod render inline, under each field, in plain language ("Duration must be between 5 and 480 minutes"). Submission-level errors from the backend (e.g. a 409 duplicate display name on join) render as a single form-level banner, since they aren't tied to one field.

**Loading states:** Submit buttons show a spinner + disabled state driven directly by the mutation's `isPending`, preventing double-submission (relevant for `createMeeting` and `joinMeeting`, where a double click could otherwise attempt to create two meetings or two duplicate participants).

**Success states:** `createMeeting` and `joinMeeting` navigate immediately on success (no separate success screen, matching Zoom's own "just take me there" UX). `scheduleMeeting` shows a brief success toast before navigating back to the dashboard, since the user isn't entering that meeting immediately.

---

## 11. Styling System

**Design intent:** Visually and functionally resemble Zoom's actual product (per assignment requirement) while remaining an original implementation — not a pixel-for-pixel asset trace. Achieved through Zoom's real structural patterns (dense top toolbar, blue primary action color in the light dashboard, near-black in-call surface, rounded video tiles) rather than copied assets or literal Zoom branding/logos.

**Typography:** A clean, high-legibility sans-serif for UI chrome (system font stack or a single self-hosted face — e.g. Inter — to avoid FOUC and keep the bundle light), with a clear, restrained type scale (e.g. 12/14/16/20/24/32px) — Zoom's own UI is information-dense, not typographically expressive, so the type system should stay quiet and get out of the way.

**Spacing:** A 4px base unit scale (4/8/12/16/24/32/48) applied consistently via Tailwind's spacing scale, matching the tight, toolbar-dense rhythm of the real product.

**Colors (token system, defined once in `styles/tokens.css` as CSS custom properties, consumed by Tailwind config):**
- `--color-primary` — a Zoom-like blue for primary actions on the light dashboard.
- `--color-surface` / `--color-surface-dark` — light dashboard background vs. near-black meeting-room background.
- `--color-danger` — leave/end/remove actions.
- `--color-success` — connected/active status indicators.
- `--color-warning` — disconnected/reconnecting status indicators.
- `--color-border`, `--color-text-primary`, `--color-text-secondary` — neutral scale for both themes.

**Dark theme:** The meeting room is dark-first (not just a toggled variant) since that's how the real product behaves; the dashboard defaults light. Both pull from the same token file so there is one definition of "danger red," not two.

**Responsive breakpoints:** Mobile (`<640px`), tablet (`640–1024px`), desktop (`>1024px`), using Tailwind's default breakpoint scale. The participant grid is the component most sensitive to this — 1 column on mobile, 2 on tablet, adaptive grid (2–4+ columns) on desktop, matching how Zoom's own grid reflows.

**Animation strategy:** Deliberately restrained — used for state transitions that carry real meaning (a participant tile entering/leaving the grid, the participant panel sliding in/out, a toast appearing) rather than decorative motion. `prefers-reduced-motion` is respected throughout.

---

## 12. Design System (Component Library)

**Why this is its own section, and why it's built before feature pages:** Every page in Sections 6–7 reuses the same handful of primitives (buttons, cards, inputs, dialogs). Building those primitives once, early, with their full set of variants/states — rather than discovering their variants ad hoc while building the Dashboard, then again while building the Meeting Room — is what keeps the UI visually and behaviorally consistent as the app grows. This is a deliberate companion to the `styles/tokens.css` token system in Section 11: tokens define the *values* (a color, a spacing unit); the design system defines the *components* that consume those values consistently.

**Primitives built once in `components/ui/`, each with its full variant set defined up front:**

| Primitive | Variants / states to define up front |
|---|---|
| **Button** | `primary` / `secondary` / `danger` / `ghost`; `sm` / `md` / `lg`; `default` / `loading` / `disabled`; optional leading icon slot |
| **Card** | Base surface (used by `MeetingCard` and any future card use); consistent padding, radius, and hover/focus treatment |
| **Input** (text, textarea, select) | `default` / `focus` / `error` / `disabled`; label + helper-text + error-text slots shared across every form field in Section 10 |
| **Dialog / Modal** | Base overlay + panel used by both `InviteDialog` and any confirmation dialogs (e.g. "End meeting for everyone?"); consistent open/close animation and focus-trap behavior |
| **Toast** | `success` / `error` / `info` variants, used by every mutation's success/error feedback |
| **Badge** | Used for `HostBadge` and connection-state indicators (`CONNECTED` / `DISCONNECTED` / `LEFT`) |
| **Skeleton** | A small set of shapes (text line, card, avatar/tile) composed to build every page's loading state, rather than one bespoke skeleton per page |
| **EmptyState / ErrorState** | Already specified in Section 5; formalized here as reusable primitives with an icon + message + optional action slot |

**Typography, Spacing, Colors, Icons:** These are not separate deliverables from the primitives above — they are the *inputs* the primitives are built from, per Section 11's token system. A Button's padding comes from the spacing scale; its colors come from the color tokens; its label uses the type scale; its optional icon comes from the shared Lucide set. No primitive hardcodes a one-off value outside the token system.

**Build rule:** No feature component (Section 7) is built by styling raw HTML elements directly — it composes these primitives. If a feature needs a visual treatment the design system doesn't yet support, the primitive is extended first, in `components/ui/`, not worked around locally in the feature component. This rule is also codified as an enforceable rule in the **Frontend Engineering Constitution** (see the companion document delivered alongside this plan).

---

## 13. Project Build Order

**Milestone 1 — Project Setup**
Vite + React + TypeScript scaffold; Tailwind configured with the token system; ESLint/Prettier; React Router, React Query, Axios, Zod, React Hook Form installed and wired into `App.tsx`; Vite dev proxy configured to the backend; `types/` hand-authored from `openapi.json`; `api/client.ts` with interceptor in place.

**Milestone 2 — Design System (Component Library)**
Build every primitive in Section 12 (`Button`, `Card`, `Input`, `Dialog`, `Toast`, `Badge`, `Skeleton`, `EmptyState`/`ErrorState`) against the token system from Section 11, in isolation from any feature page. This is deliberately sequenced right after project setup and before any real page, so every subsequent milestone consumes finished primitives instead of inventing one-off styling.

**Milestone 3 — Global Layout & Landing Page**
Navbar, theme provider, `CurrentUserContext`, routing skeleton with all routes stubbed; Dashboard page static shell (no live data yet, built entirely from Milestone 2's primitives) matching the assignment's "clean professional Zoom UI" requirement.

**Milestone 4 — Dashboard Data Integration**
Wire `useUpcomingMeetings` / `useRecentMeetings`; `MeetingCard` component; loading skeletons and empty states for both sections.

**Milestone 5 — Instant Meeting + Join Meeting**
"New Meeting" button → `useCreateMeeting` → redirect flow; `/join` page with code/link parsing, `useMeetingByCode` validation, and display-name capture in the same screen (no separate lobby).

**Milestone 6 — Schedule Meeting**
`ScheduleMeetingForm` with Zod validation; `useCreateMeeting` (scheduled variant); success flow back to dashboard; confirms newly scheduled meeting appears in Upcoming.

**Milestone 7 — Meeting Room Core**
Room layout, `ParticipantGrid`/`ParticipantTile`, `BottomToolbar` (UI-only device toggles), inline display-name gate for direct invite-link arrivals, `useJoinMeeting` on mount, `useParticipants` polling (5s interval), `useLeaveMeeting` on exit.

**Milestone 8 — Meeting Room Host Controls & Lifecycle**
`useStartMeeting` wired to the dashboard's "Start" action on upcoming cards; `useEndMeeting` wired to the host-only "End meeting" control; `useRemoveParticipant` wired to the participant panel (no "Mute all" — not built, since the backend has no supporting endpoint); `InviteDialog` with copy-to-clipboard; `useMeetingStatus` polling drives room-level state (e.g. redirect everyone out if status flips to `ENDED`).

**Milestone 9 — Error, Loading, Empty States & Responsive Pass**
Systematic pass across every page using the Milestone 2 primitives: skeletons, `ErrorState`, `EmptyState`, 404 page, toast wiring for all mutations, focus/keyboard accessibility check, plus mobile/tablet layouts for dashboard and meeting room (participant grid and bottom toolbar are the components most sensitive to this, per Section 11).

**Milestone 10 — Production Polish → Deployment → README → Screenshots**
A single closing milestone covering everything needed to submit, in sequence:
1. **Production polish** — a final visual/UX pass (spacing, empty edge cases, copy review) plus a manual smoke-test checklist run through the core flows (create → room, join → room, schedule → dashboard, host end meeting, participant leave, participant removal) rather than an automated test suite — appropriately scoped for the assignment's one-day timeline.
2. **Deployment** — production build; `VITE_API_BASE_URL` wired via environment variable against the deployed backend; deploy to the chosen host (Vercel/Netlify/Render/Railway per assignment options); final CORS coordination check against the deployed backend's `CORS_ALLOW_ORIGINS`.
3. **README** — setup instructions, tech stack, assumptions (mirroring the backend's own README structure), and the deployed app + repo links required by the assignment's submission section.
4. **Screenshots** — a small set capturing the dashboard, schedule flow, and meeting room, for the README and/or submission notes.

---

## 14. Risks

**Implementation risks**
- **Polling-based "real-time" is not real-time.** Without a WebSocket/SSE endpoint on the backend, participant-list and meeting-status updates are only as fresh as the polling interval. This is a scoped, documented trade-off, not a gap to silently paper over — worth stating plainly in the interview.
- **No real WebRTC in scope.** `ParticipantTile` is a placeholder, not a live video feed. This matches the assignment's actual requirements (which describe meeting management, not media transport) but should be called out explicitly so it isn't mistaken for an oversight.
- **Client-side "current user" is not a security boundary.** Anyone can set any `host_id`/`display_name` in `localStorage` and act as a host. This mirrors the backend's own current trust model (host_id accepted as a plain body field) and is explicitly out of scope until an auth milestone lands on both sides.

**Dependency risks**
- **CORS coordination.** The backend's default `CORS_ALLOW_ORIGINS` is `["http://localhost:3000"]`. If Vite's default port (5173) is used without either a dev proxy or an updated backend `.env`, local development breaks on the very first API call. The plan mitigates this with the Vite proxy (Milestone 1) rather than requiring a backend change.
- **Enum/contract drift.** Because enums are hand-mirrored in TypeScript rather than codegen'd, any future backend enum change (e.g. adding a `ParticipantStatus`) requires a manual, disciplined update on the frontend side — flagged as a process risk, not a blocker.

**Performance risks**
- **Polling frequency vs. server load.** A 5s `refetchInterval` on `useParticipants`/`useMeetingStatus` across many open meeting-room tabs is chosen specifically to keep load low against the SQLite-backed dev/demo backend, with no noticeable UX cost for this use case; tightening it later would need to be weighed against real backend load, not defaulted to a more aggressive interval.
- **Participant grid re-render cost.** A naive implementation re-renders every tile on every poll tick; mitigated by keying tiles on `participant.id` and memoizing `ParticipantTile`.

**Maintainability risks**
- **Divergence between hand-written types and `openapi.json`.** Without codegen, a schema change on the backend could silently desync from the frontend's types until a runtime 422 surfaces it. Documented as an explicit "re-check `types/` against `openapi.json`" step whenever backend schemas change.
- **Feature-folder discipline.** As `components/meeting-room/` grows, there's a risk of it becoming a dumping ground; the plan's component hierarchy (Section 7) and the design-system build rule (Section 12) are intended as the enforced shape, not just a starting point — this is also why the companion Frontend Engineering Constitution exists (see below).
- **No automated regression safety net.** Skipping unit/integration tests (Section 13, Milestone 10) in favor of manual smoke testing is the right trade-off for a one-day assignment timeline, but it means later changes rely on the smoke-test checklist being run by hand and thoroughly — worth naming explicitly as a conscious scope decision, not an oversight.

---

## 15. Deliverables

After full implementation, the frontend will provide:

- A reusable design-system component library (Button, Card, Input, Dialog, Toast, Badge, Skeleton, EmptyState/ErrorState) built once and consumed by every page, per Section 12.
- A Zoom-styled landing dashboard with Upcoming and Recent meeting sections, live-wired to the backend.
- Instant meeting creation with immediate redirect into a meeting room, backed by `POST /meetings`.
- Join-by-code and join-by-invite-link flows with existence validation and inline display-name capture — no separate lobby screen — backed by `GET /meetings/code/{code}`.
- A full scheduled-meeting creation flow with client-side validation mirroring backend constraints, backed by `POST /meetings`.
- A meeting room UI with a responsive participant grid, host/duration/status display, and a Zoom-style bottom toolbar (mic/camera UI toggles, participants panel, invite dialog, leave/end controls).
- Host-only controls limited to what the backend actually supports: starting a scheduled meeting, ending a meeting for everyone, and removing a specific participant — wired to `POST /start`, `POST /end`, and `DELETE /participants/{id}` respectively.
- Participant self-service leave, wired to `POST /participants/{id}/leave`.
- Live-polling (5s interval) participant list and meeting status inside the room.
- Consistent, backend-driven error handling and empty/loading states across every page, built from the shared design system.
- A responsive layout functional across mobile, tablet, and desktop breakpoints.
- A cohesive, original visual design system (color, type, spacing tokens + the component library) that reads as a modern Zoom-style product without reusing Zoom's actual assets or branding.
- A manual smoke-test checklist covering the core flows, run before submission.
- A deployed, publicly accessible build, configured against the deployed backend via environment variables, with a README and submission screenshots.
- A companion **Frontend Engineering Constitution** governing how the codebase stays consistent as it's built (delivered as a separate document — see below).

