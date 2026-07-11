import { lazy } from 'react'

// Route-level code splitting for MeetingRoomPage per Constitution §13.4:
// "Route-level code splitting via React.lazy for the Meeting Room page,
// since it's the heaviest page and shouldn't block the initial dashboard load."
export const MeetingRoomPage = lazy(() => import('./index'))
