# Zoom Clone Frontend

Next.js 15, React, TypeScript, Tailwind, Axios, and React Query client for the Zoom Clone assignment.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `NEXT_PUBLIC_API_BASE_URL` to the FastAPI server (default: `http://localhost:8000`). The app runs at `http://localhost:3000`.

## Architecture

- `app/` contains App Router pages; dashboard modals keep the Zoom-style single-workspace flow.
- `src/api/` owns HTTP contracts; list endpoints unwrap the backend `{ items, total }` envelope.
- `src/hooks/` owns React Query reads and mutations, including cache invalidation after meeting actions.
- `src/context/CurrentUserContext.tsx` provides the assignment’s seeded default user (`id=1`) and can be replaced by optional login.
- `src/components/` contains reusable dashboard, layout, meeting-room, auth, and primitive UI components.

## Features

- Instant meetings, scheduled meetings, upcoming/recent lists, join validation, and invite links.
- Responsive desktop/tablet/mobile layout; the sidebar collapses on small screens and the meeting toolbar remains horizontally accessible.
- Optional `/login` and `/signup` pages. A JWT is retained locally only after successful authentication; the normal no-login flow remains available.
- Host controls: participant panel, host badge, mute-all visual state, removal confirmation, and end-for-all confirmation.

## Production check

```bash
npm run build
```
