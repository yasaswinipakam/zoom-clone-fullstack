# Zoom Clone Interview Preparation Guide

## Architecture in one minute

The frontend is a Next.js App Router application. Pages compose reusable components, React Query hooks manage server state, and `src/api` is the only HTTP boundary. The FastAPI backend uses router → service → repository → SQLAlchemy model layers. Routers stay HTTP-focused, services own meeting rules, and repositories own queries.

## Request and database flow

For New Meeting, the dashboard mutation calls `POST /api/v1/meetings`. FastAPI validates `MeetingCreate`, injects `MeetingService`, and the service generates a cryptographically random public code, chooses the correct lifecycle state, then asks `MeetingRepository` to flush and commits the transaction. SQLite stores the meeting and the response returns the public code used by the UI for navigation and invite links.

Upcoming and Recent calls use indexed `status` queries. The backend deliberately returns `{ items, total }`; the API client unwraps `items` for React components while retaining a forward-compatible server contract.

## Schema decisions

- `users` owns people; `meetings.host_id` is a foreign key, so meeting ownership is explicit.
- `participants` is separate from users to allow guest joins by link.
- `meeting_code` is the public unique identifier; numeric IDs remain internal.
- `participants.meeting_id` uses `ON DELETE CASCADE`; SQLAlchemy mirrors that relationship with `delete-orphan`.
- Composite indexes support host/status and meeting/status dashboard queries.
- Check constraints limit scheduled durations to 5–480 minutes.

## Meeting lifecycle

`SCHEDULED → ACTIVE → ENDED` is an explicit forward-only graph in `MeetingService`. Invalid transitions return `409`, timestamps are set exactly when the transition succeeds, and ended meetings reject new participants.

## Why optional auth is isolated

Authentication is a bonus, so it has its own router, service, repository, and schemas. Passwords are bcrypt hashes; login/signup return a short-lived JWT; `/auth/me` is protected by the bearer token. Mandatory assignment flows keep their seeded default-user fallback, preventing auth from becoming a dependency for evaluation.

## Key trade-offs to explain

- SQLite is appropriate for the assignment and is configured through `DATABASE_URL` to keep a PostgreSQL migration path.
- Meeting host identity is still sent in a request body for the assignment’s no-login mode; authenticated UI uses the logged-in user ID.
- Mute All is deliberately a lightweight client-side meeting-room control because real media signaling is out of scope; removal and end actions are persisted API operations.
