import type { TimerPenalty } from '@core/timer/penalties'

export type TimerStatus = 'idle' | 'holding' | 'ready' | 'inspection' | 'running' | 'stopped'

export type TimerSolve = {
  comment: string
  endedAt: number
  eventId: string
  finalTimeMs: number | null
  id: string
  penalty: TimerPenalty
  rawTimeMs: number
  scramble: string
  startedAt: number
}

export type TimerSession = {
  eventId: string
  id: string
  name: string
  solves: TimerSolve[]
}
