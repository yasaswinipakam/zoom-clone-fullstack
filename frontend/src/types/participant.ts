import type { ParticipantStatus } from "./enums";

export interface Participant {
  id: number;
  meeting_code: string;
  display_name: string;
  status: ParticipantStatus;
  host_id?: number;
  created_at: string;
  updated_at: string;
}

export interface ParticipantCreate {
  display_name: string;
  host_id?: number;
}
