"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Calendar, Copy, Check, Play, LogIn } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Badge, Button } from "@/components/ui";
import { useStartMeeting } from "@/hooks/mutations/useStartMeeting";
import type { Meeting } from "@/types/meeting";
import clsx from "clsx";

interface MeetingCardProps {
  meeting: Meeting;
  /** When true, renders in dark mode for the Zoom-style calendar panel */
  dark?: boolean;
}

function StatusBadge({ status }: { status: Meeting["status"] }) {
  const variantMap = {
    SCHEDULED: "primary",
    ACTIVE: "success",
    ENDED: "neutral",
  } as const;
  const labelMap = {
    SCHEDULED: "Scheduled",
    ACTIVE: "Live",
    ENDED: "Ended",
  };
  return <Badge variant={variantMap[status]}>{labelMap[status]}</Badge>;
}

function formatMeetingDate(isoString?: string): string {
  if (!isoString) return "—";
  try {
    return format(parseISO(isoString), "MMM d, yyyy · h:mm a");
  } catch {
    return isoString;
  }
}

export const MeetingCard: React.FC<MeetingCardProps> = ({
  meeting,
  dark = false,
}) => {
  const [copied, setCopied] = useState(false);
  const { mutate: startMeeting, isPending: isStarting } = useStartMeeting();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(meeting.meeting_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — silent fail
    }
  };

  const dateLabel =
    meeting.status === "ENDED"
      ? `Ended ${formatMeetingDate(meeting.updated_at)}`
      : meeting.scheduled_at
      ? formatMeetingDate(meeting.scheduled_at)
      : `Created ${formatMeetingDate(meeting.created_at)}`;

  /* ── Dark variant (Zoom calendar panel) ── */
  if (dark) {
    return (
      <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-[#2a2a2a] border border-[#383838] hover:border-[#555555] transition-colors">
        {/* Left: color indicator */}
        <div
          className={clsx(
            "w-1 self-stretch rounded-full flex-shrink-0",
            meeting.status === "ACTIVE"
              ? "bg-green-500"
              : meeting.status === "SCHEDULED"
              ? "bg-[#0b5cff]"
              : "bg-[#555555]"
          )}
          aria-hidden="true"
        />

        {/* Center: info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#e8e8e8] truncate">
            {meeting.title ?? "Untitled Meeting"}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Calendar className="w-3 h-3 text-[#888888] flex-shrink-0" aria-hidden="true" />
            <span className="text-xs text-[#888888] truncate">{dateLabel}</span>
          </div>
        </div>

        {/* Right: badge + copy + action */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={meeting.status} />

          <button
            onClick={handleCopy}
            className="p-1 rounded text-[#888888] hover:text-[#cccccc] hover:bg-[#333333] transition-colors focus-visible:outline-2 focus-visible:outline-[#0b5cff]"
            aria-label="Copy meeting code"
            title={copied ? "Copied!" : "Copy code"}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          {meeting.status === "SCHEDULED" && (
            <Button
              variant="primary"
              size="sm"
              isLoading={isStarting}
              onClick={() => startMeeting(meeting.meeting_code)}
              id={`start-meeting-${meeting.id}`}
              className="!py-1 !px-2 !text-xs"
            >
              <Play className="w-3 h-3" aria-hidden="true" />
              Start
            </Button>
          )}

          {meeting.status === "ACTIVE" && (
            <Link href={`/meeting/${meeting.meeting_code}`} tabIndex={-1}>
              <Button
                variant="primary"
                size="sm"
                id={`join-meeting-${meeting.id}`}
                className="!py-1 !px-2 !text-xs"
              >
                <LogIn className="w-3 h-3" aria-hidden="true" />
                Join
              </Button>
            </Link>
          )}

          {meeting.status === "ENDED" && (
            <span className="text-xs text-[#555555] px-1">Ended</span>
          )}
        </div>
      </div>
    );
  }

  /* ── Light variant (white dashboard card grid) ── */
  return (
    <div className="flex flex-col justify-between gap-4 p-4 rounded-lg bg-white border border-[#e2e8f0] shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col gap-2">
        {/* Status + code row */}
        <div className="flex items-center justify-between gap-2">
          <StatusBadge status={meeting.status} />
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 text-xs text-[#64748b] hover:text-[#0f172a] transition-colors focus-visible:outline-2 focus-visible:outline-primary rounded px-1"
            aria-label="Copy meeting code"
            title={copied ? "Copied!" : "Copy meeting code"}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-success" aria-hidden="true" />
            ) : (
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span className="font-mono">{meeting.meeting_code}</span>
          </button>
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-[#0f172a] leading-snug line-clamp-2">
          {meeting.title ?? "Untitled Meeting"}
        </h3>

        {/* Date */}
        <div className="flex items-center gap-1.5 text-sm text-[#64748b]">
          <Calendar className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
          <span>{dateLabel}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-[#e2e8f0]">
        {meeting.status === "SCHEDULED" && (
          <Button
            variant="primary"
            size="sm"
            isLoading={isStarting}
            onClick={() => startMeeting(meeting.meeting_code)}
            id={`start-meeting-${meeting.id}`}
          >
            <Play className="w-3.5 h-3.5" aria-hidden="true" />
            Start
          </Button>
        )}
        {meeting.status === "ACTIVE" && (
          <Link href={`/meeting/${meeting.meeting_code}`} tabIndex={-1}>
            <Button variant="primary" size="sm" id={`join-meeting-${meeting.id}`}>
              <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
              Join
            </Button>
          </Link>
        )}
        {meeting.status === "ENDED" && (
          <Button variant="ghost" size="sm" disabled id={`ended-meeting-${meeting.id}`}>
            Ended
          </Button>
        )}
      </div>
    </div>
  );
};
