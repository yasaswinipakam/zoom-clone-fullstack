/**
 * ThemeContext instance — context object and value type.
 *
 * Pure .ts module with no component exports.
 * Shared between ThemeContext.tsx (Provider) and useTheme.ts (hook).
 */

import { createContext } from 'react'

export type Theme = 'light' | 'dark'

export interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)
