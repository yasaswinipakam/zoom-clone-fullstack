"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Video,
  Plus,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { format } from "date-fns";
import { AppShell } from "@/components/layout/AppShell";
import { MeetingCard } from "@/components/dashboard/MeetingCard";
import { JoinModal } from "@/components/dashboard/JoinModal";
import { ScheduleModal } from "@/components/dashboard/ScheduleModal";
import { CardSkeleton } from "@/components/ui";
import { useUpcomingMeetings } from "@/hooks/queries/useUpcomingMeetings";
import { useRecentMeetings } from "@/hooks/queries/useRecentMeetings";
import { useCreateMeeting } from "@/hooks/mutations/useCreateMeeting";
import { useCurrentUser } from "@/context/CurrentUserContext";
import type { ApiError } from "@/types/api-error";

// ─── Live Clock ───────────────────────────────────────────────────────────────
function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const timeLabel = now ? format(now, "h:mm a") : "--:--";
  const dateLabel = now ? format(now, "EEEE, d MMMM") : "";
  return (
    <div className="text-center select-none mb-8">
      <p
        className="text-white leading-none tracking-tight"
        style={{ fontSize: "clamp(48px, 8vw, 68px)", fontWeight: 300, letterSpacing: "-1px" }}
      >
        {timeLabel}
      </p>
      <p className="text-[#888888] text-[15px] font-normal mt-2">
        {dateLabel}
      </p>
    </div>
  );
}

// ─── Zoom Action Button ───────────────────────────────────────────────────────
interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  bgColor: string;
  onClick?: () => void;
  href?: string;
  isLoading?: boolean;
  id: string;
  hasDropdown?: boolean;
}

function ActionButton({ icon, label, bgColor, onClick, href, isLoading, id, hasDropdown }: ActionButtonProps) {
  const btnEl = (
    <div className="flex flex-col items-center gap-[10px] group">
      <div className="relative">
        <button
          id={id}
          onClick={onClick}
          disabled={isLoading}
          style={{ background: bgColor }}
          className="w-[60px] h-[60px] rounded-[18px] flex items-center justify-center transition-all duration-100 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 disabled:opacity-60 hover:brightness-110 active:brightness-90 active:scale-95 shadow-lg"
          aria-label={label}
        >
          {isLoading ? (
            <span className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
          ) : (
            icon
          )}
        </button>
        {hasDropdown && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#2c2c2e] border border-[#3a3a3a] flex items-center justify-center">
            <ChevronRight className="w-2.5 h-2.5 text-[#aaaaaa] rotate-90" />
          </div>
        )}
      </div>
      <span className="text-[13px] text-[#cccccc] font-normal leading-tight text-center whitespace-nowrap">
        {label}
      </span>
    </div>
  );

  if (href) {
    return <Link href={href}>{btnEl}</Link>;
  }
  return btnEl;
}

// ─── Umbrella Empty State ─────────────────────────────────────────────────────
function UmbrellaEmptyState({ onSchedule }: { onSchedule?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 py-10">
      {/* Zoom's beach/umbrella illustration */}
      <svg
        width="100"
        height="90"
        viewBox="0 0 100 90"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="mb-4 opacity-80"
        aria-hidden="true"
      >
        {/* Sand/ground */}
        <ellipse cx="50" cy="80" rx="32" ry="5" fill="#3a3a4a" />
        {/* Umbrella pole */}
        <line x1="50" y1="32" x2="54" y2="78" stroke="#6a6a8a" strokeWidth="2.5" strokeLinecap="round"/>
        {/* Umbrella canopy - layered */}
        <path d="M18 38 Q50 8 82 38" fill="#7b7baa" />
        <path d="M18 38 Q50 14 82 38" fill="none" stroke="#9090bb" strokeWidth="1"/>
        {/* Canopy ribs */}
        <path d="M50 12 L50 38" stroke="#9090bb" strokeWidth="1" opacity="0.5"/>
        <path d="M34 14 L40 38" stroke="#9090bb" strokeWidth="1" opacity="0.5"/>
        <path d="M66 14 L60 38" stroke="#9090bb" strokeWidth="1" opacity="0.5"/>
        <path d="M22 26 L30 38" stroke="#9090bb" strokeWidth="1" opacity="0.5"/>
        <path d="M78 26 L70 38" stroke="#9090bb" strokeWidth="1" opacity="0.5"/>
        {/* Canopy edge scallop */}
        <path d="M18 38 Q24 44 30 38 Q36 44 42 38 Q48 44 54 38 Q60 44 66 38 Q72 44 78 38 Q80 38 82 38" fill="#6868a0" />
        {/* Pole curved bottom */}
        <path d="M54 78 Q58 82 62 80" stroke="#6a6a8a" strokeWidth="2" strokeLinecap="round" fill="none"/>
      </svg>
      <p className="text-[14px] text-[#888888] font-normal">No meetings scheduled.</p>
      <Link
        href="/schedule"
        className="mt-1.5 text-[14px] text-[#0b5cff] hover:underline focus-visible:outline-2 focus-visible:outline-[#0b5cff] rounded"
      >
        + Schedule a meeting
      </Link>
    </div>
  );
}

// ─── Calendar Panel ───────────────────────────────────────────────────────────
interface CalendarPanelProps {
  upcomingMeetings: ReturnType<typeof useUpcomingMeetings>;
  recentMeetings: ReturnType<typeof useRecentMeetings>;
}

function CalendarPanel({ upcomingMeetings, recentMeetings }: CalendarPanelProps) {
  const [activeTab, setActiveTab] = useState<"upcoming" | "recent">("upcoming");
  const now = new Date();

  const src = activeTab === "upcoming" ? upcomingMeetings : recentMeetings;
  const { data: meetings, isLoading, isError, refetch } = src;

  return (
    <div
      className="w-full max-w-[400px] flex flex-col rounded-[12px] overflow-hidden"
      style={{
        background: "#2c2c2e",
        border: "1px solid rgba(255,255,255,0.08)",
        minHeight: "340px",
      }}
    >
      {/* Row 1: + | "Today, Jul 11 ›" | ··· */}
      <div
        className="flex items-center justify-between px-3 py-2.5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <button
          className="w-7 h-7 flex items-center justify-center rounded-md text-[#888888] hover:text-[#cccccc] hover:bg-white/8 transition-colors focus-visible:outline-2 focus-visible:outline-[#0b5cff]"
          aria-label="New meeting"
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
        </button>
        <button className="flex items-center gap-1 text-[13px] font-medium text-[#cccccc] hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-[#0b5cff] rounded">
          <span>Today, {format(now, "MMM d")}</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#666666]" />
        </button>
        <button
          className="w-7 h-7 flex items-center justify-center rounded-md text-[#888888] hover:text-[#cccccc] hover:bg-white/8 transition-colors"
          aria-label="More options"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Row 2: [📅 Today] [<] [>]   [Upcoming] [Recent] [↻] [···] */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        {/* Left: Today nav */}
        <div className="flex items-center gap-1">
          <button
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[#888888] hover:text-[#cccccc] hover:bg-white/5 transition-colors text-xs font-medium focus-visible:outline-2 focus-visible:outline-[#0b5cff]"
            aria-label="Jump to today"
          >
            <CalendarDays className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Today</span>
          </button>
          <button
            className="w-6 h-6 flex items-center justify-center rounded text-[#666666] hover:text-[#cccccc] hover:bg-white/5 transition-colors"
            aria-label="Previous day"
          >
            <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
          <button
            className="w-6 h-6 flex items-center justify-center rounded text-[#666666] hover:text-[#cccccc] hover:bg-white/5 transition-colors"
            aria-label="Next day"
          >
            <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </div>

        {/* Right: Upcoming | Recent | ↻ | ··· */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#0b5cff] ${
              activeTab === "upcoming"
                ? "bg-[#0b5cff] text-white"
                : "text-[#888888] hover:text-[#cccccc] hover:bg-white/5"
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setActiveTab("recent")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#0b5cff] ${
              activeTab === "recent"
                ? "bg-[#0b5cff] text-white"
                : "text-[#888888] hover:text-[#cccccc] hover:bg-white/5"
            }`}
          >
            Recent
          </button>
          <button
            onClick={() => refetch()}
            className="w-6 h-6 flex items-center justify-center rounded text-[#666666] hover:text-[#cccccc] hover:bg-white/5 transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
          <button
            className="w-6 h-6 flex items-center justify-center rounded text-[#666666] hover:text-[#cccccc] hover:bg-white/5 transition-colors"
            aria-label="More options"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 overflow-y-auto" style={{ minHeight: "240px" }}>
        {isLoading ? (
          <div className="p-3 space-y-2">
            {[0, 1, 2].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center flex-1 py-10 text-center px-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
              style={{ border: "2px solid #e3371e" }}
            >
              <span className="text-[#e3371e] text-lg font-bold leading-none">!</span>
            </div>
            <p className="text-[13px] text-[#0b5cff] mb-1">Couldn&apos;t load meetings</p>
            <p className="text-[12px] text-[#888888] mb-3">Check your connection and try again.</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-1.5 bg-white text-[#1c1c1e] text-[13px] font-medium rounded-md hover:bg-[#e8e8e8] transition-colors focus-visible:outline-2 focus-visible:outline-[#0b5cff]"
            >
              Try Again
            </button>
          </div>
        ) : !meetings || meetings.length === 0 ? (
          <UmbrellaEmptyState />
        ) : (
          <div className="p-2 space-y-1.5">
            {meetings.map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} dark />
            ))}
          </div>
        )}
      </div>

      {/* Footer: Open recordings */}
      <div
        className="flex items-center px-3 py-2.5"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
      >
        <button className="flex items-center gap-2 text-[13px] text-[#888888] hover:text-[#cccccc] transition-colors focus-visible:outline-2 focus-visible:outline-[#0b5cff] rounded w-full">
          <RotateCcw className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
          <span>Open recordings</span>
          <ChevronRight className="w-3.5 h-3.5 ml-auto" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed bottom-6 right-6 z-50 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 max-w-sm"
      style={{ background: "#e3371e" }}
    >
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="text-white/70 hover:text-white" aria-label="Dismiss">✕</button>
    </div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { hostId } = useCurrentUser();
  const [toastError, setToastError] = useState<string | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Auto-open modal when redirected from /join or /schedule route
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("join") === "true") {
        setJoinCode(params.get("code") ?? "");
        setShowJoinModal(true);
        window.history.replaceState({}, "", "/dashboard");
      }
      if (params.get("schedule") === "true") {
        setShowScheduleModal(true);
        window.history.replaceState({}, "", "/dashboard");
      }
    }
  }, []);

  const upcomingMeetings = useUpcomingMeetings(hostId);
  const recentMeetings = useRecentMeetings(hostId);
  const { mutate: createMeeting, isPending: isCreating } = useCreateMeeting();

  const handleNewMeeting = useCallback(() => {
    createMeeting(
      { meeting_type: "INSTANT", host_id: hostId, title: "Instant Meeting" },
      {
        onError: (err: unknown) => {
          const apiErr = err as ApiError;
          setToastError(apiErr?.message ?? "Failed to create meeting");
        },
      }
    );
  }, [createMeeting, hostId]);


  return (
    <AppShell>
      <div
        className="flex flex-col items-center px-4 sm:px-6 py-8 sm:py-10"
        style={{ background: "#1c1c1e", minHeight: "100%" }}
      >
        {/* Clock */}
        <LiveClock />

        {/* Action buttons — identical spacing and sizes to Zoom Mac */}
        <div className="flex items-start justify-center gap-5 sm:gap-7 mb-8">
          {/* New meeting — orange */}
          <ActionButton
            id="action-new-meeting"
            icon={
              <svg viewBox="0 0 32 32" fill="none" className="w-7 h-7" aria-hidden="true">
                <rect x="3" y="8" width="18" height="16" rx="3" fill="white" />
                <path d="M21 12l8-4v16l-8-4V12z" fill="white" />
              </svg>
            }
            label="New meeting"
            bgColor="linear-gradient(145deg, #f5a928 0%, #e07b1a 100%)"
            onClick={handleNewMeeting}
            isLoading={isCreating}
            hasDropdown
          />
          {/* Join — blue: opens modal over dashboard (matches Zoom Mac) */}
          <ActionButton
            id="action-join"
            icon={
              <svg viewBox="0 0 32 32" fill="none" className="w-7 h-7" aria-hidden="true">
                <rect x="2" y="8" width="20" height="16" rx="3" stroke="white" strokeWidth="2.5" />
                <circle cx="26" cy="16" r="5" fill="white" />
                <path d="M24 16h4M26 14v4" stroke="#0b5cff" strokeWidth="2" strokeLinecap="round" />
              </svg>
            }
            label="Join"
            bgColor="#0b5cff"
            onClick={() => setShowJoinModal(true)}
          />
          {/* Schedule — blue */}
          <ActionButton
            id="action-schedule"
            icon={
              <svg viewBox="0 0 32 32" fill="none" className="w-7 h-7" aria-hidden="true">
                <rect x="4" y="6" width="24" height="22" rx="3" stroke="white" strokeWidth="2.5" />
                <path d="M4 12h24" stroke="white" strokeWidth="2" />
                <path d="M10 4v4M22 4v4" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M10 17h4M10 21h8" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            }
            label="Schedule"
            bgColor="#0b5cff"
            onClick={() => setShowScheduleModal(true)}
          />
        </div>

        {/* Calendar panel */}
        <CalendarPanel
          upcomingMeetings={upcomingMeetings}
          recentMeetings={recentMeetings}
        />
      </div>

      {toastError && (
        <Toast message={toastError} onDismiss={() => setToastError(null)} />
      )}

      {/* Schedule Meeting modal */}
      <ScheduleModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
      />

      {/* Join Meeting modal — overlays dashboard like Zoom Mac */}
      <JoinModal
        isOpen={showJoinModal}
        initialMeetingCode={joinCode}
        onClose={() => setShowJoinModal(false)}
      />
    </AppShell>
  );
}
