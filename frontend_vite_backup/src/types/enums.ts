/**
 * Enum types — verbatim match to backend StrEnum values.
 *
 * Constitution §7: "Enum values (frontend TypeScript) — Verbatim match to
 * backend StrEnum values — never re-cased or re-worded."
 *
 * Verified against:
 *   app/models/enums.py — MeetingType, MeetingStatus, ParticipantStatus
 */

export type MeetingType = 'INSTANT' | 'SCHEDULED'

export type MeetingStatus = 'SCHEDULED' | 'ACTIVE' | 'ENDED'

export type ParticipantStatus = 'CONNECTED' | 'DISCONNECTED' | 'LEFT'
