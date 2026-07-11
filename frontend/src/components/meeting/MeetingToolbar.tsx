"use client";

import React from "react";
import {
  Mic, MicOff, Video, VideoOff, Shield, Users,
  MessageSquare, Monitor, BarChart2, Circle,
  Grid, Smile, ChevronUp, Link2,
} from "lucide-react";
import clsx from "clsx";

interface MeetingToolbarProps {
  isMuted: boolean;
  isCameraOff: boolean;
  participantCount: number;
  showParticipants: boolean;
  isHost: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleParticipants: () => void;
  onInvite: () => void;
  onLeave: () => void;
  onEnd: () => void;
}

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  badge?: number;
  hasArrow?: boolean;
  id: string;
}

function ToolbarButton({
  icon, label, onClick, active, danger, badge, hasArrow, id,
}: ToolbarButtonProps) {
  return (
    <button
      id={id}
      onClick={onClick}
      className={clsx(
        "relative flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all focus-visible:outline-2 focus-visible:outline-white group min-w-[56px]",
        danger
          ? "text-[#e3371e] hover:bg-[#e3371e]/10"
          : active
          ? "text-white hover:bg-white/10"
          : "text-[#cccccc] hover:bg-white/8 hover:text-white"
      )}
      aria-label={label}
      aria-pressed={active !== undefined ? active : undefined}
    >
      <div className="relative">
        {icon}
        {badge !== undefined && badge > 0 && (
          <span
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
            style={{ background: "#0b5cff" }}
            aria-label={`${badge} participants`}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        )}
        {hasArrow && (
          <ChevronUp
            className="absolute -right-3.5 top-0 w-3 h-3 text-[#666666] group-hover:text-[#aaaaaa] transition-colors"
            aria-hidden="true"
          />
        )}
      </div>
      <span className="text-[11px] font-medium leading-none whitespace-nowrap">
        {label}
      </span>
    </button>
  );
}

export const MeetingToolbar: React.FC<MeetingToolbarProps> = ({
  isMuted,
  isCameraOff,
  participantCount,
  showParticipants,
  isHost,
  onToggleMic,
  onToggleCamera,
  onToggleParticipants,
  onInvite,
  onLeave,
  onEnd,
}) => {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-2"
      style={{
        background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.75) 100%)",
        backdropFilter: "blur(8px)",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        height: "72px",
      }}
      role="toolbar"
      aria-label="Meeting controls"
    >
      {/* Left: Mic + Camera */}
      <div className="flex items-center gap-1">
        <ToolbarButton
          id="toolbar-mic"
          icon={
            isMuted
              ? <MicOff className="w-5 h-5 text-[#e3371e]" aria-hidden="true" />
              : <Mic className="w-5 h-5" aria-hidden="true" />
          }
          label={isMuted ? "Unmute" : "Mute"}
          onClick={onToggleMic}
          active={!isMuted}
          hasArrow
        />
        <ToolbarButton
          id="toolbar-camera"
          icon={
            isCameraOff
              ? <VideoOff className="w-5 h-5 text-[#e3371e]" aria-hidden="true" />
              : <Video className="w-5 h-5" aria-hidden="true" />
          }
          label={isCameraOff ? "Start Video" : "Stop Video"}
          onClick={onToggleCamera}
          active={!isCameraOff}
          hasArrow
        />
      </div>

      {/* Center: main controls */}
      <div className="flex items-center gap-0.5 overflow-x-auto max-w-[52vw] sm:max-w-none">
        <ToolbarButton
          id="toolbar-security"
          icon={<Shield className="w-5 h-5" aria-hidden="true" />}
          label="Security"
          onClick={() => {}}
        />
        <ToolbarButton
          id="toolbar-participants"
          icon={<Users className="w-5 h-5" aria-hidden="true" />}
          label="Participants"
          onClick={onToggleParticipants}
          active={showParticipants}
          badge={participantCount}
          hasArrow
        />
        <ToolbarButton
          id="toolbar-chat"
          icon={<MessageSquare className="w-5 h-5" aria-hidden="true" />}
          label="Chat"
          onClick={() => {}}
        />
        <ToolbarButton
          id="toolbar-invite"
          icon={<Link2 className="w-5 h-5" aria-hidden="true" />}
          label="Invite"
          onClick={onInvite}
        />
        <ToolbarButton
          id="toolbar-share"
          icon={<Monitor className="w-5 h-5" aria-hidden="true" />}
          label="Share Screen"
          onClick={() => {}}
        />
        <ToolbarButton
          id="toolbar-record"
          icon={<Circle className="w-5 h-5" aria-hidden="true" />}
          label="Record"
          onClick={() => {}}
        />
        <ToolbarButton
          id="toolbar-reactions"
          icon={<Smile className="w-5 h-5" aria-hidden="true" />}
          label="Reactions"
          onClick={() => {}}
          hasArrow
        />
        <ToolbarButton
          id="toolbar-view"
          icon={<Grid className="w-5 h-5" aria-hidden="true" />}
          label="View"
          onClick={() => {}}
          hasArrow
        />
      </div>

      {/* Right: Leave / End */}
      <div className="flex items-center gap-2">
        {isHost ? (
          <>
            <button
              id="toolbar-leave"
              onClick={onLeave}
              className="px-4 py-2 rounded-xl text-[13px] font-medium text-white transition-colors focus-visible:outline-2 focus-visible:outline-white"
              style={{ background: "#3a3a3c" }}
              aria-label="Leave meeting"
            >
              Leave
            </button>
            <button
              id="toolbar-end"
              onClick={onEnd}
              className="px-5 py-2 rounded-xl text-[13px] font-semibold text-white transition-colors focus-visible:outline-2 focus-visible:outline-white hover:brightness-110"
              style={{ background: "#e3371e" }}
              aria-label="End meeting for all"
            >
              End
            </button>
          </>
        ) : (
          <button
            id="toolbar-leave"
            onClick={onLeave}
            className="px-5 py-2 rounded-xl text-[13px] font-semibold text-white transition-colors focus-visible:outline-2 focus-visible:outline-white hover:brightness-110"
            style={{ background: "#e3371e" }}
            aria-label="Leave meeting"
          >
            Leave
          </button>
        )}
      </div>
    </div>
  );
};
