"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Calendar, Copy, Check, Play, LogIn } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardFooter, Badge, Button } from "@/components/ui";
import { useStartMeeting } from "@/hooks/mutations/useStartMeeting";
import type { Meeting } from "@/types/meeting";

interface MeetingCardProps {
  meeting: Meeting;
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
  return (
    <Badge variant={variantMap[status]}>{labelMap[status]}</Badge>
  );
}

function formatMeetingDate(isoString?: string): string {
  if (!isoString) return "—";
  try {
    return format(parseISO(isoString), "MMM d, yyyy · h:mm a");
  } catch {
    return isoString;
  }
}

export const MeetingCard: React.FC<MeetingCardProps> = ({ meeting }) => {
  const [copied, setCopied] = useState(false);
  const { mutate: startMeeting, isPending: isStarting } = useStartMeeting();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(meeting.meeting_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available (e.g. insecure context) — silent fail
    }
  };

  const dateLabel =
    meeting.status === "ENDED"
      ? `Ended ${formatMeetingDate(meeting.updated_at)}`
      : meeting.scheduled_at
      ? formatMeetingDate(meeting.scheduled_at)
      : `Created ${formatMeetingDate(meeting.created_at)}`;

  return (
    <Card className="flex flex-col justify-between gap-4 hover:shadow-elevated transition-shadow">
      <CardContent className="p-0 flex flex-col gap-2">
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
      </CardContent>

      <CardFooter className="p-0 border-0 mt-0 pt-3 border-t border-[#e2e8f0] justify-start gap-2">
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
            <Button
              variant="primary"
              size="sm"
              id={`join-meeting-${meeting.id}`}
            >
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
      </CardFooter>
    </Card>
  );
};
