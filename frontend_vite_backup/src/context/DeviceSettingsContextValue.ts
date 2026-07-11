/**
 * DeviceSettingsContext instance — context object and value type.
 *
 * Pure .ts module with no component exports.
 * Shared between DeviceSettingsContext.tsx (Provider) and useDeviceSettings.ts (hook).
 */

import { createContext } from 'react'

export interface DeviceSettings {
  isMicOn: boolean
  isCameraOn: boolean
}

export interface DeviceSettingsContextValue {
  settings: DeviceSettings
  toggleMic: () => void
  toggleCamera: () => void
}

export const DeviceSettingsContext = createContext<DeviceSettingsContextValue | null>(null)
