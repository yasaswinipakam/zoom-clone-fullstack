/**
 * Providers — wraps the entire application in all required context providers.
 *
 * Provider order (outside-in, Implementation Plan §5):
 *   1. QueryClientProvider  (React Query)
 *   2. CurrentUserProvider
 *   3. ThemeProvider
 *   4. DeviceSettingsProvider
 *
 * The router is NOT wrapped here — it lives in App.tsx and is the
 * innermost shell. This separation keeps provider composition and
 * routing concerns in separate files.
 */

import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { CurrentUserProvider } from '@/context/CurrentUserContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { DeviceSettingsProvider } from '@/context/DeviceSettingsContext'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <CurrentUserProvider>
        <ThemeProvider>
          <DeviceSettingsProvider>{children}</DeviceSettingsProvider>
        </ThemeProvider>
      </CurrentUserProvider>
    </QueryClientProvider>
  )
}
