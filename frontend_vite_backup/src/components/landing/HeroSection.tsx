/**
 * HeroSection — above-the-fold landing section.
 *
 * Constitution §4.1: Composes Button from ui/ — no raw <button> here.
 * Constitution §9.5: Dark background achieved with direct slate-900 classes,
 *   NOT dark: modifier (which is reserved for meeting-room subtree only).
 * Constitution §2.2: Pure presentational — owns no data or server state.
 * Constitution §2.6: Default export.
 *
 * The "floating meeting UI" mockup below the CTAs is a CSS-only decorative
 * element — no images required, no arbitrary values.
 */

import { useNavigate } from 'react-router-dom'
import { Video, LogIn, CalendarDays } from 'lucide-react'
import Button from '@/components/ui/Button'

interface StatItem {
  value: string
  label: string
}

const STATS: StatItem[] = [
  { value: '0ms', label: 'Setup time' },
  { value: 'HD', label: 'Video quality' },
  { value: '∞', label: 'Participants' },
]

interface MockParticipant {
  initials: string
  color: string
  label: string
}

const MOCK_PARTICIPANTS: MockParticipant[] = [
  { initials: 'AJ', color: 'bg-blue-500', label: 'Participant AJ' },
  { initials: 'SK', color: 'bg-violet-500', label: 'Participant SK' },
  { initials: 'MR', color: 'bg-emerald-500', label: 'Participant MR' },
  { initials: 'LP', color: 'bg-amber-500', label: 'Participant LP' },
  { initials: 'DK', color: 'bg-rose-500', label: 'Participant DK' },
  { initials: 'TN', color: 'bg-cyan-500', label: 'You' },
]

export default function HeroSection() {
  const navigate = useNavigate()

  const handleNewMeeting = () => navigate('/dashboard')
  const handleJoin = () => navigate('/join')
  const handleSchedule = () => navigate('/schedule')

  return (
    <section
      className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex flex-col items-center justify-center overflow-hidden pt-16"
      aria-label="Hero section"
    >
      {/* ── Decorative ambient blobs (no images, pure CSS) ── */}
      <div
        className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-600 rounded-full opacity-10 blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-1/3 -right-32 w-80 h-80 bg-indigo-500 rounded-full opacity-10 blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute top-2/3 left-1/3 w-64 h-64 bg-primary rounded-full opacity-5 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* ── Content ── */}
      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm text-blue-200 mb-8 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
          Free to use — No account required
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight tracking-tight mb-6">
          Video meetings{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-300">
            for everyone.
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
          Start an instant meeting, schedule one for later, or join with a code.
          Connect with your team from anywhere — no downloads, no friction.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
          <Button
            variant="primary"
            size="lg"
            onClick={handleNewMeeting}
            leadingIcon={<Video aria-hidden="true" />}
          >
            New Meeting
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={handleJoin}
            leadingIcon={<LogIn aria-hidden="true" />}
          >
            Join Meeting
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={handleSchedule}
            leadingIcon={<CalendarDays aria-hidden="true" />}
          >
            Schedule
          </Button>
        </div>

        {/* ── CSS-only meeting room mockup ── */}
        <div
          className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-slate-800/60 backdrop-blur-md overflow-hidden shadow-2xl"
          role="img"
          aria-label="Meeting room preview"
        >
          {/* Window chrome */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-slate-900/50">
            <span className="w-3 h-3 rounded-full bg-red-500/80" aria-hidden="true" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80" aria-hidden="true" />
            <span className="w-3 h-3 rounded-full bg-green-500/80" aria-hidden="true" />
            <span className="ml-4 flex-1 text-xs text-slate-500 text-left">
              zoomclone.app/meeting/847-2910-556
            </span>
          </div>
          {/* Participant grid */}
          <div className="grid grid-cols-3 gap-2 p-4 bg-slate-900/40">
            {MOCK_PARTICIPANTS.map((p) => (
              <div
                key={p.initials}
                className="aspect-video rounded-lg bg-slate-700/60 flex flex-col items-center justify-center gap-1.5 border border-white/5"
                aria-label={p.label}
              >
                <span
                  className={`w-10 h-10 rounded-full ${p.color} flex items-center justify-center text-white text-xs font-semibold`}
                  aria-hidden="true"
                >
                  {p.initials}
                </span>
                <span className="text-xs text-slate-400">{p.label}</span>
              </div>
            ))}
          </div>
          {/* Toolbar hint */}
          <div className="flex items-center justify-center gap-3 py-3 bg-slate-900/70 border-t border-white/5">
            {['Mic', 'Cam', 'Share', 'Leave'].map((label) => (
              <span
                key={label}
                className="px-3 py-1 rounded-lg bg-slate-700/60 text-xs text-slate-400"
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-8">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-3xl font-bold text-white">{value}</div>
              <div className="text-sm text-slate-400 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom wave fade */}
      <div
        className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-surface to-transparent pointer-events-none"
        aria-hidden="true"
      />
    </section>
  )
}
