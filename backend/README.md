# Zoom Clone — Backend

Backend API for the Zoom-style video conferencing platform (SDE Fullstack
Assignment). This repository's engineering rules are governed by the
**Backend Engineering Constitution**; feature scope is governed by the
**Assignment Specification** and the **Engineering Design Document**.

> **Milestone 1 status:** infrastructure only. No models, schemas,
> repositories, services, routers, or business logic exist yet. The only
> live endpoint is `/health`.

## Tech Stack

- **Framework:** FastAPI (Python 3.12)
- **ORM:** SQLAlchemy 2.0 (2.0-style `Mapped[...]` / `mapped_column(...)`)
- **Migrations:** Alembic
- **Database:** SQLite (`app/db/session.py` abstracts the connection so a
  future move to PostgreSQL is a one-line config change)
- **Validation/Config:** Pydantic v2 / `pydantic-settings`
- **Server:** Uvicorn

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app: metadata, middleware, exception
│   │                         # handlers, router mounting, lifecycle, /health
│   ├── dependencies.py      # Central DI providers (DB session for now)
│   ├── core/
│   │   ├── config.py        # Settings (Pydantic BaseSettings) — canonical
│   │   ├── settings.py      # Thin re-export of config.py's settings
│   │   ├── constants.py     # Fixed, non-env constants
│   │   ├── logging_config.py# Logging setup (stdlib dictConfig)
│   │   ├── logger.py        # get_logger(name) helper
│   │   └── middleware.py    # Correlation ID + request logging/timing
│   ├── db/
│   │   ├── engine.py        # SQLAlchemy engine
│   │   ├── base.py          # Declarative Base for future ORM models
│   │   ├── session.py       # SessionLocal + get_db() dependency
│   │   ├── database.py      # Re-export aggregator of the three above
│   │   └── migrations/      # Alembic env (no migrations yet)
│   ├── models/               # Empty — ORM models (next milestone)
│   ├── schemas/               # Empty — Pydantic contracts (next milestone)
│   ├── repositories/          # Empty — data access (next milestone)
│   ├── services/               # Empty — business logic (next milestone)
│   ├── routers/                 # Empty — HTTP routes (next milestone)
│   └── utils/                    # Empty — pure helpers (next milestone)
├── tests/
│   ├── unit/
│   └── integration/
├── alembic.ini
├── requirements.txt
├── pyproject.toml
├── .env.example
└── README.md
```

## Setup Instructions

1. **Create and activate a virtual environment**
   ```bash
   python3.12 -m venv .venv
   source .venv/bin/activate
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   The defaults work out of the box for local development (SQLite file
   in the project root).

4. **Verify the Alembic connection** (no migrations exist yet in
   Milestone 1 — this only confirms the DB connection resolves)
   ```bash
   alembic current
   ```

5. **Run the server**
   ```bash
   uvicorn app.main:app --reload
   ```

6. **Verify it's alive**
   ```bash
   curl http://127.0.0.1:8000/health
   # {"status": "ok", "version": "0.1.0"}
   ```
   Interactive API docs: http://127.0.0.1:8000/docs

## Assumptions (Milestone 1)

- No authentication exists yet, per the Assignment Specification's
  "No Login Required" note — a default user will be seeded in a later
  milestone once `models/user.py` exists.
- No domain models, business rules, or endpoints beyond `/health` are
  included in this milestone by design — see the Backend Engineering
  Constitution, Section 23, Rule 17 ("generate one feature at a time").
- `core/exceptions.py` is deliberately not yet created; only
  framework-level exception handlers (validation errors, unhandled
  exceptions) are registered in `main.py`. Domain exception classes are
  added alongside the first feature that needs them.

## API Overview

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness check |
| GET | `/docs` | Swagger UI |
| GET | `/redoc` | ReDoc UI |

Future resource routers will be mounted under `/api/v1` (see
`app/core/constants.py::API_V1_PREFIX`), per Constitution Section 5.8.
