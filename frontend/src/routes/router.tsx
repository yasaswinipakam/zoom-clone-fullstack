/**
 * Application router.
 *
 * Route table (Implementation Plan §4):
 *   /                          → DashboardPage
 *   /join                      → JoinMeetingPage
 *   /schedule                  → ScheduleMeetingPage
 *   /meeting/:meetingCode      → MeetingRoomPage (code-split)
 *   *                          → NotFoundPage
 *
 * Constitution §7: "Route param — Matches backend's public identifier name
 * exactly — :meetingCode, never :meetingId or :code."
 *
 * Constitution §13.4: MeetingRoomPage is loaded via React.lazy + Suspense
 * to prevent it from blocking the initial dashboard bundle.
 */

import { Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import DashboardPage from '@/pages/DashboardPage'
import JoinMeetingPage from '@/pages/JoinMeetingPage'
import ScheduleMeetingPage from '@/pages/ScheduleMeetingPage'
import NotFoundPage from '@/pages/NotFoundPage'
import { MeetingRoomPage } from '@/pages/MeetingRoomPage/lazy'

const router = createBrowserRouter([
  {
    path: '/',
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
