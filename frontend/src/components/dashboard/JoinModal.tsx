"use client";

import React, { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { AlertCircle, Loader2, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useJoinMeeting } from "@/hooks/mutations/useJoinMeeting";
import { useCurrentUser } from "@/context/CurrentUserContext";
import { getMeetingByCode } from "@/api/meetings";
import { parseMeetingCode, looksLikeMeetingCode } from "@/lib/meetingCode";
import type { ApiError } from "@/types/api-error";

interface JoinModalProps {
  isOpen: boolean;
  initialMeetingCode?: string;
  onClose: () => void;
}

export function JoinModal({ isOpen, initialMeetingCode = "", onClose }: JoinModalProps) {
  const { displayName: savedName } = useCurrentUser();
  const [meetingId, setMeetingId] = useState("");
  const [displayName, setDisplayName] = useState(
    savedName === "Host" ? "" : savedName
  );
  const [noAudio, setNoAudio] = useState(false);
  const [noVideo, setNoVideo] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && initialMeetingCode) setMeetingId(initialMeetingCode);
  }, [isOpen, initialMeetingCode]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Passive validation while user types
  const parsed = parseMeetingCode(meetingId);
  const shouldValidate = looksLikeMeetingCode(meetingId);

  const validationQuery = useQuery({
    queryKey: ["meetings", "code", parsed],
    queryFn: () => getMeetingByCode(parsed),
    enabled: shouldValidate,
    retry: 0,
    staleTime: 10_000,
  });

  const resolvedCode =
    validationQuery.isSuccess && shouldValidate ? parsed : parsed;

  const { mutate: joinMeeting, isPending: isJoining } =
    useJoinMeeting(resolvedCode);

  const handleJoin = useCallback(() => {
    setError("");

    const code = parseMeetingCode(meetingId);
    if (!meetingId.trim()) {
      setError("Please enter a meeting ID or link.");
      return;
    }
    if (!displayName.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (displayName.trim().length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }
    if (validationQuery.isError) {
      const apiErr = validationQuery.error as unknown as ApiError;
      setError(apiErr?.message ?? "Meeting not found.");
      return;
    }

    const meeting = validationQuery.data;
    if (meeting?.status === "ENDED") {
      setError("This meeting has already ended.");
      return;
    }

    joinMeeting(
      { display_name: displayName.trim() },
      {
        onError: (err: unknown) => {
          const apiErr = err as ApiError;
          if (apiErr?.error === "conflict") {
            setError("This display name is already taken in the meeting.");
          } else {
            setError(apiErr?.message ?? "Failed to join. Please try again.");
          }
        },
      }
    );
  }, [meetingId, displayName, joinMeeting, validationQuery]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-modal-title"
      >
        <div
          className="w-full max-w-[400px] rounded-[14px] overflow-hidden"
          style={{
            background: "#2c2c2e",
            boxShadow: "0 24px 60px rgba(0,0,0,0.7)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Title bar */}
          <div className="flex items-center justify-between px-6 pt-6 pb-2">
            <h2
              id="join-modal-title"
              className="text-[22px] font-bold text-white leading-tight"
            >
              Join meeting
            </h2>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-full text-[#666666] hover:text-[#aaaaaa] hover:bg-white/8 transition-colors focus-visible:outline-2 focus-visible:outline-[#0b5cff]"
              aria-label="Close"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>

          {/* Form */}
          <div className="px-6 pt-4 pb-5 space-y-3">
            {/* Meeting ID input */}
            <input
              id="join-meeting-id"
              type="text"
              value={meetingId}
              onChange={(e) => {
                setMeetingId(e.target.value);
                setError("");
              }}
              placeholder="Meeting ID or personal link name"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleJoin(); }}
              className="w-full px-3.5 py-2.5 rounded-lg text-[14px] text-white placeholder-[#555555] focus-visible:outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
              onFocus={(e) => { e.currentTarget.style.border = "1px solid #0b5cff"; }}
              onBlur={(e) => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.1)"; }}
              aria-label="Meeting ID or personal link name"
            />

            {/* Your name input */}
            <input
              id="join-display-name"
              type="text"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setError("");
              }}
              placeholder="Your name"
              onKeyDown={(e) => { if (e.key === "Enter") handleJoin(); }}
              className="w-full px-3.5 py-2.5 rounded-lg text-[14px] text-white placeholder-[#555555] focus-visible:outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid #0b5cff", // active by default like Zoom
              }}
              onFocus={(e) => { e.currentTarget.style.border = "1px solid #0b5cff"; }}
              onBlur={(e) => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.1)"; }}
              aria-label="Your name"
            />

            {/* Error */}
            {error && (
              <div
                className="flex items-center gap-2 text-[12px] text-[#e3371e]"
                role="alert"
              >
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                {error}
              </div>
            )}

            {/* Checkboxes */}
            <div className="space-y-2.5 pt-1">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={noAudio}
                  onChange={(e) => setNoAudio(e.target.checked)}
                  className="w-4 h-4 rounded border border-[#555555] bg-transparent accent-[#0b5cff] cursor-pointer"
                  id="no-audio"
                />
                <span className="text-[14px] text-[#cccccc] group-hover:text-white transition-colors select-none">
                  Don&apos;t connect to audio
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={noVideo}
                  onChange={(e) => setNoVideo(e.target.checked)}
                  className="w-4 h-4 rounded border border-[#555555] bg-transparent accent-[#0b5cff] cursor-pointer"
                  id="no-video"
                />
                <span className="text-[14px] text-[#cccccc] group-hover:text-white transition-colors select-none">
                  Turn off my video
                </span>
              </label>
            </div>
          </div>

          {/* Action buttons */}
          <div
            className="flex items-center justify-end gap-2 px-6 py-4"
            style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
          >
            <button
              onClick={onClose}
              id="join-modal-cancel"
              className="px-5 py-2 rounded-lg text-[14px] font-medium text-white transition-colors focus-visible:outline-2 focus-visible:outline-[#0b5cff]"
              style={{ background: "#3a3a3c" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#444446"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#3a3a3c"; }}
            >
              Cancel
            </button>
            <button
              onClick={handleJoin}
              disabled={isJoining || !meetingId.trim() || !displayName.trim()}
              id="join-modal-join"
              className="px-5 py-2 rounded-lg text-[14px] font-semibold text-white transition-all focus-visible:outline-2 focus-visible:outline-[#0b5cff] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "#0b5cff" }}
              onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = "#1a6aff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#0b5cff"; }}
            >
              {isJoining ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  Joining…
                </span>
              ) : (
                "Join"
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
