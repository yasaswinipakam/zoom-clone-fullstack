import React from "react";
import { Calendar } from "lucide-react";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/ui";
import { MeetingCard } from "@/components/dashboard/MeetingCard";
import type { Meeting } from "@/types/meeting";
import type { ApiError } from "@/types/api-error";

interface UpcomingMeetingsSectionProps {
  meetings: Meeting[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
}

export const UpcomingMeetingsSection: React.FC<
  UpcomingMeetingsSectionProps
> = ({ meetings, isLoading, isError, error, onRetry }) => {
  const errorMessage =
    isError && error !== null && typeof error === "object" && "message" in error
      ? (error as ApiError).message
      : "Failed to load upcoming meetings.";

  return (
    <section aria-labelledby="upcoming-heading">
      <div className="flex items-center justify-between mb-4">
        <h2
          id="upcoming-heading"
          className="text-xl font-semibold text-[#0f172a]"
        >
          Upcoming Meetings
        </h2>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="Couldn't load upcoming meetings"
          message={errorMessage}
          onRetry={onRetry}
        />
      ) : !meetings || meetings.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-10 h-10" aria-hidden="true" />}
          title="No upcoming meetings"
          message="Schedule a meeting to see it here, or start an instant one."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {meetings.map((meeting) => (
            <MeetingCard key={meeting.id} meeting={meeting} />
          ))}
        </div>
      )}
    </section>
  );
};
