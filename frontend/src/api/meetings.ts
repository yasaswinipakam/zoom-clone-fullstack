/**
 * Meetings API module.
 *
 * Constitution §6.4: only api/client.ts imports axios; this module
 * imports apiClient from there.
 * Constitution §6.2: api/ may import from types/ only.
 *
 * Every function maps 1:1 to a backend endpoint (Implementation Plan §9).
 */

import { apiClient } from '@/api/client'
import type { MeetingCreate, MeetingListResponse, MeetingResponse, MeetingStatusResponse, MeetingUpdate } from '@/types/meeting'

const BASE = '/api/v1/meetings'

export const meetingsApi = {
  /** POST /api/v1/meetings */
  createMeeting: (payload: MeetingCreate): Promise<MeetingResponse> =>
    apiClient.post<MeetingResponse>(BASE, payload).then((r) => r.data),

  /** GET /api/v1/meetings/upcoming */
  listUpcoming: (params?: { host_id?: number; limit?: number }): Promise<MeetingListResponse> =>
    apiClient.get<MeetingListResponse>(`${BASE}/upcoming`, { params }).then((r) => r.data),

  /** GET /api/v1/meetings/recent */
  listRecent: (params?: { host_id?: number; limit?: number }): Promise<MeetingListResponse> =>
    apiClient.get<MeetingListResponse>(`${BASE}/recent`, { params }).then((r) => r.data),

  /** GET /api/v1/meetings/{meeting_id} */
  getMeetingById: (id: number): Promise<MeetingResponse> =>
    apiClient.get<MeetingResponse>(`${BASE}/${id}`).then((r) => r.data),

  /** GET /api/v1/meetings/code/{meeting_code} */
  getMeetingByCode: (code: string): Promise<MeetingResponse> =>
    apiClient.get<MeetingResponse>(`${BASE}/code/${code}`).then((r) => r.data),

  /** PATCH /api/v1/meetings/{meeting_id} */
  updateMeeting: (id: number, payload: MeetingUpdate): Promise<MeetingResponse> =>
    apiClient.patch<MeetingResponse>(`${BASE}/${id}`, payload).then((r) => r.data),

  /** DELETE /api/v1/meetings/{meeting_id} — returns 204 No Content */
  deleteMeeting: (id: number): Promise<void> =>
    apiClient.delete(`${BASE}/${id}`).then(() => undefined),

  /** POST /api/v1/meetings/{meeting_code}/start */
  startMeeting: (code: string): Promise<MeetingResponse> =>
    apiClient.post<MeetingResponse>(`${BASE}/${code}/start`).then((r) => r.data),

  /** POST /api/v1/meetings/{meeting_code}/end */
  endMeeting: (code: string): Promise<MeetingResponse> =>
    apiClient.post<MeetingResponse>(`${BASE}/${code}/end`).then((r) => r.data),

  /** GET /api/v1/meetings/{meeting_code}/status */
  getStatus: (code: string): Promise<MeetingStatusResponse> =>
    apiClient.get<MeetingStatusResponse>(`${BASE}/${code}/status`).then((r) => r.data),
}
