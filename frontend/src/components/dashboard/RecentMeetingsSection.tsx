import React from "react";
import { Clock } from "lucide-react";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/ui";
import { MeetingCard } from "@/components/dashboard/MeetingCard";
import type { Meeting } from "@/types/meeting";
import type { ApiError } from "@/types/api-error";

interface RecentMeetingsSectionProps {
  meetings: Meeting[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
}

export const RecentMeetingsSection: React.FC<RecentMeetingsSectionProps> = ({
  meetings,
  isLoading,
  isError,
  error,
  onRetry,
}) => {
  const errorMessage =
    isError && error !== null && typeof error === "object" && "message" in error
      ? (error as ApiError).message
      : "Failed to load recent meetings.";

  return (
    <section aria-labelledby="recent-heading">
      <div className="flex items-center justify-between mb-4">
        <h2
          id="recent-heading"
          className="text-xl font-semibold text-[#0f172a]"
        >
          Recent Meetings
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
          title="Couldn't load recent meetings"
          message={errorMessage}
          onRetry={onRetry}
        />
      ) : !meetings || meetings.length === 0 ? (
        <EmptyState
          icon={<Clock className="w-10 h-10" aria-hidden="true" />}
          title="No recent meetings"
          message="Your completed meetings will appear here."
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
