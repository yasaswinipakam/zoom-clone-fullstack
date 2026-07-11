"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Video, Menu, X } from "lucide-react";
import { Button } from "@/components/ui";

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#e2e8f0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-primary rounded-md"
          >
            <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
              <Video className="w-4 h-4 text-white" aria-hidden="true" />
            </div>
            <span className="text-xl font-bold text-[#0f172a] tracking-tight">
              Zoom<span className="text-primary">Clone</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav
            className="hidden md:flex items-center gap-3"
            aria-label="Main navigation"
          >
            <Link href="/dashboard" tabIndex={-1}>
              <Button variant="primary" size="sm" id="nav-new-meeting">
                New Meeting
              </Button>
            </Link>
            <Link href="/join" tabIndex={-1}>
              <Button variant="secondary" size="sm" id="nav-join-meeting">
                Join Meeting
              </Button>
            </Link>
            <Link href="/schedule" tabIndex={-1}>
              <Button variant="secondary" size="sm" id="nav-schedule-meeting">
                Schedule
              </Button>
            </Link>
          </nav>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-md text-[#64748b] hover:bg-surface-100 hover:text-[#0f172a] transition-colors focus-visible:outline-2 focus-visible:outline-primary"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Menu className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div
          id="mobile-menu"
          className="md:hidden border-t border-[#e2e8f0] bg-white px-4 py-4 space-y-2"
        >
          <Link
            href="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="block"
          >
            <Button variant="primary" size="md" className="w-full" id="mobile-nav-new-meeting">
              New Meeting
            </Button>
          </Link>
          <Link
            href="/join"
            onClick={() => setMobileMenuOpen(false)}
            className="block"
          >
            <Button variant="secondary" size="md" className="w-full" id="mobile-nav-join-meeting">
              Join Meeting
            </Button>
          </Link>
          <Link
            href="/schedule"
            onClick={() => setMobileMenuOpen(false)}
            className="block"
          >
            <Button variant="secondary" size="md" className="w-full" id="mobile-nav-schedule-meeting">
              Schedule Meeting
            </Button>
          </Link>
        </div>
      )}
    </header>
  );
};
