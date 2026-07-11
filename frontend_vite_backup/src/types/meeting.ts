/**
 * Meeting types — mirrored from backend Pydantic schemas.
 *
 * Source of truth: app/schemas/meeting.py
 * Verified against: GET /api/v1/meetings, /api/v1/meetings/{id}, etc.
 *
 * Field names, optionality, and enum values must exactly match the
 * OpenAPI spec. Any backend schema change requires a manual update here
 * (Implementation Plan §14, Risks: "Divergence between hand-written
 * types and openapi.json").
 */

import type { MeetingStatus, MeetingType } from '@/types/enums'

// ---------------------------------------------------------------------------
// Request shapes
// ---------------------------------------------------------------------------

export interface MeetingCreate {
  meeting_type: MeetingType
  host_id: number
  title?: string
  description?: string
  scheduled_at?: string // ISO 8601 UTC — required when meeting_type is SCHEDULED
  duration_minutes?: number // 5–480
}

export interface MeetingUpdate {
  title?: string
  description?: string
  scheduled_at?: string
  duration_minutes?: number
  status?: MeetingStatus
}

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

export interface MeetingResponse {
  id: number
  meeting_code: string
  title: string
  description: string | null
  meeting_type: MeetingType
  status: MeetingStatus
  host_id: number
  scheduled_at: string | null
  duration_minutes: number | null
  started_at: string | null
  ended_at: string | null
  created_at: string
  updated_at: string
}

export interface MeetingListResponse {
  meetings: MeetingResponse[]
  total: number
}

/** Lightweight payload returned by GET /meetings/{code}/status */
export interface MeetingStatusResponse {
  meeting_code: string
  status: MeetingStatus
  started_at: string | null
  ended_at: string | null
}
