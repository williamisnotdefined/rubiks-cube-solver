import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { defaultScrambleEventId } from '@core/scramble/catalog'

type TimerSettingsState = {
  holdToStartMs: number
  inspectionEnabled: boolean
  resetTimerSettings: () => void
  selectedEventId: string
  setHoldToStartMs: (holdToStartMs: number) => void
  setInspectionEnabled: (inspectionEnabled: boolean) => void
  setSelectedEventId: (selectedEventId: string) => void
  setShowMilliseconds: (showMilliseconds: boolean) => void
  showMilliseconds: boolean
}

const defaultTimerSettings = {
  holdToStartMs: 450,
  inspectionEnabled: false,
  selectedEventId: defaultScrambleEventId,
  showMilliseconds: false,
}

export const useTimerSettingsStore = create<TimerSettingsState>()(
  persist(
    (set) => ({
      ...defaultTimerSettings,
      resetTimerSettings: () => set(defaultTimerSettings),
      setHoldToStartMs: (holdToStartMs) => set({ holdToStartMs }),
      setInspectionEnabled: (inspectionEnabled) => set({ inspectionEnabled }),
      setSelectedEventId: (selectedEventId) => set({ selectedEventId }),
      setShowMilliseconds: (showMilliseconds) => set({ showMilliseconds }),
    }),
    {
      name: 'rubiks-timer-settings',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
