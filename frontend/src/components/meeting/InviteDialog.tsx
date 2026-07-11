"use client";

import React, { useState } from "react";
import { Copy, Check, X } from "lucide-react";

interface InviteDialogProps {
  meetingCode: string;
  onClose: () => void;
}

export const InviteDialog: React.FC<InviteDialogProps> = ({
  meetingCode,
  onClose,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const inviteLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/join?code=${meetingCode}`
      : `https://zoomclone.app/join?code=${meetingCode}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(meetingCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50"
        style={{ background: "rgba(0,0,0,0.65)" }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-dialog-title"
      >
        <div
          className="w-full max-w-[440px] rounded-2xl overflow-hidden"
          style={{
            background: "#252527",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.8)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
          >
            <h2
              id="invite-dialog-title"
              className="text-[16px] font-semibold text-white"
            >
              Invite People
            </h2>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-full text-[#666666] hover:text-[#aaaaaa] hover:bg-white/5 transition-colors focus-visible:outline-2 focus-visible:outline-[#0b5cff]"
              aria-label="Close"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>

          <div className="px-5 py-5 space-y-4">
            {/* Meeting code */}
            <div>
              <p className="text-[12px] text-[#888888] font-medium mb-1.5 uppercase tracking-wide">
                Meeting ID
              </p>
              <div className="flex items-center gap-2">
                <code
                  className="flex-1 px-3 py-2 rounded-lg text-[15px] font-mono text-[#cccccc] tracking-widest"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  {meetingCode}
                </code>
                <button
                  onClick={copyCode}
                  className="px-3 py-2 rounded-lg text-[13px] font-medium text-white transition-colors focus-visible:outline-2 focus-visible:outline-[#0b5cff] flex items-center gap-1.5"
                  style={{ background: "#3a3a3c" }}
                  aria-label="Copy meeting code"
                >
                  {copiedCode ? (
                    <><Check className="w-3.5 h-3.5 text-green-400" /> Copied</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /> Copy</>
                  )}
                </button>
              </div>
            </div>

            {/* Invite link */}
            <div>
              <p className="text-[12px] text-[#888888] font-medium mb-1.5 uppercase tracking-wide">
                Invite Link
              </p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={inviteLink}
                  className="flex-1 px-3 py-2 rounded-lg text-[13px] text-[#888888] truncate focus-visible:outline-2 focus-visible:outline-[#0b5cff]"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                  aria-label="Invite link"
                />
                <button
                  onClick={copyLink}
                  className="px-3 py-2 rounded-lg text-[13px] font-medium text-white transition-colors focus-visible:outline-2 focus-visible:outline-[#0b5cff] flex items-center gap-1.5 whitespace-nowrap"
                  style={{ background: copiedLink ? "#16a34a" : "#0b5cff" }}
                  aria-label="Copy invite link"
                >
                  {copiedLink ? (
                    <><Check className="w-3.5 h-3.5" /> Copied!</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /> Copy Link</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
