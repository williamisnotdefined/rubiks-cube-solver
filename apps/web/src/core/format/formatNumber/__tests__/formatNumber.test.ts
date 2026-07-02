import { describe, expect, it } from 'vitest'
import { formatNumber } from '../formatNumber'

describe('formatNumber', () => {
  it('formats integers with en-US separators', () => {
    expect(formatNumber(1_234_567)).toBe('1,234,567')
  })
})
