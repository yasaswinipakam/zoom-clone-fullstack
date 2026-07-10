/**
 * useDeviceSettings — hook providing access to mic/camera toggle state.
 *
 * Exports EXACTLY ONE thing: the useDeviceSettings hook.
 * No component exports — satisfies react-refresh/only-export-components.
 */

import { useContext } from 'react'
import {
  DeviceSettingsContext,
  type DeviceSettingsContextValue,
} from '@/context/DeviceSettingsContextValue'

export function useDeviceSettings(): DeviceSettingsContextValue {
  const ctx = useContext(DeviceSettingsContext)
  if (!ctx) {
    throw new Error('useDeviceSettings must be used within a DeviceSettingsProvider')
  }
  return ctx
}
