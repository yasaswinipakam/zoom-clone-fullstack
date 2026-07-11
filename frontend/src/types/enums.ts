// MeetingType — matches backend enum exactly (case-sensitive)
export type MeetingType = "INSTANT" | "SCHEDULED";

// MeetingStatus — forward-only: SCHEDULED → ACTIVE → ENDED
export type MeetingStatus = "SCHEDULED" | "ACTIVE" | "ENDED";

// ParticipantStatus
export type ParticipantStatus = "CONNECTED" | "DISCONNECTED" | "LEFT";
