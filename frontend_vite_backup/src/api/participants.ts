/**
 * Participants API module.
 *
 * Constitution §6.4: only api/client.ts imports axios.
 * Constitution §6.2: api/ may import from types/ only.
 */

import { apiClient } from '@/api/client'
import type { ParticipantCreate, ParticipantListResponse, ParticipantResponse } from '@/types/participant'
import type { ParticipantStatus } from '@/types/enums'

const meetingBase = (code: string) => `/api/v1/meetings/${code}/participants`

export const participantsApi = {
  /** POST /api/v1/meetings/{meeting_code}/participants */
  joinMeeting: (code: string, payload: ParticipantCreate): Promise<ParticipantResponse> =>
    apiClient.post<ParticipantResponse>(meetingBase(code), payload).then((r) => r.data),

  /** GET /api/v1/meetings/{meeting_code}/participants */
  listParticipants: (
    code: string,
    status?: ParticipantStatus,
  ): Promise<ParticipantListResponse> =>
    apiClient
      .get<ParticipantListResponse>(meetingBase(code), { params: status ? { status } : undefined })
      .then((r) => r.data),

  /** POST /api/v1/meetings/{meeting_code}/participants/{participant_id}/leave */
  leaveMeeting: (code: string, participantId: number): Promise<ParticipantResponse> =>
    apiClient
      .post<ParticipantResponse>(`${meetingBase(code)}/${participantId}/leave`)
      .then((r) => r.data),

  /** DELETE /api/v1/meetings/{meeting_code}/participants/{participant_id} — 204 */
  removeParticipant: (code: string, participantId: number): Promise<void> =>
    apiClient.delete(`${meetingBase(code)}/${participantId}`).then(() => undefined),
}
