export type TimerPenalty = 'ok' | 'plus2' | 'dnf'

export function finalTimeMs(rawTimeMs: number, penalty: TimerPenalty): number | null {
  if (penalty === 'dnf') {
    return null
  }

  if (penalty === 'plus2') {
    return rawTimeMs + 2_000
  }

  return rawTimeMs
}
