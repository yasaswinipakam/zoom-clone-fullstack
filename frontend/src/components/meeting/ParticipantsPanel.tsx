"use client";

import React from "react";
import { X, MicOff, VideoOff, VolumeX } from "lucide-react";
import type { Participant } from "@/types/participant";

interface ParticipantsPanelProps {
  participants: Participant[];
  selfParticipantId?: number;
  isHost: boolean;
  isRemoving?: boolean;
  onRemove?: (participantId: number) => void;
  onMuteAll?: () => void;
  onClose: () => void;
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export const ParticipantsPanel: React.FC<ParticipantsPanelProps> = ({
  participants,
  selfParticipantId,
  isHost,
  isRemoving,
  onRemove,
  onMuteAll,
  onClose,
}) => {
  const active = participants.filter(
    (p) => p.participant_status === "CONNECTED"
  );
  const count = active.length;

  return (
    <div
      className="flex flex-col h-full w-[280px] flex-shrink-0"
      style={{
        background: "#1f1f21",
        borderLeft: "1px solid rgba(255,255,255,0.08)",
      }}
      aria-label="Participants panel"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <h2 className="text-[15px] font-semibold text-white">
          Participants ({count})
        </h2>
        <div className="flex items-center gap-1">
          {isHost && onMuteAll && (
            <button onClick={onMuteAll} className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-[#cccccc] hover:bg-white/5 hover:text-white" aria-label="Mute all participants"><VolumeX className="w-3.5 h-3.5" />Mute All</button>
          )}
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-md text-[#888888] hover:text-white hover:bg-white/5 transition-colors focus-visible:outline-2 focus-visible:outline-[#0b5cff]"
          aria-label="Close participants panel"
        >
          <X className="w-4 h-4" strokeWidth={2} />
        </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-2">
        {active.length === 0 ? (
          <p className="text-[13px] text-[#666666] text-center mt-8 px-4">
            No participants yet
          </p>
        ) : (
          active.map((p) => {
            const isSelf = p.id === selfParticipantId;
            const isParticipantHost = p.is_host;
            return (
              <div
                key={p.id}
                className="flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors rounded-lg mx-2 group"
              >
                {/* Avatar + name */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                    style={{ background: "#0b5cff" }}
                    aria-hidden="true"
                  >
                    {getInitials(p.display_name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] text-[#e8e8e8] font-medium truncate">
                      {p.display_name}
                      {isSelf && (
                        <span className="text-[#888888] ml-1 font-normal">(You)</span>
                      )}
                    </p>
                    {isParticipantHost && (
                      <p className="text-[11px] text-[#666666]">Host</p>
                    )}
                  </div>
                </div>

                {/* Status icons + remove */}
                <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {p.audio_status === "MUTED" && (
                    <MicOff className="w-3.5 h-3.5 text-[#e3371e]" aria-label="Muted" />
                  )}
                  {p.video_status === "OFF" && (
                    <VideoOff className="w-3.5 h-3.5 text-[#888888]" aria-label="Video off" />
                  )}
                  {isHost && !isSelf && onRemove && (
                    <button
                      onClick={() => onRemove(p.id)}
                      disabled={isRemoving}
                      className="text-[11px] text-[#e3371e] hover:text-red-400 px-1.5 py-0.5 rounded transition-colors focus-visible:outline-2 focus-visible:outline-[#0b5cff] disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label={`Remove ${p.display_name}`}
                    >
                      {isRemoving ? "Removing…" : "Remove"}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
