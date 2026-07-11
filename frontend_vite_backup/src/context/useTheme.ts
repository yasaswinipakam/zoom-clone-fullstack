/**
 * useTheme — hook providing access to the current theme state.
 *
 * Exports EXACTLY ONE thing: the useTheme hook.
 * No component exports — satisfies react-refresh/only-export-components.
 */

import { useContext } from 'react'
import { ThemeContext, type ThemeContextValue } from '@/context/ThemeContextValue'

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return ctx
}
