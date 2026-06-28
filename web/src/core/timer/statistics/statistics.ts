import { finalTimeMs, type TimerPenalty } from '../penalties'

export type TimedSolve = {
  penalty: TimerPenalty
  rawTimeMs: number
}

export type AverageResult = {
  count: number
  label: string
  timeMs: number | null
}

export type TimerStats = {
  ao5: AverageResult
  ao12: AverageResult
  bestMs: number | null
  meanMs: number | null
}

export function solveTimeMs(solve: TimedSolve): number | null {
  return finalTimeMs(solve.rawTimeMs, solve.penalty)
}

export function bestTimeMs(solves: readonly TimedSolve[]): number | null {
  const times = solves.map(solveTimeMs).filter(isNumber)

  if (times.length === 0) {
    return null
  }

  return Math.min(...times)
}

export function meanTimeMs(solves: readonly TimedSolve[]): number | null {
  const times = solves.map(solveTimeMs).filter(isNumber)

  if (times.length === 0) {
    return null
  }

  return Math.round(times.reduce((total, time) => total + time, 0) / times.length)
}

export function averageOf(
  solves: readonly TimedSolve[],
  count: number,
  label = `ao${count}`,
): AverageResult {
  if (solves.length < count || count < 3) {
    return { count, label, timeMs: null }
  }

  const window = solves.slice(-count).map(solveTimeMs)
  const dnfCount = window.filter((time) => time === null).length

  if (dnfCount > 1) {
    return { count, label, timeMs: null }
  }

  const finiteTimes = window.filter(isNumber).sort((a, b) => a - b)

  if (dnfCount === 1) {
    finiteTimes.shift()
  } else {
    finiteTimes.shift()
    finiteTimes.pop()
  }

  if (finiteTimes.length === 0) {
    return { count, label, timeMs: null }
  }

  return {
    count,
    label,
    timeMs: Math.round(finiteTimes.reduce((total, time) => total + time, 0) / finiteTimes.length),
  }
}

export function timerStats(solves: readonly TimedSolve[]): TimerStats {
  return {
    ao5: averageOf(solves, 5, 'ao5'),
    ao12: averageOf(solves, 12, 'ao12'),
    bestMs: bestTimeMs(solves),
    meanMs: meanTimeMs(solves),
  }
}

function isNumber(value: number | null): value is number {
  return value !== null
}
