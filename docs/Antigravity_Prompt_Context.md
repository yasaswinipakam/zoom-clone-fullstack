# Antigravity Prompt Context Document

**Purpose:** This document is referenced by every Antigravity prompt. Read it once, then every subsequent prompt will say: "Refer to `/docs/Antigravity_Prompt_Context.md` for Backend Contract, Design System, and Zoom UI patterns."

**Do NOT paste this into Antigravity multiple times.** Instead, upload it once or reference the GitHub path.

---

## 1. Backend API Contract (FastAPI)

**Base URL (dev):** `http://127.0.0.1:8000`  
**API Prefix:** `/api/v1`  
**CORS default:** `http://localhost:3000`

### Meetings Endpoints

| Method | Path | Purpose | Request Body | Response | Notes |
|---|---|---|---|---|---|
| POST | `/api/v1/meetings` | Create instant or scheduled meeting | `{ title?: string, description?: string, scheduled_at?: ISO8601, host_id: int, type: "INSTANT" \| "SCHEDULED" }` | `{ id: int, meeting_code: string, status: "ACTIVE" \| "SCHEDULED", ... }` | Instant meetings created `ACTIVE` directly. Scheduled meetings created as `SCHEDULED`. |
| GET | `/api/v1/meetings/upcoming` | List `SCHEDULED` meetings | Query: `host_id?` (int), `limit?` (int, default 10) | `[{ id, meeting_code, title, scheduled_at, ... }]` | Sorted soonest first. |
| GET | `/api/v1/meetings/recent` | List `ENDED` meetings | Query: `host_id?` (int), `limit?` (int, default 10) | `[{ id, meeting_code, title, ended_at, ... }]` | Sorted most recent first. |
| GET | `/api/v1/meetings/{meeting_id}` | Fetch by internal ID | — | `{ id, meeting_code, title, status, ... }` | Use `meeting_id` (integer). |
| GET | `/api/v1/meetings/code/{meeting_code}` | Fetch by shareable code | — | `{ id, meeting_code, title, status, ... }` | Use `meeting_code` (format: "847-2910-556"). |
| PATCH | `/api/v1/meetings/{meeting_id}` | Update meeting (incl. status) | `{ title?, description?, status? }` | `{ id, meeting_code, status, ... }` | Status transitions: `SCHEDULED → ACTIVE → ENDED` (forward-only). |
| DELETE | `/api/v1/meetings/{meeting_id}` | Delete meeting | — | 204 No Content | Cascades to participants. |
| POST | `/api/v1/meetings/{meeting_code}/start` | Start a scheduled meeting | — | `{ status: "ACTIVE", ... }` | Only valid for `SCHEDULED` status. |
| POST | `/api/v1/meetings/{meeting_code}/end` | End meeting for all participants | — | `{ status: "ENDED", ... }` | Host-only action. |
| GET | `/api/v1/meetings/{meeting_code}/status` | Poll meeting status (lightweight) | — | `{ meeting_code, status: string, participant_count: int }` | For real-time status updates. Poll every 5s. |

### Participants Endpoints

| Method | Path | Purpose | Request Body | Response | Notes |
|---|---|---|---|---|---|
| POST | `/api/v1/meetings/{meeting_code}/participants` | Join meeting | `{ display_name: string, host_id?: int }` | `{ id: int, display_name, status: "CONNECTED" \| "DISCONNECTED" \| "LEFT", ... }` | Creates a participant. `host_id` optional (to identify if participant is the host). |
| GET | `/api/v1/meetings/{meeting_code}/participants` | List participants in meeting | Query: `status?` ("CONNECTED" \| "DISCONNECTED" \| "LEFT") | `[{ id, display_name, status, host_id?, ... }]` | Returns all participants (filter by status optional). |
| POST | `/api/v1/meetings/{meeting_code}/participants/{participant_id}/leave` | Participant self-leave (soft delete) | — | 204 No Content | Marks participant as `LEFT`. |
| DELETE | `/api/v1/meetings/{meeting_code}/participants/{participant_id}` | Host removes participant (hard delete) | — | 204 No Content | Host-only action. Participant is removed. |

### Infrastructure

| Method | Path | Purpose | Response |
|---|---|---|---|
| GET | `/health` | Health check + DB liveness | `{ status: "ok" }` |

---

## 2. Enums (Match Backend Exactly)

```typescript
// MeetingType
type MeetingType = "INSTANT" | "SCHEDULED"

// MeetingStatus (forward-only transitions: SCHEDULED → ACTIVE → ENDED)
type MeetingStatus = "SCHEDULED" | "ACTIVE" | "ENDED"

// ParticipantStatus
type ParticipantStatus = "CONNECTED" | "DISCONNECTED" | "LEFT"
```

---

## 3. Error Response Contract

All errors return this shape:

```json
{
  "error": "error_kind",
  "message": "human-readable message"
}
```

| HTTP | `error` value | When | Example |
|---|---|---|---|
| 400 | `validation_error` | Domain-level rule failure (e.g. `scheduled_at` in past) | `{ "error": "validation_error", "message": "Meeting cannot be scheduled in the past" }` |
| 404 | `not_found` | Meeting or participant doesn't exist | `{ "error": "not_found", "message": "Meeting not found" }` |
| 409 | `conflict` | Invalid lifecycle, duplicate display name, already ended | `{ "error": "conflict", "message": "Meeting has already ended" }` |
| 422 | `validation_error` | Pydantic schema validation failure | `{ "error": "validation_error", "message": "[Pydantic error list]" }` |
| 500 | `internal_server_error` | Unhandled exception | `{ "error": "internal_server_error", "message": "An unexpected error occurred" }` |

---

## 4. Design System & Tokens

### Colors (Tailwind v4 `@theme`)

```css
/* Primary Brand (Zoom Blue) */
--color-primary:     #2d8cff;      /* Main action color */
--color-primary-600: #1a7ae8;      /* Hover/pressed state */
--color-primary-100: #dbeafe;      /* Light background */

/* Surface */
--color-surface:      #ffffff;      /* Light mode bg */
--color-surface-50:   #f8fafc;      /* Light mode secondary bg */
--color-surface-100:  #f1f5f9;      /* Light mode tertiary bg */

/* Surface Dark (Meeting Room) */
--color-surface-dark:     #1c1c1e;  /* Dark mode primary bg */
--color-surface-dark-100: #2c2c2e;  /* Dark mode secondary bg */

/* Semantic */
--color-danger:       #e3371e;      /* Errors, destructive actions */
--color-danger-600:   #c62d17;      /* Danger hover */
--color-success:      #16a34a;      /* Success states */
--color-warning:      #d97706;      /* Warnings */

/* Neutral & Text */
--color-border:                #e2e8f0;      /* Light mode borders */
--color-border-dark:           #334155;      /* Dark mode borders */
--color-text-primary:          #0f172a;      /* Light mode text (dark) */
--color-text-secondary:        #64748b;      /* Light mode secondary text */
--color-text-primary-dark:     #f1f5f9;      /* Dark mode text (light) */
--color-text-secondary-dark:   #94a3b8;      /* Dark mode secondary text */
```

### Typography

```
Font: Inter (Google Fonts, wght 300–800)
Line-height: 1.5 (base)

Sizes (Tailwind scale):
  text-xs: 0.75rem (12px)
  text-sm: 0.875rem (14px)
  text-base: 1rem (16px)
  text-lg: 1.125rem (18px)
  text-xl: 1.25rem (20px)
  text-2xl: 1.5rem (24px)
  text-3xl: 1.875rem (30px)

Weights:
  font-light: 300
  font-normal: 400
  font-medium: 500
  font-semibold: 600
  font-bold: 700
```

### Spacing Scale (Tailwind)

```
4px (1 unit) = p-1
8px (2 units) = p-2
12px (3 units) = p-3
16px (4 units) = p-4
24px (6 units) = p-6
32px (8 units) = p-8
```

### Shadows

```css
--shadow-card: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
--shadow-elevated: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-modal: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);

Radii:
--radius-sm: 0.375rem (6px)
--radius-md: 0.5rem (8px)
--radius-lg: 0.75rem (12px)
--radius-xl: 1rem (16px)
```

---

## 5. Zoom UI Patterns (From Reference & Real Zoom)

### Dashboard (Light Mode)
- **Background:** White (`--color-surface`)
- **Header/Navbar:** White with subtle border, action buttons (New Meeting, Join, Schedule) in primary blue
- **Meeting Cards:** White card on light surface, subtle shadow, blue action button, shows title + date + participant count
- **Layout:** 2-column grid for meetings (responsive: 1 col mobile, 2 col tablet, 3 col desktop)
- **Icons:** Lucide icons (Calendar, Users, Play, X, etc.)

### Meeting Room (Dark Mode)
- **Background:** Dark (`--color-surface-dark`)
- **Participant Grid:** Dark surface-dark-100 boxes for each participant tile
- **Bottom Toolbar:** Dark bg, floating above content, contains: mic toggle, camera toggle, participants panel, invite, leave/end button
- **Side Panels:** Dark with light text, chat sidebar (optional), participants panel
- **Status Indicator:** Green for connected, gray for disconnected/left
- **Typography:** Light text on dark bg

### Key Components
- **Navbar:** White bg, blue action buttons, no shadow by default (subtle line-bottom border)
- **Meeting Cards:** Min 280px wide, shadow on hover, title (bold), date/time (secondary text), participant count (badge or text)
- **Participant Tiles:** Square (1:1 aspect ratio in grid), initials or avatar placeholder, display name below, status indicator
- **Bottom Toolbar:** Fixed, floating effect (shadow), icons for actions (20–24px Lucide icons), gap between groups (3–4 units padding)
- **Buttons:** Rounded md, padding sm-md, consistent primary/secondary/danger variants
- **Dialog/Modal:** Center-aligned, white bg (light mode), title + body + action buttons, overlay dark semi-transparent

---

## 6. Next.js Folder Structure

```
/project/zoom-clone/
├── app/
│   ├── layout.tsx                 (Root layout, Providers, Theme)
│   ├── page.tsx                   (Landing page /)
│   ├── dashboard/
│   │   └── page.tsx               (Dashboard /dashboard)
│   ├── join/
│   │   └── page.tsx               (Join meeting /join)
│   ├── schedule/
│   │   └── page.tsx               (Schedule meeting /schedule)
│   ├── meeting/
│   │   └── [code]/
│   │       └── page.tsx           (Meeting room /meeting/[code])
│   └── api/
│       └── (keep empty or use for proxy if needed)
│
├── src/
│   ├── components/
│   │   ├── ui/                    (Design system primitives)
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Dialog.tsx
│   │   │   └── ... (others)
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   └── Footer.tsx
│   │   ├── dashboard/
│   │   │   ├── MeetingCard.tsx
│   │   │   ├── UpcomingSection.tsx
│   │   │   └── RecentSection.tsx
│   │   ├── meeting-room/
│   │   │   ├── ParticipantGrid.tsx
│   │   │   ├── ParticipantTile.tsx
│   │   │   ├── BottomToolbar.tsx
│   │   │   ├── ParticipantsPanel.tsx
│   │   │   └── InviteDialog.tsx
│   │   └── landing/
│   │       ├── HeroSection.tsx
│   │       ├── FeaturesSection.tsx
│   │       └── HowItWorksSection.tsx
│   │
│   ├── hooks/
│   │   ├── queries/
│   │   │   ├── useUpcomingMeetings.ts
│   │   │   ├── useRecentMeetings.ts
│   │   │   ├── useMeetingByCode.ts
│   │   │   ├── useMeetingStatus.ts
│   │   │   └── useParticipants.ts
│   │   ├── mutations/
│   │   │   ├── useCreateMeeting.ts
│   │   │   ├── useJoinMeeting.ts
│   │   │   ├── useLeaveMeeting.ts
│   │   │   ├── useStartMeeting.ts
│   │   │   ├── useEndMeeting.ts
│   │   │   └── useRemoveParticipant.ts
│   │   └── (other custom hooks)
│   │
│   ├── context/
│   │   ├── CurrentUserContext.tsx
│   │   ├── useCurrentUser.ts
│   │   ├── ThemeContext.tsx
│   │   └── useTheme.ts
│   │
│   ├── api/
│   │   ├── client.ts              (Axios instance + interceptor)
│   │   ├── meetings.ts            (Meeting API calls)
│   │   ├── participants.ts        (Participant API calls)
│   │   └── health.ts              (Health check)
│   │
│   ├── types/
│   │   ├── meeting.ts
│   │   ├── participant.ts
│   │   ├── enums.ts
│   │   └── api-error.ts
│   │
│   ├── lib/
│   │   ├── queryClient.ts         (React Query config)
│   │   ├── meetingCode.ts         (Code parsing/formatting)
│   │   ├── datetime.ts            (Date/time utilities)
│   │   └── ... (other utilities)
│   │
│   ├── styles/
│   │   ├── globals.css            (Tailwind @theme, base styles)
│   │   └── (optional: additional CSS)
│   │
│   └── providers.tsx              (React Query, Theme, Auth Context wrapper)
│
├── public/
│   ├── favicon.svg
│   └── icons.svg                  (Lucide or custom icon set)
│
├── .env.example
├── .env.local                     (Dev: NEXT_PUBLIC_API_BASE_URL=http://localhost:8000)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 7. Key Rules (From Frontend Engineering Constitution)

**No hallucinated components:** Only use primitives from `components/ui/` (Button, Card, Input, Dialog, Badge, etc.). Don't invent one-off styled divs.

**No direct Axios:** Components never call `axios` directly. All API calls go through `hooks/queries/` or `hooks/mutations/`.

**All enums match backend exactly:** If backend says `"INSTANT"`, frontend uses `"INSTANT"`, not `"instant"` or `INSTANT_MEETING`.

**Keyboard accessibility:** Every interactive element must be keyboard-operable with a visible focus state (`:focus-visible`).

**Error handling:** All errors normalize to the `{ error, message }` shape via the Axios interceptor. Components render errors via shared `ErrorState` or Toast primitives, never custom error divs.

**No prop drilling past 2 levels:** Use Context or hooks to avoid threading state through 3+ component layers.

**TypeScript strict mode enabled:** No `any` types. Every prop is typed.

---

## 8. Success Criteria Checklist (For Every Task)

- [ ] TypeScript strict: `noImplicitAny: true`, `strict: true`, no `any` types
- [ ] No hardcoded colors/spacing outside `components/ui/` — use Tailwind token utilities
- [ ] No custom one-off components — use design system primitives only
- [ ] All enums match backend exactly (case-sensitive)
- [ ] API calls routed through hooks only (no direct Axios in components)
- [ ] Error handling uses shared `ErrorState`/Toast primitives
- [ ] Keyboard accessible (Tab, Enter, Escape work)
- [ ] Responsive: mobile (320px+), tablet (768px+), desktop (1024px+)
- [ ] Component props are typed (interface or type, never inline object)
- [ ] No `useState` mirrors React Query values
- [ ] All interactive elements have visible focus states

---

## 9. Running the Backend Locally

```bash
cd backend
source .venv/bin/activate  # or equivalent on Windows
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend runs at `http://127.0.0.1:8000`.  
Swagger/OpenAPI available at `http://127.0.0.1:8000/docs`.

---

## 10. Assignment Requirements (Holy Book)

From the assignment spec:

**Core Features (Must Have):**
1. **Landing Dashboard** — Clean professional Zoom UI, navbar, buttons (New, Join, Schedule), Upcoming & Recent sections
2. **Instant Meeting Creation** — New Meeting → unique ID → redirect to room
3. **Join Meeting** — By code/link, validate existence, enter display name
4. **Schedule Meetings** — Date/time picker, title/description, store in DB, show in Upcoming
5. **Responsive Design** — Mobile, tablet, desktop
6. **Database Design** — Evaluated (already done on backend)

**Bonus (Good to Have):**
- User authentication (out of scope for now — use synthetic user)
- Host controls (mute all, etc. — only what backend supports: start, end, remove participant)

**Important:**
- **UI must resemble Zoom's design** — Study real Zoom, don't copy Linear/Stripe
- **No login required** — Assume default user logged in
- **Sample data** — Seed DB (backend already seeded)
- **Original work** — No plagiarism from existing repos

---

## 11. Deployment Notes

**Dev:**
- Next.js dev server: `npm run dev` (default port 3000)
- Backend: `http://127.0.0.1:8000`
- `.env.local`: `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`

**Production:**
- Deploy Next.js app to Vercel/Netlify/Render/Railway
- Deploy backend to same or separate cloud service
- Set `NEXT_PUBLIC_API_BASE_URL` to deployed backend URL
- Update backend `CORS_ALLOW_ORIGINS` to include deployed frontend domain

---

## End of Context

**Use this document as reference for all Antigravity prompts.**  
Every prompt will say: "Refer to `/docs/Antigravity_Prompt_Context.md` for Backend Contract, Design System, and Zoom UI patterns."
