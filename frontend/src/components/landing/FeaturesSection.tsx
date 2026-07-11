import React from "react";
import { Video, Users, ShieldCheck, Smartphone } from "lucide-react";
import { Card, CardContent } from "@/components/ui";

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: <Video className="w-6 h-6 text-primary" aria-hidden="true" />,
    title: "Instant Meetings",
    description:
      "Start a meeting in seconds without any scheduling. One click and you're live with a unique shareable code.",
  },
  {
    icon: <Users className="w-6 h-6 text-primary" aria-hidden="true" />,
    title: "Easy Joining",
    description:
      "Join via code or invite link — no account needed. Just enter your display name and you're in.",
  },
  {
    icon: <ShieldCheck className="w-6 h-6 text-primary" aria-hidden="true" />,
    title: "Participant Controls",
    description:
      "Host controls let you manage who joins, remove disruptive participants, and end the meeting for everyone.",
  },
  {
    icon: <Smartphone className="w-6 h-6 text-primary" aria-hidden="true" />,
    title: "Responsive Design",
    description:
      "Works beautifully on desktop, tablet, and mobile. Built with a mobile-first approach from the ground up.",
  },
];

export const FeaturesSection: React.FC = () => (
  <section className="bg-[#f8fafc]">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
      {/* Section header */}
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold text-[#0f172a] tracking-tight mb-4">
          Why Choose ZoomClone?
        </h2>
        <p className="text-lg text-[#64748b] max-w-xl mx-auto">
          Everything you need for productive video meetings, built with
          simplicity in mind.
        </p>
      </div>

      {/* Feature grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature) => (
          <Card key={feature.title} className="flex flex-col gap-4">
            <CardContent className="flex flex-col gap-3 p-0">
              {/* Icon container */}
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-primary-100">
                {feature.icon}
              </div>
              <h3 className="text-base font-semibold text-[#0f172a]">
                {feature.title}
              </h3>
              <p className="text-sm text-[#64748b] leading-relaxed">
                {feature.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </section>
);
