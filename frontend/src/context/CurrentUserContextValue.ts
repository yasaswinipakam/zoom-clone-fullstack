/**
 * CurrentUserContext instance — context object and value type.
 *
 * This file is intentionally a pure .ts module with NO React component
 * exports. It exists so that CurrentUserContext.tsx (Provider) and
 * useCurrentUser.ts (hook) can both import the shared context object
 * without the react-refresh/only-export-components rule firing on either.
 *
 * Constitution §10.2: "Context values are read via a custom hook, never
 * useContext(CurrentUserContext) directly in a component."
 */

import { createContext } from 'react'

export interface CurrentUser {
  /** Synthetic host ID matching the backend's seeded default (host_id = 1). */
  hostId: number
  /** Display name set by the user on their first join/create/schedule action. */
  displayName: string | null
}

export interface CurrentUserContextValue {
  user: CurrentUser
  setDisplayName: (name: string) => void
}

export const CurrentUserContext = createContext<CurrentUserContextValue | null>(null)
