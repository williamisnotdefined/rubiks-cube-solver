import { formatNumber } from '../formatNumber'

export function formatElapsedMs(value: number): string {
  if (value < 1000) {
    return `${formatNumber(value)} ms`
  }

  return `${(value / 1000).toFixed(value < 10_000 ? 2 : 1)} s`
}
