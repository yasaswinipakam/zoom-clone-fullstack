/**
 * ApiError — normalized error shape crossing every API boundary.
 *
 * The Axios response interceptor in api/client.ts catches every non-2xx
 * response and re-throws it as this typed error so components and hooks
 * never inspect raw Axios error objects or HTTP status codes directly.
 *
 * Constitution §11.1: "Every error a user can hit maps to backend's
 * normalized ApiError shape before it reaches a component."
 *
 * Backend error contract (Implementation Plan §0):
 *   { "error": string, "message": string }
 *
 * HTTP → kind mapping:
 *   400  → 'validation_error'   (domain-level rule failure)
 *   404  → 'not_found'
 *   409  → 'conflict'
 *   422  → 'validation_error'   (Pydantic schema failure)
 *   5xx  → 'internal_server_error'
 */

export type ApiErrorKind =
  | 'not_found'
  | 'conflict'
  | 'validation_error'
  | 'internal_server_error'
  | 'network_error'

export interface ApiError {
  kind: ApiErrorKind
  message: string
  status: number
}

/** Type guard — narrows an unknown catch value to ApiError. */
export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    'message' in value &&
    'status' in value
  )
}
