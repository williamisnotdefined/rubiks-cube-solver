import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { defaultScrambleEventId } from '@core/scramble/catalog'
import { finalTimeMs } from '@core/timer/penalties'
import type { TimerPenalty } from '@core/timer/penalties'
import type { TimerSession, TimerSolve } from '../types'

type TimerStoreState = {
  activeSessionId: string
  addSolve: (solve: TimerSolve) => void
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
      addSolve: (solve) => {
        const { activeSessionId } = get()

        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === activeSessionId
              ? { ...session, solves: [...session.solves, solve] }
              : session,
          ),
        }))
      },
      clearActiveSession: () => {
        const { activeSessionId } = get()

        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === activeSessionId ? { ...session, solves: [] } : session,
          ),
        }))
      },
      createSession: (name, eventId = defaultScrambleEventId) => {
        const sessionId = `timer-session-${Date.now()}`

        set((state) => ({
          activeSessionId: sessionId,
          sessions: [
            ...state.sessions,
            {
              eventId,
              id: sessionId,
              name,
              solves: [],
            },
          ],
        }))
      },
      deleteSolve: (solveId) => {
        const { activeSessionId } = get()

        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === activeSessionId
              ? { ...session, solves: session.solves.filter((solve) => solve.id !== solveId) }
              : session,
          ),
        }))
      },
      renameActiveSession: (name) => {
        const { activeSessionId } = get()

        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === activeSessionId ? { ...session, name } : session,
          ),
        }))
      },
      resetTimerStore: () => set(defaultTimerStoreState()),
      setActiveSessionEvent: (eventId) => {
        const { activeSessionId } = get()

        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === activeSessionId ? { ...session, eventId } : session,
          ),
        }))
      },
      setActiveSessionId: (activeSessionId) => set({ activeSessionId }),
      updateLatestSolvePenalty: (penalty) => {
        const { activeSessionId } = get()

        set((state) => ({
          sessions: state.sessions.map((session) => {
            if (session.id !== activeSessionId) {
              return session
            }

            const latestSolve = session.solves.at(-1)

            if (latestSolve === undefined) {
              return session
            }

            return {
              ...session,
              solves: session.solves.map((solve) =>
                solve.id === latestSolve.id
                  ? { ...solve, finalTimeMs: finalTimeMs(solve.rawTimeMs, penalty), penalty }
                  : solve,
              ),
            }
          }),
        }))
      },
      updateSolvePenalty: (solveId, penalty) => {
        const { activeSessionId } = get()

        set((state) => ({
          sessions: state.sessions.map((session) => {
            if (session.id !== activeSessionId) {
              return session
            }

            return {
              ...session,
              solves: session.solves.map((solve) =>
                solve.id === solveId
                  ? { ...solve, finalTimeMs: finalTimeMs(solve.rawTimeMs, penalty), penalty }
                  : solve,
              ),
            }
          }),
        }))
      },
    }),
    {
      name: 'rubiks-timer-sessions',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
