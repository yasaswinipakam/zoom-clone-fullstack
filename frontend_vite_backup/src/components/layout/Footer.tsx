/**
 * Footer — minimal dashboard/landing footer.
 *
 * Implementation Plan §5: "Footer: Minimal, dashboard-only (copyright/version
 * placeholder). Omitted from the meeting room."
 * Constitution §12.1: Navigation items use <Link> / <a>.
 * Constitution §2.6: Default export.
 */

import { Link } from 'react-router-dom'
import { Video } from 'lucide-react'

interface FooterColumn {
  heading: string
  links: { label: string; to: string; isExternal?: boolean }[]
}

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    heading: 'Product',
    links: [
      { label: 'New Meeting', to: '/dashboard' },
      { label: 'Join Meeting', to: '/join' },
      { label: 'Schedule Meeting', to: '/schedule' },
    ],
  },
  {
    heading: 'Info',
    links: [
      { label: 'Features', to: '#features' },
      { label: 'How it works', to: '#how-it-works' },
      { label: 'API Docs', to: 'http://127.0.0.1:8000/docs', isExternal: true },
    ],
  },
]

const CURRENT_YEAR = new Date().getFullYear()

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-white" aria-label="Site footer">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* ── Brand column ── */}
          <div className="md:col-span-1">
            <Link
              to="/"
              className="inline-flex items-center gap-2 mb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
              aria-label="ZoomClone home"
            >
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
                <Video className="w-4 h-4 text-white" aria-hidden="true" />
              </span>
              <span className="text-lg font-bold tracking-tight">ZoomClone</span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              Professional video meetings for teams of all sizes. Start instantly
              or schedule ahead — no account required.
            </p>
          </div>

          {/* ── Link columns ── */}
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
                {col.heading}
              </h3>
              <ul className="space-y-3 list-none m-0 p-0" role="list">
                {col.links.map(({ label, to, isExternal }) => (
                  <li key={label}>
                    {isExternal ? (
                      <a
                        href={to}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-slate-400 hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                      >
                        {label}
                      </a>
                    ) : (
                      <Link
                        to={to}
                        className="text-sm text-slate-400 hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                      >
                        {label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Bottom bar ── */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <p>© {CURRENT_YEAR} ZoomClone. Built for the Scaler SDE Fullstack Assignment.</p>
          <p>Backend: FastAPI · Frontend: React + TypeScript</p>
        </div>
      </div>
    </footer>
  )
}
