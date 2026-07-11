/**
 * App — root component.
 *
 * Composition order (Implementation Plan §5):
 *   <Providers> (React Query, CurrentUser, Theme, DeviceSettings)
 *     <AppRouter> (React Router)
 *
 * This is the only component that composes providers and routing —
 * keeping both concerns in one visible place per the implementation plan's
 * "component hierarchy (top-down)" description (Section 1).
 */

import { Providers } from '@/providers'
import { AppRouter } from '@/routes/router'

export default function App() {
  return (
    <Providers>
      <AppRouter />
    </Providers>
  )
}
