"use client";

import React from "react";
import { ParticipantTile } from "@/components/meeting/ParticipantTile";
import type { Participant } from "@/types/participant";

interface ParticipantGridProps {
  participants: Participant[];
  selfParticipantId?: number;
}

function getGridCols(count: number): string {
  if (count === 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-2";
  if (count <= 4) return "grid-cols-2";
  if (count <= 9) return "grid-cols-3";
  return "grid-cols-4";
}

export const ParticipantGrid: React.FC<ParticipantGridProps> = ({
  participants,
  selfParticipantId,
}) => {
  const active = participants.filter(
    (p) => p.participant_status === "CONNECTED"
  );
  const count = active.length;

  if (count === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div className="w-16 h-16 rounded-full bg-[#2a2a2a] flex items-center justify-center">
          <span className="text-3xl">🎥</span>
        </div>
        <p className="text-[#888888] text-[15px]">Waiting for participants…</p>
      </div>
    );
  }

  const gridCols = getGridCols(count);
  // For solo participant, make tile fill screen proportionally
  const isSolo = count === 1;

  return (
    <div
      className={`flex-1 grid ${gridCols} gap-1.5 p-1.5 content-center`}
      style={{ minHeight: 0 }}
      aria-label={`Meeting participants: ${count} active`}
    >
      {active.map((p) => (
        <ParticipantTile
          key={p.id}
          participant={p}
          isHost={p.is_host}
          isSelf={p.id === selfParticipantId}
          totalCount={count}
        />
      ))}
    </div>
  );
};
