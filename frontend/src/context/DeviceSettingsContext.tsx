/**
 * DeviceSettingsProvider — React component only.
 *
 * Exports EXACTLY ONE thing: the DeviceSettingsProvider component.
 * Context lives in DeviceSettingsContextValue.ts; hook in useDeviceSettings.ts.
 *
 * Scope: UI-only mic/camera toggle state, not real WebRTC device permissions
 * (Implementation Plan §8 — explicitly out of assignment scope).
 * Ephemeral — not persisted across sessions.
 */

import { useCallback, useState } from 'react'
import { DeviceSettingsContext, type DeviceSettings } from '@/context/DeviceSettingsContextValue'

interface DeviceSettingsProviderProps {
  children: React.ReactNode
}

export function DeviceSettingsProvider({ children }: DeviceSettingsProviderProps) {
  const [settings, setSettings] = useState<DeviceSettings>({
    isMicOn: true,
    isCameraOn: true,
  })

  const toggleMic = useCallback(() => {
    setSettings((prev) => ({ ...prev, isMicOn: !prev.isMicOn }))
  }, [])

  const toggleCamera = useCallback(() => {
    setSettings((prev) => ({ ...prev, isCameraOn: !prev.isCameraOn }))
  }, [])

  return (
    <DeviceSettingsContext.Provider value={{ settings, toggleMic, toggleCamera }}>
      {children}
    </DeviceSettingsContext.Provider>
  )
}
