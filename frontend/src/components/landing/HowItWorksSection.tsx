import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";

interface Step {
  number: string;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    number: "01",
    title: "Create",
    description:
      "Start an instant meeting with one click, or schedule a meeting for a future date and time. A unique meeting code is generated automatically.",
  },
  {
    number: "02",
    title: "Invite",
    description:
      "Share the meeting code or link with your participants via any channel — email, chat, or messaging app. No special software required.",
  },
  {
    number: "03",
    title: "Connect",
    description:
      "Participants join using the code or link, enter their display name, and they're in. The host controls the meeting flow.",
  },
];

export const HowItWorksSection: React.FC = () => (
  <section className="bg-white">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
      {/* Section header */}
      <div className="text-center mb-14">
        <h2 className="text-3xl sm:text-4xl font-bold text-[#0f172a] tracking-tight mb-4">
          How It Works
        </h2>
        <p className="text-lg text-[#64748b] max-w-xl mx-auto">
          Get from zero to a live meeting in under 30 seconds.
        </p>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8 relative">
        {/* Connector line — desktop only */}
        <div
          className="hidden md:block absolute top-8 left-1/3 right-1/3 h-px bg-[#e2e8f0]"
          aria-hidden="true"
        />

        {steps.map((step, index) => (
          <div key={step.number} className="flex flex-col items-center text-center">
            {/* Step number circle */}
            <div className="relative z-10 flex items-center justify-center w-16 h-16 rounded-full bg-primary text-white font-bold text-lg mb-5 shadow-elevated">
              {step.number}
              {/* Connector dot connector for step 2 only - shows between steps */}
              {index < steps.length - 1 && (
                <span
                  className="hidden md:block absolute -right-8 top-1/2 -translate-y-1/2 w-4 h-0.5 bg-[#e2e8f0]"
                  aria-hidden="true"
                />
              )}
            </div>
            <h3 className="text-xl font-semibold text-[#0f172a] mb-3">
              {step.title}
            </h3>
            <p className="text-[#64748b] text-sm leading-relaxed max-w-xs">
              {step.description}
            </p>
          </div>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="text-center mt-14">
        <Link href="/dashboard" tabIndex={-1}>
          <Button variant="primary" size="lg" id="how-it-works-cta">
            Get Started Now
            <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </Button>
        </Link>
      </div>
    </div>
  </section>
);
