/**
 * Axios client — the ONLY file in the frontend allowed to import axios.
 *
 * Constitution §6.4: "Only api/client.ts imports axios. No other file
 * imports it directly."
 *
 * Responsibilities (Implementation Plan §9):
 *  1. Base URL from VITE_API_BASE_URL env var (falls back to '' in dev
 *     so the Vite proxy handles routing without hardcoding the backend URL).
 *  2. A response interceptor that normalizes every non-2xx response into
 *     a typed ApiError — the single place backend error-shape knowledge
 *     lives. Every hook downstream deals with ApiError, not raw Axios.
 *  3. No retry logic here — retries are React Query's concern, configured
 *     per-query with 4xx excluded (Constitution §11.3).
 */

import axios from 'axios'
import type { AxiosError } from 'axios'
import type { ApiError, ApiErrorKind } from '@/types/api-error'

// In dev, VITE_API_BASE_URL is unused because the Vite proxy forwards
// /api/* and /health to the backend (vite.config.ts). In production
// builds, the proxy is absent, so the env var must be set.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ---------------------------------------------------------------------------
// Response interceptor — error normalization
// ---------------------------------------------------------------------------
// Maps HTTP status codes to ApiErrorKind, reads the backend's
// { error, message } body where available, and re-throws a typed ApiError.
// Constitution §11.1: components never inspect raw Axios errors.

function statusToKind(status: number): ApiErrorKind {
  if (status === 404) return 'not_found'
  if (status === 409) return 'conflict'
  if (status === 400 || status === 422) return 'validation_error'
  return 'internal_server_error'
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string; message?: string }>) => {
    if (!error.response) {
      // Network failure — no HTTP response at all
      const apiError: ApiError = {
        kind: 'network_error',
        message: 'Unable to reach the server. Check your connection and try again.',
        status: 0,
      }
      return Promise.reject(apiError)
    }

    const { status, data } = error.response
    const kind = statusToKind(status)
    const message =
      typeof data?.message === 'string'
        ? data.message
        : 'An unexpected error occurred. Please try again.'

    const apiError: ApiError = { kind, message, status }
    return Promise.reject(apiError)
  },
)
