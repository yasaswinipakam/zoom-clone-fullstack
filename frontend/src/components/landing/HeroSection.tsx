import React from "react";
import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { Button } from "@/components/ui";

export const HeroSection: React.FC = () => (
  <section className="bg-white">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 lg:py-32">
      <div className="max-w-3xl mx-auto text-center">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 bg-primary-100 text-primary text-sm font-medium px-3 py-1 rounded-full mb-6">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse inline-block" aria-hidden="true" />
          Free to use · No account required
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#0f172a] tracking-tight leading-tight mb-6">
          Connect,{" "}
          <span className="text-primary">Collaborate</span>,{" "}
          Communicate
        </h1>

        {/* Subheadline */}
        <p className="text-lg sm:text-xl text-[#64748b] leading-relaxed max-w-2xl mx-auto mb-10">
          Experience seamless video conferencing with ZoomClone. Start or join
          meetings instantly — no downloads, no account, no hassle.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/dashboard" tabIndex={-1}>
            <Button
              variant="primary"
              size="lg"
              className="w-full sm:w-auto"
              id="hero-start-meeting"
            >
              Start a Meeting
              <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </Button>
          </Link>
          <Link href="/join" tabIndex={-1}>
            <Button
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto"
              id="hero-join-meeting"
            >
              <Users className="w-5 h-5" aria-hidden="true" />
              Join a Meeting
            </Button>
          </Link>
        </div>

        {/* Social proof */}
        <p className="mt-8 text-sm text-[#64748b]">
          Start an{" "}
          <Link
            href="/dashboard"
            className="text-primary hover:underline font-medium focus-visible:outline-2 focus-visible:outline-primary rounded"
          >
            instant meeting
          </Link>{" "}
          or{" "}
          <Link
            href="/schedule"
            className="text-primary hover:underline font-medium focus-visible:outline-2 focus-visible:outline-primary rounded"
          >
            schedule one for later
          </Link>
        </p>
      </div>
    </div>
  </section>
);
