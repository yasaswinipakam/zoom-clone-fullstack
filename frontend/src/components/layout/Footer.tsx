import React from "react";
import Link from "next/link";
import { Video } from "lucide-react";

export const Footer: React.FC = () => (
  <footer className="bg-[#f8fafc] border-t border-[#e2e8f0]">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 bg-primary rounded-md">
            <Video className="w-3.5 h-3.5 text-white" aria-hidden="true" />
          </div>
          <span className="text-base font-semibold text-[#0f172a]">
            Zoom<span className="text-primary">Clone</span>
          </span>
        </div>

        {/* Links */}
        <nav aria-label="Footer navigation" className="flex items-center gap-6">
          <Link
            href="/"
            className="text-sm text-[#64748b] hover:text-[#0f172a] transition-colors focus-visible:outline-2 focus-visible:outline-primary rounded"
          >
            Home
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-[#64748b] hover:text-[#0f172a] transition-colors focus-visible:outline-2 focus-visible:outline-primary rounded"
          >
            Dashboard
          </Link>
          <Link
            href="/join"
            className="text-sm text-[#64748b] hover:text-[#0f172a] transition-colors focus-visible:outline-2 focus-visible:outline-primary rounded"
          >
            Join
          </Link>
          <Link
            href="/schedule"
            className="text-sm text-[#64748b] hover:text-[#0f172a] transition-colors focus-visible:outline-2 focus-visible:outline-primary rounded"
          >
            Schedule
          </Link>
        </nav>

        {/* Copyright */}
        <p className="text-sm text-[#64748b]">
          © 2026 ZoomClone. Built for demonstration.
        </p>
      </div>
    </div>
  </footer>
);
