# Zoom Clone — Backend

REST API for a Zoom-style video conferencing platform, built as an SDE
Fullstack Assignment. The backend is feature-complete for Milestones 1–7.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | FastAPI (Python 3.12) |
| ORM | SQLAlchemy 2.0 (`Mapped[...]` / `mapped_column()`) |
| Migrations | Alembic |
| Database | SQLite (dev) — one-line change to PostgreSQL in prod |
| Validation | Pydantic v2 |
| Config | `pydantic-settings` (`.env` file) |
| Server | Uvicorn |

---

## Project Structure

```
backend/
├── app/
│   ├── main.py              # App factory: metadata, middleware, exception handlers,
│   │                        #   router mounting, lifecycle, /health
│   ├── dependencies.py      # Central DI providers (session → repo → service)
│   ├── core/
│   │   ├── config.py        # Settings (Pydantic BaseSettings) — canonical config
│   │   ├── settings.py      # Thin re-export of config.py
│   │   ├── constants.py     # Fixed, non-env constants (API prefix, code alphabet…)
│   │   ├── exceptions.py    # Domain exception hierarchy (NotFoundError, ConflictError…)
│   │   ├── logging_config.py# Structured logging via stdlib dictConfig
│   │   ├── logger.py        # get_logger(name) helper
│   │   └── middleware.py    # Correlation ID injection + request timing
│   ├── db/
│   │   ├── engine.py        # SQLAlchemy engine (SQLite / PostgreSQL)
│   │   ├── base.py          # Declarative Base for all ORM models
│   │   ├── session.py       # SessionLocal + get_db() generator dependency
│   │   ├── database.py      # Re-export aggregator (Base, engine, get_db)
│   │   └── migrations/      # Alembic migration environment + version scripts
│   ├── models/
│   │   ├── enums.py         # MeetingType, MeetingStatus, ParticipantStatus
│   │   ├── meeting.py       # Meeting ORM model (meetings table)
│   │   └── participant.py   # Participant ORM model (participants table)
│   ├── schemas/
│   │   ├── meeting.py       # MeetingCreate / Update / Response / ListResponse /
│   │   │                    #   StatusResponse
│   │   └── participant.py   # ParticipantBase / Create / Update / Response /
│   │                        #   ListResponse
│   ├── repositories/
│   │   ├── meeting_repository.py    # Meeting data-access (no business logic)
│   │   └── participant_repository.py# Participant data-access
│   ├── services/
│   │   ├── meeting_service.py       # Meeting business logic + lifecycle transitions
│   │   └── participant_service.py   # Participant business logic (join/leave rules)
│   ├── routers/
│   │   ├── meeting_router.py        # Meeting API endpoints (10 routes)
│   │   └── participant_router.py    # Participant API endpoints (4 routes)
│   └── utils/               # Pure utility helpers
├── scripts/
│   └── seed.py              # Idempotent database seed (host user + sample data)
├── tests/
│   ├── unit/
│   └── integration/
├── alembic.ini
├── requirements.txt
├── pyproject.toml
├── .env.example
└── README.md
```

---

## Setup Instructions

### 1. Prerequisites

- Python 3.12+
- `pip`

### 2. Create and activate a virtual environment

```bash
python3.12 -m venv .venv
source .venv/bin/activate      # macOS / Linux
# .venv\Scripts\activate       # Windows
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment variables

```bash
cp .env.example .env
```

The defaults work out of the box for local development (SQLite file
at `data/zoom_clone.db`).  Key variables:

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./data/zoom_clone.db` | SQLAlchemy connection string |
| `ENVIRONMENT` | `local` | Deployment environment label |
| `DEBUG` | `false` | Enable debug behaviour |
| `LOG_LEVEL` | `INFO` | Root log level |
| `CORS_ALLOW_ORIGINS` | `["http://localhost:3000", "http://127.0.0.1:3000"]` | Allowed browser origins |
| `AUTH_ENABLED` | `true` | Mount optional authentication endpoints |
| `JWT_SECRET_KEY` | development-only default | Replace before deployment |

### 5. Create the database schema

**Option A — Alembic (recommended, production-equivalent):**

```bash
alembic upgrade head
```

**Option B — Quick create-all (development only):**

```python
# From a Python REPL inside the backend/ directory:
from app.db.database import Base, engine
import app.models  # ensures all models are registered
Base.metadata.create_all(bind=engine)
```

### 6. Seed sample data

```bash
python scripts/seed.py
```

This inserts:
- A **default host user** (`id=1`, `host@example.com`) required because
  `meetings.host_id` is a FK that cannot be null.
- **3 sample meetings**: one instant + active, one scheduled, one ended.
- **5 sample participants** spread across the active and ended meetings.

The script is **idempotent** — safe to run multiple times.

### 7. Run the development server

```bash
uvicorn app.main:app --reload
```

The API is now available at `http://127.0.0.1:8000`.

---

## API Documentation

| URL | Description |
|---|---|
| `http://127.0.0.1:8000/docs` | Interactive Swagger UI |
| `http://127.0.0.1:8000/redoc` | ReDoc UI |
| `http://127.0.0.1:8000/openapi.json` | Raw OpenAPI schema |

---

## API Reference

All resource routes are prefixed `/api/v1`.

### Infrastructure

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness + DB connectivity check |

### Meetings

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/meetings` | Create an instant or scheduled meeting |
| GET | `/api/v1/meetings/upcoming` | List upcoming (SCHEDULED) meetings |
| GET | `/api/v1/meetings/recent` | List recently ended meetings |
| GET | `/api/v1/meetings/{id}` | Get a meeting by internal integer ID |
| GET | `/api/v1/meetings/code/{code}` | Get a meeting by its shareable code |
| PATCH | `/api/v1/meetings/{id}` | Partially update a meeting |
| DELETE | `/api/v1/meetings/{id}` | Delete a meeting (cascades participants) |
| POST | `/api/v1/meetings/{code}/start` | Start a scheduled meeting (→ ACTIVE) |
| POST | `/api/v1/meetings/{code}/end` | End an active meeting (→ ENDED) |
| GET | `/api/v1/meetings/{code}/status` | Get the current lifecycle status |

### Participants

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/meetings/{code}/participants` | Join a meeting |
| GET | `/api/v1/meetings/{code}/participants` | List participants (optional `?status=`) |
| POST | `/api/v1/meetings/{code}/participants/{id}/leave` | Voluntary leave (soft-remove) |
| DELETE | `/api/v1/meetings/{code}/participants/{id}` | Hard-remove a participant |

### Optional Authentication (bonus)

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/auth/signup` | Create a bcrypt-hashed local account and return JWT |
| POST | `/api/v1/auth/login` | Authenticate and return JWT |
| GET | `/api/v1/auth/me` | Validate bearer token and return current user |

### Meeting Lifecycle

```
SCHEDULED  ──(POST /start)──▶  ACTIVE  ──(POST /end)──▶  ENDED
```

Invalid transitions (e.g. `ENDED → ACTIVE`) return `409 Conflict`.

---

## Quick Smoke-Test

```bash
# 1. Health check
curl http://127.0.0.1:8000/health

# 2. Create an instant meeting (uses seed host_id=1)
curl -X POST http://127.0.0.1:8000/api/v1/meetings \
  -H "Content-Type: application/json" \
  -d '{"meeting_type": "INSTANT", "host_id": 1}'

# 3. Join the meeting (replace <code> with the returned meeting_code)
curl -X POST http://127.0.0.1:8000/api/v1/meetings/<code>/participants \
  -H "Content-Type: application/json" \
  -d '{"display_name": "Alice"}'

# 4. End the meeting
curl -X POST http://127.0.0.1:8000/api/v1/meetings/<code>/end

# 5. Check status
curl http://127.0.0.1:8000/api/v1/meetings/<code>/status
```

---

## Architecture Overview

The backend follows a strict 5-layer architecture governed by the
**Backend Engineering Constitution**:

```
Router  →  Service  →  Repository  →  Model / ORM
                ↘
           Domain Exceptions (core/exceptions.py)
                ↘
           Exception Handlers (main.py)  →  HTTP Response
```

- **Routers** — thin; parse input, call one service method, return response.
  No business logic, no SQLAlchemy.
- **Services** — own all business rules and lifecycle transitions. Raise
  typed domain exceptions (`NotFoundError`, `ConflictError`, `ValidationError`).
  Never import FastAPI.
- **Repositories** — own all SQLAlchemy queries. No business logic, no HTTP
  concerns. Flush but never commit (service layer owns transaction boundaries).
- **Models** — SQLAlchemy 2.0 declarative models. Structure only.
- **Schemas** — Pydantic v2 request/response contracts. Decoupled from ORM models.

---

## Design Decisions

| Decision | Rationale |
|---|---|
| SQLite → PostgreSQL migration path | `DATABASE_URL` env var; single-line config change |
| `meeting_code` not `id` in participant URLs | Avoids exposing internal PKs in invite links |
| Soft-delete for participant leave | Preserves join/leave history; hard-delete available for host ejection |
| `ParticipantStatus` independent of `MeetingStatus` | A participant can leave and rejoin while the meeting remains ACTIVE |
| `host_id` in request body | Preserves the assignment's no-login fallback; the optional auth UI supplies its authenticated user ID |
| Forward-only lifecycle graph (`dict[MeetingStatus, frozenset]`) | Enforced in exactly one place; O(1) lookup |

---

## Assumptions

- **Authentication is optional**: assignment flows keep working with the
  seeded host (`id=1`). When enabled, signup/login returns a JWT and the
  frontend uses the authenticated user ID as `host_id`.
- **Migrations**: `0001_initial_schema` creates the normalized tables and
  indexes; `0002_add_user_password_hash` safely enables the auth bonus.
- **SQLite for development**: production-equivalent with PostgreSQL via a
  one-line `DATABASE_URL` change.
