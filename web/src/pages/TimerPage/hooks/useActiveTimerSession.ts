import { useTimerStore } from '../timerStore'

export function useActiveTimerSession() {
  const sessions = useTimerStore((state) => state.sessions)
  const activeSessionId = useTimerStore((state) => state.activeSessionId)

  return sessions.find((session) => session.id === activeSessionId) ?? sessions[0]!
}
