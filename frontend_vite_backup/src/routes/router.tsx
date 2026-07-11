/**
 * Application router.
 *
 * Route table (updated per user request — LandingPage and DashboardPage separated):
 *   /                          → LandingPage       (marketing/hero/features)
 *   /dashboard                 → DashboardPage      (meeting management — wired in Task 3)
 *   /join                      → JoinMeetingPage
 *   /schedule                  → ScheduleMeetingPage
 *   /meeting/:meetingCode      → MeetingRoomPage (code-split)
 *   *                          → NotFoundPage
 *
 * Deviation from Implementation Plan §4:
 *   Plan originally had "/" → DashboardPage. User explicitly separated
 *   Landing and Dashboard into distinct pages and routes (2026-07-11).
 *
 * Constitution §7: "Route param — Matches backend's public identifier name
 *   exactly — :meetingCode, never :meetingId or :code."
 *
 * Constitution §13.4: MeetingRoomPage loaded via React.lazy + Suspense
 *   to prevent it from blocking the initial landing bundle.
 */

import { Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import LandingPage from '@/pages/LandingPage'
import DashboardPage from '@/pages/DashboardPage'
import JoinMeetingPage from '@/pages/JoinMeetingPage'
import ScheduleMeetingPage from '@/pages/ScheduleMeetingPage'
import NotFoundPage from '@/pages/NotFoundPage'
import { MeetingRoomPage } from '@/pages/MeetingRoomPage/lazy'

const router = createBrowserRouter([
  {
    // Public landing/marketing page
    path: '/',
    element: <LandingPage />,
  },
  {
    // Functional meeting dashboard — fully wired in Task 3
    path: '/dashboard',
    element: <DashboardPage />,
  },
  {
    path: '/join',
    element: <JoinMeetingPage />,
  },
  {
    path: '/schedule',
    element: <ScheduleMeetingPage />,
  },
  {
    path: '/meeting/:meetingCode',
    element: (
      <Suspense fallback={<div>Loading...</div>}>
        <MeetingRoomPage />
      </Suspense>
    ),
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
