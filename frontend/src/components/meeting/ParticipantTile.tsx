"use client";

import React, { useMemo } from "react";
import { MicOff, VideoOff } from "lucide-react";
import type { Participant } from "@/types/participant";

// Generate a deterministic color from a name string
function nameToColor(name: string): string {
  const colors = [
    "#0b5cff", "#7c3aed", "#dc2626", "#16a34a",
    "#d97706", "#0891b2", "#be185d", "#4f46e5",
    "#059669", "#b45309",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

interface ParticipantTileProps {
  participant: Participant;
  isHost?: boolean;
  isSelf?: boolean;
  /** How many total tiles — drives font/avatar size */
  totalCount: number;
}

export const ParticipantTile: React.FC<ParticipantTileProps> = ({
  participant,
  isHost,
  isSelf,
  totalCount,
}) => {
  const color = useMemo(
    () => nameToColor(participant.display_name),
    [participant.display_name]
  );
  const initials = getInitials(participant.display_name);

  // Scale avatar based on total participants
  const avatarSize =
    totalCount === 1
      ? "w-28 h-28 text-5xl"
      : totalCount <= 4
      ? "w-20 h-20 text-3xl"
      : totalCount <= 9
      ? "w-14 h-14 text-xl"
      : "w-10 h-10 text-sm";

  return (
    <div
      className="relative flex items-center justify-center rounded-lg overflow-hidden select-none"
      style={{
        background: `linear-gradient(135deg, ${color}22 0%, #1a1a1a 100%)`,
        border: "1px solid rgba(255,255,255,0.06)",
        aspectRatio: "16/9",
      }}
      aria-label={`${participant.display_name}${isHost ? " (Host)" : ""}${isSelf ? " (You)" : ""}`}
    >
      {/* Avatar */}
      <div
        className={`${avatarSize} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0`}
        style={{ background: color, boxShadow: `0 0 0 4px ${color}33` }}
        aria-hidden="true"
      >
        {initials}
      </div>

      {/* Mic/Camera off indicators */}
      <div className="absolute top-2 right-2 flex items-center gap-1.5" aria-hidden="true">
        {participant.audio_status === "MUTED" && (
          <div className="w-6 h-6 rounded-full bg-[#e3371e]/90 flex items-center justify-center">
            <MicOff className="w-3 h-3 text-white" />
          </div>
        )}
        {participant.video_status === "OFF" && (
          <div className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">
            <VideoOff className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Name badge — bottom left */}
      <div
        className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded"
        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      >
        {participant.audio_status === "MUTED" && (
          <MicOff className="w-3 h-3 text-[#e3371e]" aria-hidden="true" />
        )}
        <span className="text-[12px] text-white font-medium leading-tight">
          {participant.display_name}
          {isSelf && <span className="text-[#aaaaaa] ml-1">(You)</span>}
          {isHost && !isSelf && (
            <span className="text-[#888888] ml-1">Host</span>
          )}
        </span>
      </div>
    </div>
  );
};
