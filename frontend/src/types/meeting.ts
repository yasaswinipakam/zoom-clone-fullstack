import type { MeetingType, MeetingStatus } from "./enums";

/** Backend MeetingResponse shape */
export interface Meeting {
  id: number;
  meeting_code: string;
  title?: string;
  description?: string;
  meeting_type: MeetingType;   // backend uses meeting_type, not type
  status: MeetingStatus;
  host_id: number;
  scheduled_at?: string;       // ISO8601 UTC
  duration_minutes?: number;
  started_at?: string;
  ended_at?: string;
  created_at: string;
  updated_at: string;
}

/** Backend MeetingCreate payload */
export interface MeetingCreate {
  title?: string;
  description?: string;
  meeting_type: MeetingType;   // backend field name
  host_id: number;
  scheduled_at?: string;       // required for SCHEDULED
  duration_minutes?: number;   // required for SCHEDULED (5–480 min)
}
