import { apiClient } from "@/api/client";
import type { Meeting, MeetingCreate } from "@/types/meeting";
import type { Participant, ParticipantCreate } from "@/types/participant";

// ─── Meeting Queries ───────────────────────────────────────────────

export async function fetchUpcomingMeetings(
  hostId?: number,
  limit = 10
): Promise<Meeting[]> {
  const params: Record<string, string | number> = { limit };
  if (hostId !== undefined) params.host_id = hostId;
  const { data } = await apiClient.get<Meeting[]>("/api/v1/meetings/upcoming", {
    params,
  });
  return data;
}

export async function fetchRecentMeetings(
  hostId?: number,
  limit = 10
): Promise<Meeting[]> {
  const params: Record<string, string | number> = { limit };
  if (hostId !== undefined) params.host_id = hostId;
  const { data } = await apiClient.get<Meeting[]>("/api/v1/meetings/recent", {
    params,
  });
  return data;
}

export async function getMeetingById(meetingId: number): Promise<Meeting> {
  const { data } = await apiClient.get<Meeting>(
    `/api/v1/meetings/${meetingId}`
  );
  return data;
}

export async function getMeetingByCode(code: string): Promise<Meeting> {
  const { data } = await apiClient.get<Meeting>(
    `/api/v1/meetings/code/${code}`
  );
  return data;
}

export interface MeetingStatusResponse {
  meeting_code: string;
  status: string;
  participant_count: number;
}

export async function getMeetingStatus(
  code: string
): Promise<MeetingStatusResponse> {
  const { data } = await apiClient.get<MeetingStatusResponse>(
    `/api/v1/meetings/${code}/status`
  );
  return data;
}

// ─── Meeting Mutations ─────────────────────────────────────────────

export async function createMeeting(payload: MeetingCreate): Promise<Meeting> {
  const { data } = await apiClient.post<Meeting>("/api/v1/meetings", payload);
  return data;
}

export async function updateMeeting(
  meetingId: number,
  payload: Partial<Pick<Meeting, "title" | "description" | "status">>
): Promise<Meeting> {
  const { data } = await apiClient.patch<Meeting>(
    `/api/v1/meetings/${meetingId}`,
    payload
  );
  return data;
}

export async function deleteMeeting(meetingId: number): Promise<void> {
  await apiClient.delete(`/api/v1/meetings/${meetingId}`);
}

export async function startMeeting(code: string): Promise<Meeting> {
  const { data } = await apiClient.post<Meeting>(
    `/api/v1/meetings/${code}/start`
  );
  return data;
}

export async function endMeeting(code: string): Promise<Meeting> {
  const { data } = await apiClient.post<Meeting>(
    `/api/v1/meetings/${code}/end`
  );
  return data;
}

// ─── Participant Mutations ─────────────────────────────────────────

export async function joinMeeting(
  code: string,
  payload: ParticipantCreate
): Promise<Participant> {
  const { data } = await apiClient.post<Participant>(
    `/api/v1/meetings/${code}/participants`,
    payload
  );
  return data;
}

export async function fetchParticipants(
  code: string,
  status?: string
): Promise<Participant[]> {
  const params: Record<string, string> = {};
  if (status) params.status = status;
  const { data } = await apiClient.get<Participant[]>(
    `/api/v1/meetings/${code}/participants`,
    { params }
  );
  return data;
}

export async function leaveMeeting(
  code: string,
  participantId: number
): Promise<void> {
  await apiClient.post(
    `/api/v1/meetings/${code}/participants/${participantId}/leave`
  );
}

export async function removeParticipant(
  code: string,
  participantId: number
): Promise<void> {
  await apiClient.delete(
    `/api/v1/meetings/${code}/participants/${participantId}`
  );
}
