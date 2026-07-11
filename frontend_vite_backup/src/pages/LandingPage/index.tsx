/**
 * LandingPage — the public-facing marketing page at "/".
 *
 * Responsibility: render the landing experience (hero, features, how-it-works).
 * Has no knowledge of meetings, participants, or any server state.
 *
 * This is intentionally separate from DashboardPage, which owns the
 * authenticated/functional meeting management experience.
 *
 * Routing: "/" → LandingPage  (router.tsx)
 *
 * Constitution §2.2: Page-level component — pure composition, no data fetching.
 * Constitution §2.6: Default export.
 */

import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import HeroSection from '@/components/landing/HeroSection'
import FeaturesSection from '@/components/landing/FeaturesSection'
import HowItWorksSection from '@/components/landing/HowItWorksSection'

export default function LandingPage() {
  return (
    <>
      <Navbar />

      <main id="main-content" tabIndex={-1}>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
      </main>

      <Footer />
    </>
  )
}
