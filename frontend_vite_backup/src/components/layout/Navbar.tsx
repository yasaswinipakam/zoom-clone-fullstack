/**
 * Navbar — persistent top navigation bar.
 *
 * Implementation Plan §5 / §7: Navbar is part of the Global Layout,
 * shown on all routes except the meeting room.
 * Constitution §12.1: Navigation uses <Link> (anchor semantics), CTAs use <button>.
 * Constitution §9.5: No dark: modifier — dark backgrounds achieved directly.
 * Constitution §2.6: Default export.
 *
 * Behaviour:
 *  - Transparent initially, gains a solid background + shadow on scroll.
 *  - Mobile: hamburger toggle reveals the nav links.
 *  - Desktop: inline links + CTA buttons on the right.
 */

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Video, Menu, X } from 'lucide-react'
import { clsx } from 'clsx'
import Button from '@/components/ui/Button'

interface NavLink {
  label: string
  href: string
}

const NAV_LINKS: NavLink[] = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
]

export default function Navbar() {
  const navigate = useNavigate()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 16)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleToggleMobile = () => setIsMobileOpen((prev) => !prev)
  const handleCloseMobile = () => setIsMobileOpen(false)

  const handleJoin = () => {
    handleCloseMobile()
    navigate('/join')
  }

  const handleNewMeeting = () => {
    handleCloseMobile()
    navigate('/dashboard')
  }

  return (
    <header
      className={clsx(
        'fixed top-0 inset-x-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-white/95 backdrop-blur-md border-b border-border shadow-sm'
          : 'bg-transparent',
      )}
    >
      <nav
        className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between"
        aria-label="Primary navigation"
      >
        {/* ── Logo ── */}
        <Link
          to="/"
          className="flex items-center gap-2 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-md"
          aria-label="ZoomClone home"
        >
          <span
            className={clsx(
              'flex items-center justify-center w-8 h-8 rounded-lg',
              'bg-primary',
            )}
          >
            <Video className="w-4 h-4 text-white" aria-hidden="true" />
          </span>
          <span
            className={clsx(
              'text-lg font-bold tracking-tight transition-colors duration-300',
              isScrolled ? 'text-text-primary' : 'text-white',
            )}
          >
            ZoomClone
          </span>
        </Link>

        {/* ── Desktop links ── */}
        <ul className="hidden md:flex items-center gap-6 list-none m-0 p-0" role="list">
          {NAV_LINKS.map(({ label, href }) => (
            <li key={href}>
              <a
                href={href}
                className={clsx(
                  'text-sm font-medium transition-colors duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded',
                  isScrolled
                    ? 'text-text-secondary hover:text-text-primary'
                    : 'text-white/80 hover:text-white',
                )}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>

        {/* ── Desktop CTAs ── */}
        <div className="hidden md:flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleJoin}>
            Join Meeting
          </Button>
          <Button variant="primary" size="sm" onClick={handleNewMeeting}>
            New Meeting
          </Button>
        </div>

        {/* ── Mobile hamburger ── */}
        <button
          type="button"
          className={clsx(
            'md:hidden p-2 rounded-lg transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
            isScrolled ? 'text-text-primary hover:bg-surface-100' : 'text-white hover:bg-white/10',
          )}
          onClick={handleToggleMobile}
          aria-expanded={isMobileOpen}
          aria-controls="mobile-menu"
          aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
        >
          {isMobileOpen ? (
            <X className="w-5 h-5" aria-hidden="true" />
          ) : (
            <Menu className="w-5 h-5" aria-hidden="true" />
          )}
        </button>
      </nav>

      {/* ── Mobile menu ── */}
      {isMobileOpen && (
        <div
          id="mobile-menu"
          className="md:hidden bg-slate-900 border-t border-white/10 px-4 py-4 flex flex-col gap-3"
        >
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              onClick={handleCloseMobile}
              className="text-white/80 hover:text-white text-sm font-medium py-2 transition-colors"
            >
              {label}
            </a>
          ))}
          <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
            <Button variant="outline" size="md" onClick={handleJoin} className="w-full justify-center">
              Join Meeting
            </Button>
            <Button variant="primary" size="md" onClick={handleNewMeeting} className="w-full justify-center">
              New Meeting
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}
