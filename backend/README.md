# Zoom Clone — Backend

## Project Overview

FastAPI backend for the Zoom Clone SDE Fullstack Assignment. This backend
serves as the API layer for a Next.js frontend, providing instant meeting
creation, scheduled meetings, and participant management. This README
reflects **Sprint 1 (project initialization) only** — the layered
architecture (models, schemas, repositories, services, routers) will be
added in subsequent sprints per the Backend Engineering Constitution and
the Engineering Design Document.

## Technology Stack

- **Language:** Python 3.12
- **Framework:** FastAPI
- **ORM:** SQLAlchemy (planned, not yet wired up)
- **Migrations:** Alembic (planned, not yet wired up)
- **Validation/Settings:** Pydantic / pydantic-settings (planned)
- **Database:** SQLite
- **Formatting/Linting:** black, ruff

## Folder Structure

```
backend/
├── app/
│   ├── __init__.py
│   └── main.py            # FastAPI app instance, health endpoint,
│                           # registration placeholders
├── requirements.txt        # Pinned Python dependencies
├── pyproject.toml          # Project metadata + black/ruff config
├── .gitignore
├── .env.example            # Documented environment variables
└── README.md
```

## Development Setup

1. Ensure Python 3.12 is installed.
2. Create and activate a virtual environment:
   ```
   python3.12 -m venv .venv
   source .venv/bin/activate
   ```
3. Copy the environment template:
   ```
   cp .env.example .env
   ```

## Installation

Install dependencies from `requirements.txt`:

```
pip install -r requirements.txt
```

## Run Instructions

Start the development server from the `backend/` directory:

```
uvicorn app.main:app --reload
```

- API root: `http://localhost:8000`
- Interactive docs (Swagger UI): `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

## Development Workflow

1. Format code before committing: `black .`
2. Lint code before committing: `ruff check .`
3. Follow the layered architecture defined in the Backend Engineering
   Constitution (Router → Service → Repository → Model) as each feature
   is implemented in later sprints.
4. Each sprint is implemented and verified independently; do not
   anticipate or scaffold future sprints ahead of schedule.
