import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TimerSolve } from '../../types'
import { useTimerStore } from '../timerStore'

describe('timerStore', () => {
  beforeEach(() => {
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
    vi.spyOn(Date, 'now').mockReturnValue(123)

    useTimerStore.getState().createSession('OH practice', '222')

    expect(useTimerStore.getState().activeSessionId).toBe('timer-session-123')
    expect(useTimerStore.getState().sessions.at(-1)).toEqual({
      eventId: '222',
      id: 'timer-session-123',
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
