"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Video, CalendarPlus, LogIn } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui";
import { UpcomingMeetingsSection } from "@/components/dashboard/UpcomingMeetingsSection";
import { RecentMeetingsSection } from "@/components/dashboard/RecentMeetingsSection";
import { useUpcomingMeetings } from "@/hooks/queries/useUpcomingMeetings";
import { useRecentMeetings } from "@/hooks/queries/useRecentMeetings";
import { useCreateMeeting } from "@/hooks/mutations/useCreateMeeting";
import { useCurrentUser } from "@/context/CurrentUserContext";
import type { ApiError } from "@/types/api-error";

// ─── Toast ────────────────────────────────────────────────────────
interface ToastProps {
  message: string;
  type: "error" | "success";
  onDismiss: () => void;
}

function Toast({ message, type, onDismiss }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-modal text-white text-sm font-medium max-w-sm transition-all ${
        type === "error" ? "bg-danger" : "bg-success"
      }`}
    >
      <span className="flex-1">{message}</span>
      <button
        onClick={onDismiss}
        className="text-white/80 hover:text-white focus-visible:outline-2 focus-visible:outline-white rounded"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

// ─── Dashboard Page ────────────────────────────────────────────────
export default function DashboardPage() {
  const { hostId, displayName } = useCurrentUser();
  const [toastError, setToastError] = useState<string | null>(null);

  const upcoming = useUpcomingMeetings(hostId);
  const recent = useRecentMeetings(hostId);
  const { mutate: createMeeting, isPending: isCreating } = useCreateMeeting();

  const handleNewMeeting = () => {
    createMeeting(
      { type: "INSTANT", host_id: hostId, title: "Instant Meeting" },
      {
        onError: (err: unknown) => {
          const apiErr = err as ApiError;
          setToastError(apiErr?.message ?? "Failed to create meeting");
        },
      }
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc]">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Page header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-[#64748b] font-medium mb-0.5">
              Welcome back, {displayName}
            </p>
            <h1 className="text-3xl font-bold text-[#0f172a] tracking-tight">
              Dashboard
            </h1>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={handleNewMeeting}
              isLoading={isCreating}
              id="dashboard-new-meeting"
            >
              <Video className="w-4 h-4" aria-hidden="true" />
              New Meeting
            </Button>
            <Link href="/join" tabIndex={-1}>
              <Button variant="secondary" size="md" id="dashboard-join-meeting">
                <LogIn className="w-4 h-4" aria-hidden="true" />
                Join
              </Button>
            </Link>
            <Link href="/schedule" tabIndex={-1}>
              <Button variant="secondary" size="md" id="dashboard-schedule-meeting">
                <CalendarPlus className="w-4 h-4" aria-hidden="true" />
                Schedule
              </Button>
            </Link>
          </div>
        </header>

        {/* Divider */}
        <hr className="border-[#e2e8f0]" />

        {/* Upcoming meetings */}
        <UpcomingMeetingsSection
          meetings={upcoming.data}
          isLoading={upcoming.isLoading}
          isError={upcoming.isError}
          error={upcoming.error}
          onRetry={() => upcoming.refetch()}
        />

        {/* Recent meetings */}
        <RecentMeetingsSection
          meetings={recent.data}
          isLoading={recent.isLoading}
          isError={recent.isError}
          error={recent.error}
          onRetry={() => recent.refetch()}
        />
      </main>

      {/* Toast notification */}
      {toastError && (
        <Toast
          message={toastError}
          type="error"
          onDismiss={() => setToastError(null)}
        />
      )}
    </div>
  );
}
