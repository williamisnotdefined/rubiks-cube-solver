import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { defaultScrambleEventId, scrambleEvents } from '@core/scramble/catalog'

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
const timerSettingsVersion = 1

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
      version: timerSettingsVersion,
      migrate: (persistedState) => sanitizePersistedTimerSettings(persistedState),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...sanitizePersistedTimerSettings(persistedState),
      }),
    },
  ),
)

type PersistedTimerSettings = Pick<
  TimerSettingsState,
  'holdToStartMs' | 'inspectionEnabled' | 'selectedEventId' | 'showMilliseconds'
>

function sanitizePersistedTimerSettings(value: unknown): PersistedTimerSettings {
  if (typeof value !== 'object' || value === null) {
    return defaultTimerSettings
  }

  const persisted = value as Record<string, unknown>
  const selectedEventId =
    typeof persisted.selectedEventId === 'string' &&
    scrambleEvents.some((event) => event.id === persisted.selectedEventId)
      ? persisted.selectedEventId
      : defaultTimerSettings.selectedEventId

  return {
    holdToStartMs:
      typeof persisted.holdToStartMs === 'number' &&
      Number.isFinite(persisted.holdToStartMs) &&
      persisted.holdToStartMs >= 0
        ? persisted.holdToStartMs
        : defaultTimerSettings.holdToStartMs,
    inspectionEnabled:
      typeof persisted.inspectionEnabled === 'boolean'
        ? persisted.inspectionEnabled
        : defaultTimerSettings.inspectionEnabled,
    selectedEventId,
    showMilliseconds:
      typeof persisted.showMilliseconds === 'boolean'
        ? persisted.showMilliseconds
        : defaultTimerSettings.showMilliseconds,
  }
}
