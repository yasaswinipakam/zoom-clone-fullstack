# Frontend Engineering Constitution

**Companion document to:** `Zoom_Clone_Frontend_Implementation_Plan.md`
**Mirrors in spirit:** the Backend Engineering Constitution — same purpose (a small set of binding rules that keep the codebase consistent as it grows), applied to the frontend.
**Scope:** Governs everything under `frontend/src/`. Where this document and the implementation plan overlap (folder structure, component hierarchy), this document is the enforceable rule; the plan is the narrative explanation.

---

## 1. Purpose

A frontend without a constitution drifts one convenient shortcut at a time: one component that fetches data directly instead of through a hook, one page that hardcodes a color instead of using a token, one form that skips Zod "just this once." None of these individually breaks anything. Together, over a handful of milestones, they make the codebase inconsistent, harder to review, and harder for another engineer (or another AI system) to extend predictably. This document exists to prevent that by making the rules explicit rather than tribal knowledge.

Every rule below states **what** to do, **why**, and — where useful — the **failure mode** it prevents.

---

## 2. React Rules

**2.1 — Function components only.** No class components. React Hooks are the only state/lifecycle mechanism used.

**2.2 — One component, one responsibility.** A component either fetches/owns data or renders presentation, not both, wherever practical. Page-level components are the exception: they're explicitly allowed to compose data hooks and pass results down (see Section 4, "Routes vs. Pages").

**2.3 — No business logic in JSX.** Conditionals more complex than a simple ternary, and any computation beyond trivial formatting, are extracted into a named variable or a `lib/` helper before the `return`. JSX describes structure, not logic.

**2.4 — Props are typed, always.** Every component's props are a named TypeScript `interface` or `type`, never inline object literals in the function signature, and never `any`.

**2.5 — No prop drilling past two levels.** If a value needs to pass through more than two component layers untouched, it belongs in Context (Section 8 of the plan) or the nearest appropriate data hook — not threaded through every intermediate component's props.

**2.6 — Default exports for components, named exports for everything else.** One component per file, default-exported, matching the filename. Hooks, types, and utilities are named exports. This makes imports predictable and greppable.

*Failure mode this prevents:* components that are simultaneously a data-fetcher, a form, and a layout wrapper — impossible to reuse or test in isolation.

---

## 3. Hook Rules

**3.1 — Hooks obey the Rules of Hooks, enforced by lint, not memory.** `eslint-plugin-react-hooks` runs in strict mode; violations block merge, not just warn.

**3.2 — One hook, one concern.** A `use*` hook does one thing: one query, one mutation, or one piece of derived/composed state. A hook that both fetches data and manages a modal's open state is two hooks pretending to be one.

**3.3 — Server-state hooks live in `hooks/queries/` or `hooks/mutations/` and nowhere else.** No component calls `useQuery`/`useMutation` directly with an inline `queryFn`. Every server interaction goes through a named hook in those folders, which itself calls the typed `api/` function (Section 9 of the plan). This is what keeps "API Layer" in the plan an enforceable boundary instead of aspirational.

**3.4 — Custom hooks return objects, not positional tuples, once there are more than two values.** `{ data, isLoading, isError }`, not `[data, isLoading, isError]` — positional returns become ambiguous as they grow and are easy to destructure in the wrong order.

**3.5 — No hook reaches into `localStorage`/`sessionStorage` directly except the hooks inside `context/`.** Any component or feature hook that needs persisted client state reads it through `useCurrentUser()`, `useTheme()`, or `useDeviceSettings()` — never `window.localStorage` inline. This keeps persistence a single, swappable concern.

*Failure mode this prevents:* a `useParticipants` hook that also happens to set a toast and read `localStorage`, making it untestable and impossible to reuse in a second context (e.g. a future admin view).

---

## 4. Component Rules

**4.1 — Every feature component composes design-system primitives; none style raw HTML directly.** Per Section 12 of the plan, a `<button>` is never hand-styled inline in a feature component — it's `<Button variant="danger">`. If the design system doesn't yet support a needed treatment, the primitive is extended in `components/ui/` first.

**4.2 — Presentational components accept data as props; they do not know about `meeting_code` vs. `id`, API shapes, or React Query.** A `ParticipantTile` receives a `Participant` object shaped by its caller — it has no idea whether that data came from a query, a mock, or a Storybook fixture. This is what keeps `components/ui/` and most of `components/meeting-room/`/`components/dashboard/` reusable and easy to reason about in isolation.

**4.3 — Judge components by responsibility, not line count.** A component that does one thing well is fine at any length — a layout-heavy component like `MeetingRoomPage`, which legitimately composes header, grid, toolbar, and panels, will naturally run longer than a `Button`. What matters is whether the component still has a single, coherent responsibility (Section 2.2). ~150 lines is a useful *prompt to pause and ask* whether that's still true, not a target to hit or a threshold that blocks a PR on its own — used as a conversation-starter in code review (Section 14), not a rule. If a component has grown long because it's doing several unrelated things, extract a hook (Section 3) or split into subcomponents; if it's grown long because it's genuinely one cohesive layout, leave it.

**4.4 — Loading, empty, and error states are handled at the point closest to the data, not the top-level page.** `UpcomingMeetingsSection` renders its own skeleton/empty/error, using the shared `Skeleton`/`EmptyState`/`ErrorState` primitives — `DashboardPage` does not have a single giant `if (isLoading) return <Spinner/>` covering unrelated sections.

**4.5 — Every interactive component is keyboard-operable and has a visible focus state before it's considered done.** Not deferred to an "accessibility pass" milestone for correctness — only the systematic *review* of it is (Section 9 of the plan, Milestone 9). See Section 11 below.

*Failure mode this prevents:* a `MeetingCard` that quietly imports `axios` because it was faster than wiring a hook, breaking the API-layer boundary the very first time someone needs it.

---

## 5. Folder Rules

**5.1 — The folder structure in the implementation plan (Section 3) is binding, not illustrative.** New files go in the folder matching their role (`api/`, `hooks/`, `context/`, `components/`, `lib/`) — a new folder is not created ad hoc without updating this document.

**5.2 — `components/` is organized by feature area first, `ui/` second.** A component used by exactly one feature lives under that feature's folder (`components/meeting-room/ParticipantTile.tsx`). A component with zero knowledge of any specific feature's data lives in `components/ui/`. A component should only move from a feature folder into `ui/` once a second, unrelated feature actually needs it — not preemptively.

**5.3 — `lib/` contains only pure functions with no React import and no network call.** If a "utility" needs `useState` or `fetch`, it's a hook or an API function, not a `lib/` file.

**5.4 — Tests, when they exist, live next to the file they test (`Component.test.tsx` beside `Component.tsx`), not in a parallel tree.** Given the current scope favors manual smoke testing over an automated suite (per the implementation plan, Section 13), this rule governs the rare exception (e.g. a pure `lib/` function worth a quick unit test), not a large suite.

*Failure mode this prevents:* a `utils.ts` catch-all file that accumulates unrelated helpers until no one remembers what's in it.

---

## 6. Import Rules

**6.1 — Imports are absolute from `src/`, never deep relative chains.** `import { Button } from '@/components/ui/Button'`, not `import { Button } from '../../../components/ui/Button'`. Configured once in `tsconfig.json`/`vite.config.ts`, not a per-file convention people have to remember.

**6.2 — Layer boundaries are enforced by import direction, not just convention:**
- `components/` may import from `hooks/`, `context/`, `lib/`, `types/`, and other `components/`.
- `hooks/` may import from `api/`, `lib/`, `types/` — never from `components/`.
- `api/` may import from `types/` only — never from `hooks/` or `components/`.
- `pages/` may import from anything above; nothing above imports from `pages/` or `routes/`.

This mirrors the backend's own layered-architecture rule (Router → Service → Repository) applied to the frontend's shape, and is what makes "hooks are the only layer that touches server state" (Section 3.3) actually true rather than aspirational.

**6.3 — No circular imports.** If two modules need each other, a third module holding the shared piece is extracted.

**6.4 — Only `api/client.ts` imports `axios`.** No other file imports it directly — enforced by the same reasoning as 6.2, and explicitly called out here because it's the single easiest rule to accidentally violate under deadline pressure.

*Failure mode this prevents:* a component importing `meetingsApi` directly "just to save a hook," silently reintroducing the exact coupling Section 9 of the plan was designed to prevent.

---

## 7. Naming Conventions

| Kind | Convention | Example |
|---|---|---|
| Component file/export | `PascalCase` | `MeetingCard.tsx` → `export default function MeetingCard` |
| Hook file/export | `camelCase`, prefixed `use` | `useUpcomingMeetings.ts` → `useUpcomingMeetings()` |
| Type/interface | `PascalCase`, no `I` prefix | `MeetingResponse`, not `IMeetingResponse` |
| API function | `camelCase`, verb-first | `createMeeting`, `listParticipants` |
| Context | `PascalCase`, suffixed `Context` + matching `Provider`/`use*` hook | `CurrentUserContext`, `CurrentUserProvider`, `useCurrentUser()` |
| Route param | Matches backend's public identifier name exactly | `:meetingCode`, never `:meetingId` or `:code` |
| Enum values (frontend TypeScript) | Verbatim match to backend `StrEnum` values | `"SCHEDULED"`, `"ACTIVE"`, `"ENDED"` — never re-cased or re-worded |
| Boolean props/variables | `is`/`has`/`can` prefix | `isLoading`, `hasError`, `canRemoveParticipant` |
| Event handler props | `on` prefix; handler implementations `handle` prefix | `onLeave` prop, `handleLeaveClick` implementation |
| CSS/Tailwind custom tokens | `kebab-case`, `--color-*` / `--space-*` / `--font-*` | `--color-danger`, matching Section 11 of the plan |

The enum and route-param rows exist specifically because they cross the frontend/backend boundary — any deviation there is a silent contract bug, not just a style nit.

---

## 8. React Query Conventions

**8.1 — Query keys are structured arrays, namespaced by resource, and centralized.** `['meetings', 'upcoming', { hostId, limit }]`, `['participants', meetingCode]` — defined once per hook, never inlined ad hoc at each call site, so invalidation (8.3) can target them reliably.

**8.2 — One hook per backend operation, matching the table in the implementation plan (Section 9) exactly.** No hook silently combines two backend calls into one without that being a deliberate, documented exception.

**8.3 — Mutations declare their invalidations explicitly in `onSuccess`.** `useCreateMeeting` invalidates `['meetings', 'upcoming']`; `useJoinMeeting`/`useLeaveMeeting`/`useRemoveParticipant` invalidate `['participants', meetingCode]`. Invalidation is never left implicit or assumed to "just refresh eventually."

**8.4 — Polling intervals are named constants, not magic numbers scattered across hooks.** The 5-second participant/status polling interval (per the plan, Section 8) is defined once (e.g. `lib/constants.ts` → `PARTICIPANT_POLL_INTERVAL_MS = 5000`) and imported wherever needed, so a future tuning decision is a one-line change.

**8.5 — Errors are not swallowed.** Every query/mutation either renders its `error` state through the shared `ErrorState`/toast primitives or explicitly comments why a particular failure is safe to ignore. A bare `catch {}` is not acceptable.

**8.6 — No manual `useEffect` + `fetch` anywhere.** If data needs to be fetched, it goes through React Query. `useEffect` is reserved for genuine side effects outside the server-state lifecycle (e.g. focusing an input on mount).

*Failure mode this prevents:* a screen that "usually" shows fresh data because someone remembered to invalidate the right query, and silently shows stale data the one time they didn't.

---

## 9. Tailwind Conventions

**9.1 — No arbitrary values (`w-[137px]`, `text-[#3a7bd5]`) outside of the token-defining primitives in `components/ui/`.** Feature components compose spacing/color/type via the token-backed Tailwind scale (Section 11 of the plan), not one-off pixel or hex values. If the scale doesn't have what's needed, the token system is extended, not bypassed locally.

**9.2 — Class order follows a fixed convention (layout → spacing → sizing → typography → color → state variants) for scanability**, enforced via `prettier-plugin-tailwindcss` rather than manual discipline.

**9.3 — No inline `style={{ }}` for anything Tailwind can express.** Reserved only for genuinely dynamic, computed values (e.g. a progress bar's width from a percentage).

**9.4 — Responsive variants are mobile-first, matching the breakpoints in the plan's Styling System (Section 11) exactly** — `sm:`/`md:`/`lg:` used consistently rather than mixing max-width overrides in some components and min-width in others.

**9.5 — Dark-theme classes (`dark:`) are only used inside the meeting-room subtree**, since the dashboard is light-only by design (Section 5 of the plan) — a stray `dark:` class on a dashboard component is a review flag, not an assumed intentional choice.

*Failure mode this prevents:* two buttons three components apart that look almost-but-not-quite the same because each was styled independently instead of through the shared primitive.

---

## 10. State Ownership

This section makes Section 8 of the implementation plan ("State Management") enforceable rather than descriptive:

| If the state is... | It lives in... | Never in... |
|---|---|---|
| A meeting, participant, or anything returned by the backend | React Query cache, via a named hook | Context, component state, or a manually-managed `useEffect` sync |
| The current synthetic user (`host_id`, `display_name`) | `CurrentUserContext` | Component state, or re-derived independently in multiple places |
| A modal/panel's open state | The component that owns the modal (`useState`) | Global Context — a modal's open/closed state is never something a distant component needs to read |
| A form field's in-progress value | React Hook Form | Parent component state |
| Derived/computed display data (e.g. formatted duration) | Computed inline or via a `lib/` helper from existing state | A second piece of state kept "in sync" with the source — derived data is never stored, only computed |

**10.1 — No `useState` mirrors a React Query value.** If a component needs a query's data, it reads the query directly (or via a `select` transform) — never copies it into local state "to make it easier to edit," which immediately creates a stale-data bug.

**10.2 — Context values are read via a custom hook (`useCurrentUser()`), never `useContext(CurrentUserContext)` directly in a component.** This keeps the underlying Context implementation free to change without touching every consumer.

---

## 11. Error Handling

**11.1 — Every error a user can hit maps to backend's normalized `ApiError` shape (Section 9 of the plan) before it reaches a component.** Components never inspect raw Axios error objects or raw HTTP status codes — they branch on `error.kind` (`'not_found' | 'conflict' | 'validation_error' | 'internal_server_error'`).

**11.2 — Error messages shown to the user come from the backend's `message` field wherever it's user-appropriate, not a re-invented frontend string**, except where the raw backend message would be confusing out of context (rare, and called out explicitly in code review when it happens).

**11.3 — 409 Conflict responses never trigger an automatic retry.** Only network failures and 5xx responses are retried by React Query's default retry behavior; 4xx responses (400/404/409/422) resolve to an error state immediately.

**11.4 — Every mutation has both a success and an error path defined before it's considered complete** — no mutation is wired with only the happy path and a `// TODO: handle errors` left behind.

**11.5 — The global `ErrorState`/toast primitives are the only error-rendering mechanism.** No component writes its own ad hoc `<div className="text-red-500">{error}</div>`.

*Failure mode this prevents:* a screen that silently does nothing when a 409 fires because no one wired an error branch, leaving the user clicking a button that appears broken.

---

## 12. Accessibility

**12.1 — Every interactive element is a real interactive element.** Buttons are `<button>`, links are `<a>`; no `<div onClick>` standing in for either, except inside a component explicitly built and tested as an accessible custom control (e.g. a custom `Dialog` with a proper focus trap and ARIA roles).

**12.2 — Every form field has a programmatically associated `<label>`**, not a placeholder standing in for a label.

**12.3 — Focus is managed deliberately on every navigation and every modal open/close.** Opening `InviteDialog` moves focus into it; closing it returns focus to the triggering button. Route changes move focus to the new page's primary heading.

**12.4 — Color is never the only signal.** Participant connection state (`CONNECTED`/`DISCONNECTED`/`LEFT`) is conveyed by icon + text, not color alone, since the `Badge` primitive (Section 12 of the plan) is required to carry both.

**12.5 — `prefers-reduced-motion` is respected by every animation defined in the design system**, per Section 11 of the plan — this is enforced once, at the primitive/token level, not re-implemented per animation.

**12.6 — Every image or icon that conveys meaning has accessible text; every purely decorative icon is marked `aria-hidden`.**

*Failure mode this prevents:* a meeting room that's fully unusable via keyboard, discovered only during an "accessibility pass" milestone that then has to retrofit half the component tree.

---

## 13. Performance

**13.1 — Lists rendered from server data are always keyed on a stable backend ID** (`participant.id`, `meeting.id`) — never array index — since polled lists (Section 8 of the plan) reorder and mutate over time.

**13.2 — Components rendered inside a polled list (`ParticipantTile`) are memoized** (`React.memo`) so a poll tick that changes one participant doesn't re-render every tile.

**13.3 — No derived value is recomputed on every render if it's expensive and its inputs haven't changed.** `useMemo` is used deliberately for genuinely expensive computation — not applied reflexively to trivial expressions, which adds overhead without benefit.

**13.4 — Route-level code splitting via `React.lazy` for the Meeting Room page**, since it's the heaviest page (grid, toolbar, dialogs) and shouldn't block the initial dashboard load.

**13.5 — Polling intervals (Section 8) are paused when the tab is backgrounded**, using React Query's built-in `refetchIntervalInBackground: false` default rather than polling an inactive tab.

**13.6 — Images/icons are loaded from the shared Lucide set or optimized SVGs — no unoptimized raster assets committed** to keep bundle size predictable.

---

## 14. Code Review Checklist

Every pull request is checked against this list before merge. This is the enforcement mechanism for every rule above — a rule with no checklist line is a rule that erodes under deadline pressure.

- [ ] No component imports `axios` directly (Section 6.4).
- [ ] No component calls `useQuery`/`useMutation` with an inline `queryFn`/`mutationFn` (Section 3.3).
- [ ] No raw HTML element is styled where a design-system primitive exists for it (Section 4.1, 12 of the plan).
- [ ] No arbitrary Tailwind values (`[...]`) outside `components/ui/` (Section 9.1).
- [ ] No `useState` duplicating a value already available from React Query or Context (Section 10.1).
- [ ] Every new mutation has both a success and an error path wired (Section 11.4).
- [ ] Every new interactive element is keyboard-operable with a visible focus state (Section 4.5, 12.1).
- [ ] Every new list rendered from server data is keyed on a stable ID (Section 13.1).
- [ ] Enum values and route param names match the backend exactly, verbatim (Section 7).
- [ ] New files are in the correct folder per Section 5, and imports respect the layer boundaries in Section 6.2.
- [ ] No hardcoded color/spacing/type value outside the token system, except inside `components/ui/` itself (Section 9.1, 11 of the plan).
- [ ] If this PR touches a backend-facing type, `types/` has been checked against the current `openapi.json` (per the implementation plan, Section 13, Risks).

---

## 15. Amendments

This document is expected to grow as real decisions get made during implementation (e.g. a specific testing exception, a newly-discovered shared component). Amendments are appended with a short rationale, the same way the backend Constitution's own sections document their reasoning inline — this document is not meant to be treated as immutable, only as the current, explicit agreement about how the codebase stays consistent.
