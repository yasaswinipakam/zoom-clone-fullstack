"use client";

import React from "react";
import { ChevronLeft, ChevronRight, RotateCcw, Search, Plus, Bell } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen" style={{ background: "#1c1c1e" }}>
      <Sidebar />

      <div className="flex flex-col flex-1 md:ml-[72px]">
        {/* Top bar — matches Zoom Mac exactly */}
        <header
          className="sticky top-0 z-30 flex items-center h-[44px] px-3 gap-2"
          style={{
            background: "#1c1c1e",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {/* Navigation arrows (Mac-style back/forward) */}
          <div className="hidden sm:flex items-center gap-0.5 mr-1">
            <button
              className="w-7 h-7 flex items-center justify-center rounded-md text-[#5a5a5a] hover:text-[#aaaaaa] hover:bg-white/5 transition-colors focus-visible:outline-2 focus-visible:outline-[#0b5cff]"
              aria-label="Go back"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={2} />
            </button>
            <button
              className="w-7 h-7 flex items-center justify-center rounded-md text-[#5a5a5a] hover:text-[#aaaaaa] hover:bg-white/5 transition-colors focus-visible:outline-2 focus-visible:outline-[#0b5cff]"
              aria-label="Go forward"
            >
              <ChevronRight className="w-4 h-4" strokeWidth={2} />
            </button>
            <button
              className="w-7 h-7 flex items-center justify-center rounded-md text-[#5a5a5a] hover:text-[#aaaaaa] hover:bg-white/5 transition-colors focus-visible:outline-2 focus-visible:outline-[#0b5cff]"
              aria-label="Refresh"
            >
              <RotateCcw className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </div>

          {/* Centered search bar */}
          <div className="flex-1 flex items-center justify-center">
            <div className="relative w-full max-w-[420px]">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5a5a5a]"
                aria-hidden="true"
              />
              <input
                type="search"
                placeholder="Search (⌘E)"
                className="w-full pl-8 pr-3 py-[5px] rounded-lg text-sm text-[#b0b0b0] placeholder-[#5a5a5a] focus-visible:outline-2 focus-visible:outline-[#0b5cff] transition-colors"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
                aria-label="Search"
              />
            </div>
          </div>

          {/* Right controls */}
          <div className="hidden sm:flex items-center gap-1 ml-2">
            <button
              className="w-7 h-7 flex items-center justify-center rounded-md text-[#5a5a5a] hover:text-[#aaaaaa] hover:bg-white/5 transition-colors"
              aria-label="Add"
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
            </button>
            <button
              className="w-7 h-7 flex items-center justify-center rounded-md text-[#5a5a5a] hover:text-[#aaaaaa] hover:bg-white/5 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" strokeWidth={1.5} />
            </button>
            {/* Screen share / more icons */}
            <button
              className="w-7 h-7 flex items-center justify-center rounded-md text-[#5a5a5a] hover:text-[#aaaaaa] hover:bg-white/5 transition-colors"
              aria-label="Screen share"
            >
              {/* Zoom share-screen icon approximation */}
              <svg viewBox="0 0 18 18" fill="none" className="w-4 h-4">
                <rect x="1" y="3" width="16" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M6 15h6M9 13v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
            {/* Profile avatar */}
            <div className="w-7 h-7 rounded-full bg-[#0b5cff] flex items-center justify-center ml-1">
              <span className="text-[11px] font-bold text-white leading-none">P</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
};
