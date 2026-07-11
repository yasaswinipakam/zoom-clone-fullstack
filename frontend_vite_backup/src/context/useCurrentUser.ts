/**
 * useCurrentUser — hook providing access to the current synthetic user.
 *
 * This file exports EXACTLY ONE thing: the useCurrentUser hook.
 * Satisfies react-refresh/only-export-components (hooks are not components,
 * and this file has no component exports).
 *
 * Constitution §10.2: "Context values are read via a custom hook
 * (useCurrentUser()), never useContext(CurrentUserContext) directly."
 */

import { useContext } from 'react'
import { CurrentUserContext, type CurrentUserContextValue } from '@/context/CurrentUserContextValue'

export function useCurrentUser(): CurrentUserContextValue {
  const ctx = useContext(CurrentUserContext)
  if (!ctx) {
    throw new Error('useCurrentUser must be used within a CurrentUserProvider')
  }
  return ctx
}
