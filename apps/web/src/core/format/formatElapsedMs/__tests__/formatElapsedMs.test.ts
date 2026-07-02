import { describe, expect, it } from 'vitest'
import { formatElapsedMs } from '../formatElapsedMs'

describe('formatElapsedMs', () => {
  it('keeps subsecond values in milliseconds', () => {
    expect(formatElapsedMs(987)).toBe('987 ms')
  })

  it('formats short second values with two decimals', () => {
    expect(formatElapsedMs(1_234)).toBe('1.23 s')
  })

  it('formats long second values with one decimal', () => {
    expect(formatElapsedMs(12_345)).toBe('12.3 s')
  })
})
