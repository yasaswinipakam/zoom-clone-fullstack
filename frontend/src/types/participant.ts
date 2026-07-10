/**
 * Participant types — mirrored from backend Pydantic schemas.
 *
 * Source of truth: app/schemas/participant.py
 * Verified against: GET /api/v1/meetings/{code}/participants, etc.
 */

import type { ParticipantStatus } from '@/types/enums'

// ---------------------------------------------------------------------------
// Request shapes
// ---------------------------------------------------------------------------

export interface ParticipantCreate {
  display_name: string // 1–100 chars per backend validation
}

export interface ParticipantUpdate {
  display_name?: string
  participant_status?: ParticipantStatus
  is_host?: boolean
}

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

export interface ParticipantResponse {
  id: number
  meeting_id: number
  display_name: string
  participant_status: ParticipantStatus
  is_host: boolean
  joined_at: string // ISO 8601 UTC
  left_at: string | null
  created_at: string
  updated_at: string
}

export interface ParticipantListResponse {
  participants: ParticipantResponse[]
  total: number
}
