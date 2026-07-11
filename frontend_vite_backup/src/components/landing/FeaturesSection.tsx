/**
 * FeaturesSection — six feature cards on a light background.
 *
 * Constitution §4.1: Composes Card from ui/.
 * Constitution §5.2: Feature-specific → components/dashboard/.
 * Constitution §2.2: Pure presentational — no data fetching.
 * Constitution §9.1: No arbitrary Tailwind values.
 * Constitution §2.6: Default export.
 */

import { type LucideIcon, Zap, CalendarDays, Users, Link2, Hash, ShieldCheck } from 'lucide-react'
import Card from '@/components/ui/Card'

interface Feature {
  icon: LucideIcon
  iconBg: string
  iconColor: string
  title: string
  description: string
}

const FEATURES: Feature[] = [
  {
    icon: Zap,
    iconBg: 'bg-blue-50',
    iconColor: 'text-primary',
    title: 'Instant Meetings',
    description:
      'Start a meeting in seconds with no setup. One click creates a live room ready for participants to join.',
  },
  {
    icon: CalendarDays,
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    title: 'Easy Scheduling',
    description:
      'Plan meetings in advance with a scheduled time and duration. Your upcoming meetings are always visible on the dashboard.',
  },
  {
    icon: Users,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    title: 'Team Collaboration',
    description:
      'Multiple participants can join any meeting simultaneously. The host controls the room — including who stays in it.',
  },
  {
    icon: Link2,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    title: 'Shareable Invite Links',
    description:
      'Every meeting gets a unique invite link. Share it with one click and participants join without needing an account.',
  },
  {
    icon: Hash,
    iconBg: 'bg-cyan-50',
    iconColor: 'text-cyan-600',
    title: 'Join by Code',
    description:
      'Got a meeting code? Enter it on the Join page to validate and enter the room — no friction, no account required.',
  },
  {
    icon: ShieldCheck,
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-600',
    title: 'Host Controls',
    description:
      'The host can end meetings for everyone, remove participants, and see real-time participant status — all from the room.',
  },
]

export default function FeaturesSection() {
  return (
    <section
      id="features"
      className="bg-surface-50 py-24 lg:py-32"
      aria-labelledby="features-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-block text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Why ZoomClone
          </span>
          <h2
            id="features-heading"
            className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 tracking-tight"
          >
            Everything you need for great meetings
          </h2>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto leading-relaxed">
            A purpose-built meeting platform with the features that matter most — no bloat,
            no unnecessary complexity.
          </p>
        </div>

        {/* Feature card grid */}
        <ul
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 list-none m-0 p-0"
          role="list"
        >
          {FEATURES.map(({ icon: Icon, iconBg, iconColor, title, description }) => (
            <li key={title}>
              <Card isHoverable className="h-full">
                {/* Icon badge */}
                <div
                  className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${iconBg} mb-5`}
                  aria-hidden="true"
                >
                  <Icon className={`w-6 h-6 ${iconColor}`} />
                </div>
                <h3 className="text-base font-semibold text-text-primary mb-2">{title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
