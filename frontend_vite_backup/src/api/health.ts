/**
 * Health API module.
 *
 * Used by a low-frequency background query that powers the
 * ConnectionStatusIndicator in the meeting room header
 * (Implementation Plan §9).
 */

import { apiClient } from '@/api/client'

export interface HealthResponse {
  status: string
  service: string
  version: string
  environment: string
  db_status: 'ok' | 'degraded'
}

export const healthApi = {
  /** GET /health (not under /api/v1 — infrastructure endpoint) */
  getHealth: (): Promise<HealthResponse> =>
    apiClient.get<HealthResponse>('/health').then((r) => r.data),
}
