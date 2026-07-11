"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Video,
  MessageSquare,
  MoreHorizontal,
  Settings,
  Sparkles,
} from "lucide-react";
import clsx from "clsx";

interface NavItem {
  href: string;
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
  label: string;
  badge?: string;
}

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    icon: <Home className="w-[22px] h-[22px]" strokeWidth={1.5} />,
    activeIcon: <Home className="w-[22px] h-[22px]" strokeWidth={2.5} />,
    label: "Home",
  },
  {
    href: "#",
    icon: <Sparkles className="w-[22px] h-[22px]" strokeWidth={1.5} />,
    activeIcon: <Sparkles className="w-[22px] h-[22px]" strokeWidth={2.5} />,
    label: "ZoomMate",
  },
  {
    href: "/meetings",
    icon: <Video className="w-[22px] h-[22px]" strokeWidth={1.5} />,
    activeIcon: <Video className="w-[22px] h-[22px]" strokeWidth={2.5} />,
    label: "Meetings",
  },
  {
    href: "#",
    icon: <MessageSquare className="w-[22px] h-[22px]" strokeWidth={1.5} />,
    activeIcon: <MessageSquare className="w-[22px] h-[22px]" strokeWidth={2.5} />,
    label: "Chat",
  },
  {
    href: "#",
    icon: <MoreHorizontal className="w-[22px] h-[22px]" strokeWidth={1.5} />,
    activeIcon: <MoreHorizontal className="w-[22px] h-[22px]" strokeWidth={2} />,
    label: "More",
  },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 z-40 hidden md:flex flex-col items-center w-[72px] bg-[#1c1c1e]"
      style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}
      aria-label="App navigation"
    >
      {/* Zoom logo mark */}
      <div className="flex items-center justify-center w-full h-[52px] flex-shrink-0">
        <div className="w-9 h-9 rounded-[10px] bg-[#0b5cff] flex items-center justify-center shadow-lg">
          {/* Zoom-style camera icon */}
          <svg viewBox="0 0 36 36" fill="none" className="w-5 h-5">
            <rect x="3" y="9" width="20" height="18" rx="3" fill="white" />
            <path d="M23 14l8-4v16l-8-4V14z" fill="white" />
          </svg>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col items-center gap-0.5 flex-1 w-full px-1 pt-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={clsx(
                "relative flex flex-col items-center justify-center w-full py-2.5 gap-1 rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-[#0b5cff]",
                isActive
                  ? "text-[#0b5cff]"
                  : "text-[#7a7a7a] hover:text-[#d4d4d4] hover:bg-white/5"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {isActive ? item.activeIcon : item.icon}
              <span
                className={clsx(
                  "text-[10px] font-medium leading-none",
                  isActive ? "text-[#0b5cff]" : "text-[#7a7a7a]"
                )}
              >
                {item.label}
              </span>
              {item.badge && (
                <span className="absolute top-1.5 right-2 text-[8px] font-bold text-[#0b5cff] leading-none">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Settings pinned to bottom */}
      <div className="w-full px-1 pb-3">
        <Link
          href="#"
          className="flex flex-col items-center justify-center w-full py-2.5 gap-1 rounded-xl text-[#7a7a7a] hover:text-[#d4d4d4] hover:bg-white/5 transition-colors focus-visible:outline-2 focus-visible:outline-[#0b5cff]"
          aria-label="Settings"
        >
          <Settings className="w-[22px] h-[22px]" strokeWidth={1.5} />
          <span className="text-[10px] font-medium leading-none">Settings</span>
        </Link>
        {/* Profile avatar */}
        <div className="flex items-center justify-center mt-1">
          <div className="w-8 h-8 rounded-full bg-[#4a4a4a] flex items-center justify-center">
            <span className="text-[13px] font-semibold text-white leading-none">N</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
