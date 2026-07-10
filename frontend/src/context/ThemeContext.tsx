/**
 * ThemeProvider — React component only.
 *
 * Exports EXACTLY ONE thing: the ThemeProvider component.
 * Context lives in ThemeContextValue.ts; hook lives in useTheme.ts.
 *
 * Dashboard defaults to light. Meeting room forces dark locally
 * (Constitution §9.5: "dark: classes only inside meeting-room subtree").
 */

import { useCallback, useEffect, useState } from 'react'
import { ThemeContext, type Theme } from '@/context/ThemeContextValue'

interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }, [])

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}
