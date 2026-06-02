type FormatTimerTimeOptions = {
  showMilliseconds?: boolean
}

export function formatTimerTime(
  timeMs: number | null | undefined,
  { showMilliseconds = false }: FormatTimerTimeOptions = {},
): string {
  if (timeMs === null || timeMs === undefined || !Number.isFinite(timeMs)) {
    return 'DNF'
  }

  const safeMs = Math.max(0, Math.floor(timeMs))
  const precision = showMilliseconds ? 3 : 2
  const fractionDivisor = showMilliseconds ? 1 : 10
  const totalSeconds = Math.floor(safeMs / 1_000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const fraction = Math.floor((safeMs % 1_000) / fractionDivisor)
    .toString()
    .padStart(precision, '0')

  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${fraction}`
  }

  return `${seconds}.${fraction}`
}
