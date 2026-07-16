import { beforeEach, describe, expect, it } from 'vitest'
import { useTimerSettingsStore } from '../timerSettingsStore'

describe('timerSettingsStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useTimerSettingsStore.getState().resetTimerSettings()
  })

  it('updates and resets timer settings', () => {
    useTimerSettingsStore.getState().setHoldToStartMs(0)
    useTimerSettingsStore.getState().setInspectionEnabled(true)
    useTimerSettingsStore.getState().setSelectedEventId('222')
    useTimerSettingsStore.getState().setShowMilliseconds(true)

    expect(useTimerSettingsStore.getState()).toMatchObject({
      holdToStartMs: 0,
      inspectionEnabled: true,
      selectedEventId: '222',
      showMilliseconds: true,
    })

    useTimerSettingsStore.getState().resetTimerSettings()

    expect(useTimerSettingsStore.getState()).toMatchObject({
      holdToStartMs: 450,
      inspectionEnabled: false,
      selectedEventId: '333',
      showMilliseconds: false,
    })
  })

  it('sanitizes non-finite, negative, and unsupported persisted settings', async () => {
    const migrate = useTimerSettingsStore.persist.getOptions().migrate
    const invalidInfinity = await migrate?.(
      {
        holdToStartMs: Number.POSITIVE_INFINITY,
        inspectionEnabled: 'yes',
        selectedEventId: 'unsupported',
        showMilliseconds: null,
      },
      0,
    )
    const invalidNegative = await migrate?.(
      {
        holdToStartMs: -1,
        inspectionEnabled: true,
        selectedEventId: '222',
        showMilliseconds: true,
      },
      0,
    )

    expect(invalidInfinity).toEqual({
      holdToStartMs: 450,
      inspectionEnabled: false,
      selectedEventId: '333',
      showMilliseconds: false,
    })
    expect(invalidNegative).toEqual({
      holdToStartMs: 450,
      inspectionEnabled: true,
      selectedEventId: '222',
      showMilliseconds: true,
    })
  })
})
