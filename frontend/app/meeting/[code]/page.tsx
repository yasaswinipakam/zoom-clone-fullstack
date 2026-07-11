"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ParticipantGrid } from "@/components/meeting/ParticipantGrid";
import { MeetingToolbar } from "@/components/meeting/MeetingToolbar";
import { ParticipantsPanel } from "@/components/meeting/ParticipantsPanel";
import { InviteDialog } from "@/components/meeting/InviteDialog";
import { useMeetingByCode } from "@/hooks/queries/useMeetingByCode";
import { useParticipants } from "@/hooks/queries/useParticipants";
import { useEndMeeting } from "@/hooks/mutations/useEndMeeting";
import { useLeaveMeeting } from "@/hooks/mutations/useLeaveMeeting";
import { useRemoveParticipant } from "@/hooks/mutations/useRemoveParticipant";

interface MeetingPageProps {
  params: Promise<{ code: string }>;
}

function formatElapsed(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// ─── End-meeting confirmation dialog ────────────────────────────────────────
interface EndConfirmProps {
  onEndForAll: () => void;
  onLeaveOnly: () => void;
  onCancel: () => void;
  isEnding: boolean;
}
function EndConfirmDialog({
  onEndForAll,
  onLeaveOnly,
  onCancel,
  isEnding,
}: EndConfirmProps) {
  return (
    <>
      <div
        className="fixed inset-0 z-50"
        style={{ background: "rgba(0,0,0,0.7)" }}
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="end-confirm-title"
      >
        <div
          className="w-full max-w-[360px] rounded-2xl p-6 flex flex-col gap-4"
          style={{
            background: "#252527",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.8)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2
            id="end-confirm-title"
            className="text-[17px] font-semibold text-white"
          >
            End this meeting?
          </h2>
          <p className="text-[13px] text-[#888888]">
            You can leave the meeting and let others continue, or end it for
            everyone.
          </p>
          <div className="flex flex-col gap-2 mt-1">
            <button
              onClick={onEndForAll}
              disabled={isEnding}
              className="w-full py-2.5 rounded-xl text-[14px] font-semibold text-white flex items-center justify-center gap-2 transition-all focus-visible:outline-2 focus-visible:outline-white disabled:opacity-50"
              style={{ background: "#e3371e" }}
              id="end-for-all-btn"
            >
              {isEnding ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : null}
              End Meeting for All
            </button>
            <button
              onClick={onLeaveOnly}
              className="w-full py-2.5 rounded-xl text-[14px] font-medium text-white transition-all focus-visible:outline-2 focus-visible:outline-white"
              style={{ background: "#3a3a3c" }}
              id="leave-only-btn"
            >
              Leave Meeting
            </button>
            <button
              onClick={onCancel}
              className="w-full py-2 text-[14px] text-[#888888] hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-[#0b5cff] rounded-xl"
              id="end-cancel-btn"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function RemoveConfirmDialog({ onConfirm, onCancel, isRemoving }: { onConfirm: () => void; onCancel: () => void; isRemoving: boolean }) {
  return <><div className="fixed inset-0 z-50" style={{ background: "rgba(0,0,0,0.7)" }} onClick={onCancel} aria-hidden="true" /><div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="remove-confirm-title"><div className="w-full max-w-[360px] rounded-2xl p-6 flex flex-col gap-4" style={{ background: "#252527", border: "1px solid rgba(255,255,255,0.1)" }}><h2 id="remove-confirm-title" className="text-[17px] font-semibold text-white">Remove participant?</h2><p className="text-[13px] text-[#888888]">They will be removed from this meeting.</p><div className="flex justify-end gap-2"><button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm text-white bg-[#3a3a3c]">Cancel</button><button onClick={onConfirm} disabled={isRemoving} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#e3371e] disabled:opacity-50">{isRemoving ? "Removing…" : "Remove"}</button></div></div></div></>;
}

// ─── Meeting Room ─────────────────────────────────────────────────────────────
export default function MeetingPage({ params }: MeetingPageProps) {
  const { code } = use(params);
  const router = useRouter();

  // UI state
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [participantToRemove, setParticipantToRemove] = useState<number | null>(null);
  const [mutedParticipantIds, setMutedParticipantIds] = useState<number[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // ── Fetch meeting + participants (5s polling) ────────────────────────────
  const meetingQuery = useMeetingByCode(code);
  const participantsQuery = useParticipants(code);

  const meeting = meetingQuery.data;
  const participants = (participantsQuery.data ?? []).map((participant) => ({
    ...participant,
    audio_status: mutedParticipantIds.includes(participant.id) ? "MUTED" : participant.audio_status,
  }));
  const activeCount = participants.filter(
    (p) => p.participant_status === "CONNECTED"
  ).length;

  // Retrieve self participant ID saved by useJoinMeeting / useStartMeeting
  const selfParticipantId =
    typeof window !== "undefined"
      ? Number(sessionStorage.getItem(`participant_${code}`)) || undefined
      : undefined;

  // Host capabilities belong to the current meeting participant, not to a
  // browser-wide user ID. This keeps guests from inheriting host controls.
  const isHost = participants.some(
    (participant) => participant.id === selfParticipantId && participant.is_host
  );

  // ── Elapsed timer ────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Mutations ────────────────────────────────────────────────────────────
  const { mutate: endMeeting, isPending: isEnding } = useEndMeeting();
  const { mutate: leaveMeeting, isPending: isLeaving } = useLeaveMeeting();
  const { mutate: removeParticipant, isPending: isRemoving } =
    useRemoveParticipant();

  // Leave (any participant)
  const handleLeave = useCallback(() => {
    if (!selfParticipantId) {
      router.push("/dashboard");
      return;
    }
    leaveMeeting({ code, participantId: selfParticipantId });
  }, [code, leaveMeeting, selfParticipantId, router]);

  // End / Leave click — host sees confirmation, non-host leaves immediately
  const handleEndOrLeaveClick = useCallback(() => {
    if (isHost) {
      setShowEndConfirm(true);
    } else {
      handleLeave();
    }
  }, [isHost, handleLeave]);

  // Host: end for all
  const handleEndForAll = useCallback(() => {
    endMeeting(code);
  }, [code, endMeeting]);

  // Host-only: remove a participant
  const handleRemove = useCallback(
    (participantId: number) => {
      if (!isHost) return; // extra guard
      setParticipantToRemove(participantId);
    },
    [isHost]
  );

  // ── Loading state ────────────────────────────────────────────────────────
  if (meetingQuery.isLoading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: "#1a1a1a" }}
      >
        <div className="flex flex-col items-center gap-4">
          <Loader2
            className="w-10 h-10 text-[#0b5cff] animate-spin"
            aria-hidden="true"
          />
          <p className="text-[#888888] text-[15px]">Joining meeting…</p>
        </div>
      </div>
    );
  }

  // ── Error / not found ────────────────────────────────────────────────────
  if (meetingQuery.isError || !meeting) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: "#1a1a1a" }}
      >
        <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ border: "2px solid #e3371e" }}
          >
            <AlertCircle
              className="w-8 h-8 text-[#e3371e]"
              aria-hidden="true"
            />
          </div>
          <h1 className="text-xl font-semibold text-white">Meeting Not Found</h1>
          <p className="text-[#888888] text-sm">
            This meeting doesn&apos;t exist or has ended.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-2 px-5 py-2 rounded-xl text-[14px] font-medium text-white"
            style={{ background: "#0b5cff" }}
            id="not-found-back-btn"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Meeting ended ────────────────────────────────────────────────────────
  if (meeting.status === "ENDED") {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: "#1a1a1a" }}
      >
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <div className="w-20 h-20 rounded-full bg-[#2a2a2a] flex items-center justify-center">
            <span className="text-4xl" aria-hidden="true">
              📵
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-white">Meeting Ended</h1>
          <p className="text-[#888888] text-sm">
            The host ended this meeting.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-2 px-6 py-2.5 rounded-xl text-[14px] font-semibold text-white"
            style={{ background: "#0b5cff" }}
            id="ended-back-btn"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Active meeting room ──────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ background: "#1a1a1a" }}
    >
      {/* ── Top info bar ──────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-2 flex-shrink-0 z-10"
        style={{ background: "rgba(0,0,0,0.4)" }}
        role="banner"
      >
        {/* Left: live badge + title + elapsed */}
        <div className="flex items-center gap-3">
          {meeting.status === "ACTIVE" && (
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full bg-green-400 animate-pulse"
                aria-hidden="true"
              />
              <span className="text-[12px] text-green-400 font-semibold tracking-wide">
                LIVE
              </span>
            </div>
          )}
          <span className="text-[13px] text-[#cccccc] font-medium truncate max-w-[300px]">
            {meeting.title ?? "Meeting"}
          </span>
          <span className="text-[12px] text-[#666666] tabular-nums">
            {formatElapsed(elapsedSeconds)}
          </span>
          {/* Host badge */}
          {isHost && (
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
              style={{ background: "#0b5cff" }}
            >
              HOST
            </span>
          )}
        </div>

        {/* Right: meeting code + date */}
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-[#555555] font-mono">{code}</span>
          <span className="text-[12px] text-[#666666]">
            {format(new Date(), "EEE, MMM d")}
          </span>
        </div>
      </div>

      {/* ── Content: grid + panel ────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Participant grid — leaves room for toolbar */}
        <div className="flex-1 flex flex-col min-h-0 pb-[72px]">
          <ParticipantGrid
            participants={participants}
            selfParticipantId={selfParticipantId}
          />
        </div>

        {/* Participants side panel */}
        {showParticipants && (
          <div className="absolute right-0 top-0 bottom-0 z-10 pb-[72px] flex">
            <ParticipantsPanel
              participants={participants}
              selfParticipantId={selfParticipantId}
              isHost={isHost}
              isRemoving={isRemoving}
              onRemove={handleRemove}
              onMuteAll={() => setMutedParticipantIds(participants.map((participant) => participant.id))}
              onClose={() => setShowParticipants(false)}
            />
          </div>
        )}

        {/* Floating toolbar */}
        <MeetingToolbar
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          participantCount={activeCount}
          showParticipants={showParticipants}
          isHost={isHost}
          onToggleMic={() => setIsMuted((m) => !m)}
          onToggleCamera={() => setIsCameraOff((c) => !c)}
          onToggleParticipants={() => setShowParticipants((s) => !s)}
          onInvite={() => setShowInvite(true)}
          onLeave={handleLeave}
          onEnd={handleEndOrLeaveClick}
        />
      </div>

      {/* ── Dialogs ──────────────────────────────────────────────── */}
      {showInvite && (
        <InviteDialog
          meetingCode={code}
          onClose={() => setShowInvite(false)}
        />
      )}

      {showEndConfirm && isHost && (
        <EndConfirmDialog
          onEndForAll={handleEndForAll}
          onLeaveOnly={() => {
            setShowEndConfirm(false);
            handleLeave();
          }}
          onCancel={() => setShowEndConfirm(false)}
          isEnding={isEnding}
        />
      )}

      {participantToRemove !== null && (
        <RemoveConfirmDialog
          onConfirm={() => { removeParticipant({ code, participantId: participantToRemove }); setParticipantToRemove(null); }}
          onCancel={() => setParticipantToRemove(null)}
          isRemoving={isRemoving}
        />
      )}

      {/* ── Full-screen loading overlays ─────────────────────────── */}
      {(isLeaving || isEnding) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.75)" }}
          aria-live="assertive"
          role="status"
        >
          <div className="flex flex-col items-center gap-3 text-white">
            <Loader2
              className="w-8 h-8 animate-spin text-[#0b5cff]"
              aria-hidden="true"
            />
            <p className="text-[15px]">
              {isEnding ? "Ending meeting for all…" : "Leaving meeting…"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
