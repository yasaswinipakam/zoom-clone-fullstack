import type { ParticipantStatus } from "./enums";

export interface Participant {
  id: number;
  meeting_id: number;
  display_name: string;
  participant_status: ParticipantStatus;
  is_host: boolean;
  joined_at: string;
  left_at?: string;
  created_at: string;
  updated_at: string;
  /** UI-only — visual toggle state, not persisted in backend */
  audio_status?: "ACTIVE" | "MUTED";
  /** UI-only — visual toggle state, not persisted in backend */
  video_status?: "ON" | "OFF";
}

export interface ParticipantCreate {
  display_name: string;
  is_host?: boolean;
}
