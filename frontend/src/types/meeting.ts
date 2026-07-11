import type { MeetingType, MeetingStatus } from "./enums";

export interface Meeting {
  id: number;
  meeting_code: string;
  title?: string;
  description?: string;
  type: MeetingType;
  status: MeetingStatus;
  host_id: number;
  scheduled_at?: string; // ISO8601
  created_at: string;
  updated_at: string;
}

export interface MeetingCreate {
  title?: string;
  description?: string;
  type: MeetingType;
  host_id: number;
  scheduled_at?: string; // ISO8601, only for SCHEDULED type
}
