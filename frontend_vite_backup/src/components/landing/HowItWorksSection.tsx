/**
 * HowItWorksSection — three-step process overview.
 *
 * Constitution §4.1: Composes Button from ui/.
 * Constitution §5.2: Feature-specific → components/dashboard/.
 * Constitution §2.2: Pure presentational.
 * Constitution §2.6: Default export.
 */

import { useNavigate } from 'react-router-dom'
import { Video, Share2, UserCheck } from 'lucide-react'
import { type LucideIcon } from 'lucide-react'
import Button from '@/components/ui/Button'

interface Step {
  number: string
  icon: LucideIcon
  title: string
  description: string
}

const STEPS: Step[] = [
  {
    number: '01',
    icon: Video,
    title: 'Start or Join',
    description:
      'Click "New Meeting" to create an instant room, or enter a meeting code to join one that\'s already running.',
  },
  {
    number: '02',
    icon: Share2,
    title: 'Share the Code',
    description:
      'Copy your unique meeting code or invite link from inside the room and send it to anyone you want to join.',
  },
  {
    number: '03',
    icon: UserCheck,
    title: 'Collaborate',
    description:
      'Participants join instantly. The host sees everyone in real time, with full controls to manage the session.',
  },
]

export default function HowItWorksSection() {
  const navigate = useNavigate()

  const handleGetStarted = () => navigate('/dashboard')

  return (
    <section
      id="how-it-works"
      className="bg-white py-24 lg:py-32"
      aria-labelledby="how-it-works-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-block text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Simple by design
          </span>
          <h2
            id="how-it-works-heading"
            className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 tracking-tight"
          >
            Up and running in 3 steps
          </h2>
          <p className="text-text-secondary text-lg max-w-xl mx-auto leading-relaxed">
            No downloads. No account setup. Just click and connect.
          </p>
        </div>

        {/* Steps */}
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-10 list-none m-0 p-0 relative">
          {/* Connector line (desktop) */}
          <div
            className="hidden md:block absolute top-10 left-1/6 right-1/6 h-px bg-border"
            aria-hidden="true"
          />

          {STEPS.map(({ number, icon: Icon, title, description }) => (
            <li key={number} className="flex flex-col items-center text-center relative">
              {/* Step circle with icon */}
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center shadow-lg shadow-blue-200">
                  <Icon className="w-9 h-9 text-white" aria-hidden="true" />
                </div>
                {/* Step number badge */}
                <span
                  className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-text-primary text-white text-xs font-bold flex items-center justify-center"
                  aria-hidden="true"
                >
                  {number}
                </span>
              </div>

              <h3 className="text-lg font-semibold text-text-primary mb-3">{title}</h3>
              <p className="text-text-secondary text-sm leading-relaxed max-w-xs">{description}</p>
            </li>
          ))}
        </ol>

        {/* CTA */}
        <div className="mt-16 text-center">
          <Button
            variant="primary"
            size="lg"
            onClick={handleGetStarted}
            leadingIcon={<Video aria-hidden="true" />}
          >
            Start your first meeting
          </Button>
          <p className="mt-4 text-sm text-text-secondary">
            Free to use · No account required · Instant setup
          </p>
        </div>
      </div>
    </section>
  )
}
