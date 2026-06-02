import { describe, expect, it } from 'vitest'
import { formatTimerTime } from '../formatTimerTime'

describe('formatTimerTime', () => {
  it('formats centiseconds by default', () => {
    expect(formatTimerTime(12_345)).toBe('12.34')
  })

  it('formats milliseconds when requested', () => {
    expect(formatTimerTime(12_345, { showMilliseconds: true })).toBe('12.345')
  })

  it('formats minute times', () => {
    expect(formatTimerTime(62_345)).toBe('1:02.34')
  })

  it('formats unavailable values as DNF', () => {
    expect(formatTimerTime(null)).toBe('DNF')
  })
})
