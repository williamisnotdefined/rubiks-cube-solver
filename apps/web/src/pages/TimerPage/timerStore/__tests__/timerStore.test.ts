import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TimerSolve } from '../../types'
import { useTimerSettingsStore } from '../../timerSettingsStore/timerSettingsStore'
import { createTimerId, useTimerStore } from '../timerStore'

describe('timerStore', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
    useTimerStore.getState().resetTimerStore()
    vi.restoreAllMocks()
  })

  it('starts with the default session and resets to it', () => {
    const store = useTimerStore.getState()

    expect(store.activeSessionId).toBe('timer-session-default')
    expect(store.sessions).toEqual([
      expect.objectContaining({
        eventId: '333',
        id: 'timer-session-default',
        name: 'Default Session',
        solves: [],
      }),
    ])

    store.createSession('Practice')
    useTimerStore.getState().resetTimerStore()

    expect(useTimerStore.getState().sessions).toHaveLength(1)
    expect(useTimerStore.getState().activeSessionId).toBe('timer-session-default')
  })

  it('creates, renames, activates, and changes session event', () => {
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(
      '00000000-0000-4000-8000-000000000001',
    )

    useTimerStore.getState().createSession('OH practice', '222')

    expect(useTimerStore.getState().activeSessionId).toBe(
      'timer-session-00000000-0000-4000-8000-000000000001',
    )
    expect(useTimerStore.getState().sessions.at(-1)).toEqual({
      eventId: '222',
      id: 'timer-session-00000000-0000-4000-8000-000000000001',
      name: 'OH practice',
      solves: [],
    })

    useTimerStore.getState().renameActiveSession('Renamed')
    useTimerStore.getState().setActiveSessionEvent('pyraminx')

    expect(useTimerStore.getState().sessions.at(-1)).toMatchObject({
      eventId: 'pyraminx',
      name: 'Renamed',
    })

    useTimerStore.getState().setActiveSessionId('timer-session-default')
    expect(useTimerStore.getState().activeSessionId).toBe('timer-session-default')
  })

  it('adds, deletes, clears, and penalizes solves in the active session only', () => {
    const firstSolve = solve('solve-1', 10_000)
    const secondSolve = solve('solve-2', 12_000)

    useTimerStore.getState().addSolve(firstSolve)
    useTimerStore.getState().addSolve(secondSolve)

    expect(activeSolves()).toEqual([firstSolve, secondSolve])

    useTimerStore.getState().updateSolvePenalty('solve-1', 'plus2')
    expect(activeSolves()[0]).toMatchObject({ finalTimeMs: 12_000, penalty: 'plus2' })

    useTimerStore.getState().updateSolvePenalty('solve-1', 'dnf')
    expect(activeSolves()[0]).toMatchObject({ finalTimeMs: null, penalty: 'dnf' })

    useTimerStore.getState().deleteSolve('solve-2')
    expect(activeSolves().map((entry) => entry.id)).toEqual(['solve-1'])

    useTimerStore.getState().clearActiveSession()
    expect(activeSolves()).toEqual([])
  })

  it('leaves inactive sessions unchanged when mutating the active session', () => {
    const inactiveSolve = solve('inactive-solve', 8_000)
    const activeSolve = solve('active-solve', 10_000)

    useTimerStore.getState().createSession('Inactive')
    const inactiveSessionId = useTimerStore.getState().activeSessionId
    useTimerStore.getState().addSolve(inactiveSolve)
    useTimerStore.getState().setActiveSessionId('timer-session-default')

    useTimerStore.getState().addSolve(activeSolve)
    useTimerStore.getState().renameActiveSession('Default renamed')
    useTimerStore.getState().setActiveSessionEvent('222')
    useTimerStore.getState().updateSolvePenalty('active-solve', 'plus2')
    useTimerStore.getState().deleteSolve('active-solve')
    useTimerStore.getState().clearActiveSession()

    const inactiveSession = useTimerStore
      .getState()
      .sessions.find((session) => session.id === inactiveSessionId)
    const activeSession = useTimerStore
      .getState()
      .sessions.find((session) => session.id === 'timer-session-default')

    expect(inactiveSession).toMatchObject({
      name: 'Inactive',
      solves: [inactiveSolve],
    })
    expect(activeSession).toMatchObject({
      eventId: '222',
      name: 'Default renamed',
      solves: [],
    })
  })

  it('updates only the latest solve penalty in the active session', () => {
    const firstSolve = solve('solve-1', 8_000)
    const latestSolve = solve('solve-2', 10_000)
    useTimerStore.getState().addSolve(firstSolve)
    useTimerStore.getState().addSolve(latestSolve)
    useTimerStore.getState().createSession('Empty session')
    const emptySessionId = useTimerStore.getState().activeSessionId

    useTimerStore.getState().updateLatestSolvePenalty('dnf')

    expect(activeSolves()).toEqual([])

    useTimerStore.getState().setActiveSessionId('timer-session-default')
    useTimerStore.getState().updateLatestSolvePenalty('plus2')

    expect(activeSolves()).toEqual([
      firstSolve,
      { ...latestSolve, finalTimeMs: 12_000, penalty: 'plus2' },
    ])
    expect(
      useTimerStore.getState().sessions.find((session) => session.id === emptySessionId)?.solves,
    ).toEqual([])
  })

  it('migrates valid legacy data and repairs an invalid active session id', async () => {
    const persistedSolve = solve('persisted-solve', 9_000)
    localStorage.setItem(
      'rubiks-timer-sessions',
      JSON.stringify({
        state: {
          activeSessionId: 'missing-session',
          sessions: [
            {
              eventId: '333',
              id: 'persisted-session',
              name: 'Persisted',
              solves: [persistedSolve, { id: 'corrupt-solve' }],
            },
          ],
        },
        version: 0,
      }),
    )

    await useTimerStore.persist.rehydrate()

    expect(useTimerStore.getState().activeSessionId).toBe('persisted-session')
    expect(useTimerStore.getState().sessions).toEqual([
      {
        eventId: '333',
        id: 'persisted-session',
        name: 'Persisted',
        solves: [persistedSolve],
      },
    ])
  })

  it('preserves legacy event history while the operational event selection falls back', async () => {
    const legacySolve = { ...solve('legacy-solve', 9_000), eventId: 'legacy-solve-event' }
    const migrateTimer = useTimerStore.persist.getOptions().migrate
    const migrateSettings = useTimerSettingsStore.persist.getOptions().migrate
    const migratedTimer = (await migrateTimer?.(
      {
        activeSessionId: 'legacy-session',
        sessions: [
          {
            eventId: 'legacy-session-event',
            id: 'legacy-session',
            name: 'Legacy history',
            solves: [legacySolve],
          },
        ],
      },
      0,
    )) as { activeSessionId: string; sessions: Array<{ eventId: string; solves: TimerSolve[] }> }
    const migratedSettings = (await migrateSettings?.(
      {
        holdToStartMs: 450,
        inspectionEnabled: false,
        selectedEventId: 'legacy-session-event',
        showMilliseconds: false,
      },
      0,
    )) as { selectedEventId: string }

    expect(migratedTimer.activeSessionId).toBe('legacy-session')
    expect(migratedTimer.sessions).toEqual([
      expect.objectContaining({
        eventId: 'legacy-session-event',
        solves: [legacySolve],
      }),
    ])
    expect(migratedSettings.selectedEventId).toBe('333')
  })

  it('recovers from an empty persisted session list', async () => {
    localStorage.setItem(
      'rubiks-timer-sessions',
      JSON.stringify({
        state: { activeSessionId: '', sessions: [] },
        version: 1,
      }),
    )

    await useTimerStore.persist.rehydrate()

    expect(useTimerStore.getState().activeSessionId).toBe('timer-session-default')
    expect(useTimerStore.getState().sessions).toEqual([
      expect.objectContaining({ id: 'timer-session-default', solves: [] }),
    ])
  })

  it('repairs duplicate persisted session and solve ids without losing valid records', async () => {
    vi.spyOn(globalThis.crypto, 'randomUUID')
      .mockReturnValueOnce('00000000-0000-4000-8000-000000000010')
      .mockReturnValueOnce('00000000-0000-4000-8000-000000000011')
      .mockReturnValueOnce('00000000-0000-4000-8000-000000000012')
    const firstSolve = solve('duplicate-solve', 1_000)
    const secondSolve = solve('duplicate-solve', 2_000)
    const thirdSolve = solve('duplicate-solve', 3_000)
    localStorage.setItem(
      'rubiks-timer-sessions',
      JSON.stringify({
        state: {
          activeSessionId: 'duplicate-session',
          sessions: [
            {
              eventId: '333',
              id: 'duplicate-session',
              name: 'First',
              solves: [firstSolve, secondSolve],
            },
            {
              eventId: '222',
              id: 'duplicate-session',
              name: 'Second',
              solves: [thirdSolve],
            },
          ],
        },
        version: 0,
      }),
    )

    await useTimerStore.persist.rehydrate()

    const state = useTimerStore.getState()
    expect(state.activeSessionId).toBe('duplicate-session')
    expect(state.sessions).toHaveLength(2)
    expect(new Set(state.sessions.map((session) => session.id)).size).toBe(2)
    expect(state.sessions.flatMap((session) => session.solves)).toHaveLength(3)
    expect(
      new Set(state.sessions.flatMap((session) => session.solves.map((entry) => entry.id))).size,
    ).toBe(3)
  })

  it('rejects persisted non-finite, negative, empty, and incorrectly typed solve data', async () => {
    const validSolve = solve('valid-solve', 1_000)
    const migrate = useTimerStore.persist.getOptions().migrate
    const migrated = (await migrate?.(
      {
        activeSessionId: 'valid-session',
        sessions: [
          {
            eventId: '333',
            id: 'valid-session',
            name: 'Valid',
            solves: [
              validSolve,
              { ...validSolve, endedAt: Number.NaN, id: 'nan-ended-at' },
              { ...validSolve, id: 'infinite-raw-time', rawTimeMs: Number.POSITIVE_INFINITY },
              { ...validSolve, id: 'negative-time', rawTimeMs: -1 },
              { ...validSolve, eventId: '', id: 'empty-event' },
              { ...validSolve, eventId: 333, id: 'non-string-event' },
              { ...validSolve, id: '', rawTimeMs: 1_000 },
              { ...validSolve, id: 'unsupported-penalty', penalty: 'invalid' },
              { ...validSolve, finalTimeMs: null, id: 'inconsistent-final-time' },
            ],
          },
          { eventId: '', id: 'empty-event-session', name: 'Invalid', solves: [] },
          { eventId: 333, id: 'non-string-event-session', name: 'Invalid', solves: [] },
        ],
      },
      0,
    )) as { activeSessionId: string; sessions: Array<{ solves: TimerSolve[] }> }

    expect(migrated.sessions).toHaveLength(1)
    expect(migrated.sessions[0]?.solves).toEqual([validSolve])
  })

  it('mutates only the first matching session and solve when runtime state has duplicate ids', () => {
    const firstSolve = solve('duplicate-solve', 1_000)
    const secondSolve = solve('duplicate-solve', 2_000)
    useTimerStore.setState({
      activeSessionId: 'duplicate-session',
      sessions: [
        { eventId: '333', id: 'duplicate-session', name: 'First', solves: [firstSolve] },
        { eventId: '333', id: 'duplicate-session', name: 'Second', solves: [secondSolve] },
      ],
    })

    useTimerStore.getState().addSolve(solve('added-solve', 3_000))
    useTimerStore.getState().updateSolvePenalty('duplicate-solve', 'plus2')

    expect(useTimerStore.getState().sessions[0]?.solves).toEqual([
      { ...firstSolve, finalTimeMs: 3_000, penalty: 'plus2' },
      solve('added-solve', 3_000),
    ])
    expect(useTimerStore.getState().sessions[1]?.solves).toEqual([secondSolve])

    useTimerStore.getState().deleteSolve('duplicate-solve')

    expect(useTimerStore.getState().sessions[0]?.solves.map((entry) => entry.id)).toEqual([
      'added-solve',
    ])
    expect(useTimerStore.getState().sessions[1]?.solves).toEqual([secondSolve])
  })

  it('uses secure random values when randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (values: Uint32Array) => {
        values.set([1, 2, 3, 4])
        return values
      },
    })

    expect(createTimerId('session')).toBe('timer-session-00000001000000020000000300000004')
  })

  it('uses a unique compatible fallback when Web Crypto is unavailable', () => {
    vi.stubGlobal('crypto', {})
    vi.spyOn(Date, 'now').mockReturnValue(123)

    const firstId = createTimerId('session')
    const secondId = createTimerId('session')

    expect(firstId).toMatch(/^timer-session-123-\d+$/)
    expect(secondId).toMatch(/^timer-session-123-\d+$/)
    expect(secondId).not.toBe(firstId)
  })
})

function activeSolves(): TimerSolve[] {
  const { activeSessionId, sessions } = useTimerStore.getState()
  return sessions.find((session) => session.id === activeSessionId)?.solves ?? []
}

function solve(id: string, rawTimeMs: number): TimerSolve {
  return {
    comment: '',
    endedAt: rawTimeMs,
    eventId: '333',
    finalTimeMs: rawTimeMs,
    id,
    penalty: 'ok',
    rawTimeMs,
    scramble: 'R U',
    startedAt: 0,
  }
}
