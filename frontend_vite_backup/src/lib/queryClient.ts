/**
 * React Query client instance and default options.
 *
 * Constitution §8.3: "Mutations declare their invalidations explicitly in onSuccess."
 * Constitution §11.3: "409 Conflict responses never trigger an automatic retry."
 *
 * Global retry config: only network failures and 5xx responses retry.
 * 4xx errors (400/404/409/422) are surfaced immediately — they represent
 * domain failures that a retry will not fix.
 */

import { QueryClient } from '@tanstack/react-query'
import { isApiError } from '@/types/api-error'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry on network errors / 5xx; never on 4xx.
      retry: (failureCount, error) => {
        if (isApiError(error) && error.status >= 400 && error.status < 500) {
          return false
        }
        return failureCount < 2
      },
      // Stale time: 30s for most queries. Polling hooks (useMeetingStatus,
      // useParticipants) override this with their own refetchInterval.
      staleTime: 30_000,
      // Do not refetch when the window regains focus — most data in this
      // app is explicitly polled or invalidated on mutation success.
      refetchOnWindowFocus: false,
    },
    mutations: {
      // No global retry for mutations — each mutation hook decides.
      retry: false,
    },
  },
})
