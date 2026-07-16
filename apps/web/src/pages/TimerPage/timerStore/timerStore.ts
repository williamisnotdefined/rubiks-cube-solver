import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { defaultScrambleEventId, scrambleEvents } from '@core/scramble/catalog'
import { finalTimeMs } from '@core/timer/penalties'
import type { TimerPenalty } from '@core/timer/penalties'
import type { TimerSession, TimerSolve } from '../types'

type TimerStoreState = {
  activeSessionId: string
  addSolve: (solve: TimerSolve, sessionId?: string) => void
  clearActiveSession: () => void
  createSession: (name: string, eventId?: string) => void
  deleteSolve: (solveId: string) => void
  renameActiveSession: (name: string) => void
  resetTimerStore: () => void
  sessions: TimerSession[]
  setActiveSessionEvent: (eventId: string) => void
  setActiveSessionId: (sessionId: string) => void
  updateLatestSolvePenalty: (penalty: TimerPenalty) => void
  updateSolvePenalty: (solveId: string, penalty: TimerPenalty) => void
}

const defaultSessionId = 'timer-session-default'
const timerStoreVersion = 1
let fallbackIdSequence = 0

export function createTimerId(kind: 'session' | 'solve'): string {
  const prefix = kind === 'session' ? 'timer-session' : 'solve'

  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `${prefix}-${globalThis.crypto.randomUUID()}`
  }

  fallbackIdSequence += 1
  return `${prefix}-${Date.now()}-${fallbackIdSequence}-${Math.random().toString(36).slice(2)}`
}

function defaultTimerSession(): TimerSession {
  return {
    eventId: defaultScrambleEventId,
    id: defaultSessionId,
    name: 'Default Session',
    solves: [],
  }
}

function defaultTimerStoreState() {
  return {
    activeSessionId: defaultSessionId,
    sessions: [defaultTimerSession()],
  }
}

export const useTimerStore = create<TimerStoreState>()(
  persist(
    (set, get) => ({
      ...defaultTimerStoreState(),
      addSolve: (solve, sessionId) => {
        const targetSessionId = sessionId ?? validActiveSessionId(get())

        set((state) => {
          const sanitizedSolve = sanitizeSolve(solve)

          if (sanitizedSolve === null) {
            return state
          }

          const solveIds = new Set(
            state.sessions.flatMap((session) => session.solves.map((entry) => entry.id)),
          )
          const solveToAdd = solveIds.has(sanitizedSolve.id)
            ? { ...sanitizedSolve, id: createUniqueTimerId('solve', solveIds) }
            : sanitizedSolve

          return {
            sessions: updateFirstSession(state.sessions, targetSessionId, (session) => ({
              ...session,
              solves: [...session.solves, solveToAdd],
            })),
          }
        })
      },
      clearActiveSession: () => {
        const { activeSessionId } = get()

        set((state) => ({
          sessions: updateFirstSession(state.sessions, activeSessionId, (session) => ({
            ...session,
            solves: [],
          })),
        }))
      },
      createSession: (name, eventId = defaultScrambleEventId) => {
        set((state) => {
          const sessionId = createUniqueTimerId(
            'session',
            new Set(state.sessions.map((session) => session.id)),
          )

          return {
            activeSessionId: sessionId,
            sessions: [
              ...state.sessions,
              {
                eventId: isSupportedEventId(eventId) ? eventId : defaultScrambleEventId,
                id: sessionId,
                name,
                solves: [],
              },
            ],
          }
        })
      },
      deleteSolve: (solveId) => {
        const { activeSessionId } = get()

        set((state) => ({
          sessions: updateFirstSession(state.sessions, activeSessionId, (session) => ({
            ...session,
            solves: removeFirstSolve(session.solves, solveId),
          })),
        }))
      },
      renameActiveSession: (name) => {
        const { activeSessionId } = get()

        set((state) => ({
          sessions: updateFirstSession(state.sessions, activeSessionId, (session) => ({
            ...session,
            name,
          })),
        }))
      },
      resetTimerStore: () => set(defaultTimerStoreState()),
      setActiveSessionEvent: (eventId) => {
        const { activeSessionId } = get()

        if (!isSupportedEventId(eventId)) {
          return
        }

        set((state) => ({
          sessions: updateFirstSession(state.sessions, activeSessionId, (session) => ({
            ...session,
            eventId,
          })),
        }))
      },
      setActiveSessionId: (activeSessionId) =>
        set((state) => ({
          activeSessionId: state.sessions.some((session) => session.id === activeSessionId)
            ? activeSessionId
            : (state.sessions[0]?.id ?? defaultSessionId),
        })),
      updateLatestSolvePenalty: (penalty) => {
        const { activeSessionId } = get()

        if (!isTimerPenalty(penalty)) {
          return
        }

        set((state) => ({
          sessions: updateFirstSession(state.sessions, activeSessionId, (session) => {
            const latestSolve = session.solves.at(-1)

            if (latestSolve === undefined) {
              return session
            }

            return {
              ...session,
              solves: [
                ...session.solves.slice(0, -1),
                {
                  ...latestSolve,
                  finalTimeMs: finalTimeMs(latestSolve.rawTimeMs, penalty),
                  penalty,
                },
              ],
            }
          }),
        }))
      },
      updateSolvePenalty: (solveId, penalty) => {
        const { activeSessionId } = get()

        if (!isTimerPenalty(penalty)) {
          return
        }

        set((state) => ({
          sessions: updateFirstSession(state.sessions, activeSessionId, (session) => ({
            ...session,
            solves: updateFirstSolve(session.solves, solveId, (solve) => ({
              ...solve,
              finalTimeMs: finalTimeMs(solve.rawTimeMs, penalty),
              penalty,
            })),
          })),
        }))
      },
    }),
    {
      name: 'rubiks-timer-sessions',
      storage: createJSONStorage(() => localStorage),
      version: timerStoreVersion,
      migrate: (persistedState) => sanitizePersistedTimerState(persistedState),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...sanitizePersistedTimerState(persistedState),
      }),
    },
  ),
)

type PersistedTimerState = Pick<TimerStoreState, 'activeSessionId' | 'sessions'>

function validActiveSessionId(state: PersistedTimerState): string {
  return state.sessions.some((session) => session.id === state.activeSessionId)
    ? state.activeSessionId
    : (state.sessions[0]?.id ?? defaultSessionId)
}

function sanitizePersistedTimerState(value: unknown): PersistedTimerState {
  if (!isRecord(value)) {
    return defaultTimerStoreState()
  }

  const sessionIds = new Set<string>()
  const solveIds = new Set<string>()
  const sessions = Array.isArray(value.sessions)
    ? value.sessions.flatMap((session) => {
        const sanitized = sanitizeSession(session, solveIds)

        if (sanitized === null) {
          return []
        }

        if (sessionIds.has(sanitized.id)) {
          sanitized.id = createUniqueTimerId('session', sessionIds)
        }

        sessionIds.add(sanitized.id)
        return [sanitized]
      })
    : []
  const safeSessions = sessions.length > 0 ? sessions : [defaultTimerSession()]
  const requestedActiveSessionId =
    typeof value.activeSessionId === 'string' ? value.activeSessionId : ''

  return {
    activeSessionId: safeSessions.some((session) => session.id === requestedActiveSessionId)
      ? requestedActiveSessionId
      : safeSessions[0]!.id,
    sessions: safeSessions,
  }
}

function sanitizeSession(value: unknown, solveIds: Set<string>): TimerSession | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    value.id.trim() === '' ||
    typeof value.name !== 'string' ||
    !isNonEmptyString(value.eventId)
  ) {
    return null
  }

  const solves = Array.isArray(value.solves)
    ? value.solves.flatMap((solve) => {
        const sanitized = sanitizeSolve(solve)

        if (sanitized === null) {
          return []
        }

        if (solveIds.has(sanitized.id)) {
          sanitized.id = createUniqueTimerId('solve', solveIds)
        }

        solveIds.add(sanitized.id)
        return [sanitized]
      })
    : []

  return {
    eventId: value.eventId,
    id: value.id,
    name: value.name,
    solves,
  }
}

function sanitizeSolve(value: unknown): TimerSolve | null {
  if (!isRecord(value)) {
    return null
  }

  if (
    typeof value.comment !== 'string' ||
    !isNonNegativeFiniteNumber(value.endedAt) ||
    !isNonEmptyString(value.eventId) ||
    typeof value.id !== 'string' ||
    value.id.trim() === '' ||
    !isTimerPenalty(value.penalty) ||
    !isNonNegativeFiniteNumber(value.rawTimeMs) ||
    typeof value.scramble !== 'string' ||
    !isNonNegativeFiniteNumber(value.startedAt) ||
    value.endedAt < value.startedAt
  ) {
    return null
  }

  const expectedFinalTimeMs = finalTimeMs(value.rawTimeMs, value.penalty)

  if (value.finalTimeMs !== expectedFinalTimeMs) {
    return null
  }

  return {
    comment: value.comment,
    endedAt: value.endedAt,
    eventId: value.eventId,
    finalTimeMs: expectedFinalTimeMs,
    id: value.id,
    penalty: value.penalty,
    rawTimeMs: value.rawTimeMs,
    scramble: value.scramble,
    startedAt: value.startedAt,
  }
}

function createUniqueTimerId(kind: 'session' | 'solve', occupiedIds: Set<string>): string {
  let collision = 0
  let id = createTimerId(kind)

  while (occupiedIds.has(id)) {
    collision += 1
    id = `${createTimerId(kind)}-${collision}`
  }

  return id
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== ''
}

function isSupportedEventId(value: unknown): value is string {
  return typeof value === 'string' && scrambleEvents.some((event) => event.id === value)
}

function isTimerPenalty(value: unknown): value is TimerPenalty {
  return value === 'ok' || value === 'plus2' || value === 'dnf'
}

function removeFirstSolve(solves: TimerSolve[], solveId: string): TimerSolve[] {
  const index = solves.findIndex((solve) => solve.id === solveId)

  if (index === -1) {
    return solves
  }

  return [...solves.slice(0, index), ...solves.slice(index + 1)]
}

function updateFirstSession(
  sessions: TimerSession[],
  sessionId: string,
  update: (session: TimerSession) => TimerSession,
): TimerSession[] {
  const index = sessions.findIndex((session) => session.id === sessionId)

  if (index === -1) {
    return sessions
  }

  const updated = [...sessions]
  updated[index] = update(sessions[index]!)
  return updated
}

function updateFirstSolve(
  solves: TimerSolve[],
  solveId: string,
  update: (solve: TimerSolve) => TimerSolve,
): TimerSolve[] {
  const index = solves.findIndex((solve) => solve.id === solveId)

  if (index === -1) {
    return solves
  }

  const updated = [...solves]
  updated[index] = update(solves[index]!)
  return updated
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
