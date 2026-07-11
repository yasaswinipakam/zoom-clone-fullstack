/**
 * CurrentUserProvider — React component only.
 *
 * This file exports EXACTLY ONE thing: the CurrentUserProvider component.
 * The context object lives in CurrentUserContextValue.ts; the hook lives in
 * useCurrentUser.ts. This split satisfies react-refresh/only-export-components
 * without suppressing the rule.
 *
 * No-Auth Identity Strategy (Implementation Plan §5):
 *   - Generates a stable synthetic hostId (default 1, matching the backend seed)
 *     on first load and persists it in localStorage.
 *   - Captures and persists displayName on first use.
 *   - localStorage access is scoped to this context file per Constitution §3.5.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  CurrentUserContext,
  type CurrentUser,
} from '@/context/CurrentUserContextValue'

// ---------------------------------------------------------------------------
// Persistence helpers — localStorage access scoped here per Constitution §3.5
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'zoom_clone_user'
const DEFAULT_HOST_ID = 1

function loadUser(): CurrentUser {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CurrentUser>
      return {
        hostId: typeof parsed.hostId === 'number' ? parsed.hostId : DEFAULT_HOST_ID,
        displayName: typeof parsed.displayName === 'string' ? parsed.displayName : null,
      }
    }
  } catch {
    // Corrupt storage — fall through to defaults
  }
  return { hostId: DEFAULT_HOST_ID, displayName: null }
}

function saveUser(user: CurrentUser): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  } catch {
    // Storage unavailable — non-fatal
  }
}

// ---------------------------------------------------------------------------
// Provider component — the ONLY export from this file
// ---------------------------------------------------------------------------

interface CurrentUserProviderProps {
  children: React.ReactNode
}

export function CurrentUserProvider({ children }: CurrentUserProviderProps) {
  const [user, setUser] = useState<CurrentUser>(loadUser)

  useEffect(() => {
    saveUser(user)
  }, [user])

  const setDisplayName = useCallback((name: string) => {
    setUser((prev) => ({ ...prev, displayName: name }))
  }, [])

  return (
    <CurrentUserContext.Provider value={{ user, setDisplayName }}>
      {children}
    </CurrentUserContext.Provider>
  )
}
