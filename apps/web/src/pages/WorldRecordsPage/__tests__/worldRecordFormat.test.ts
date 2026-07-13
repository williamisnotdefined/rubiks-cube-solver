import { describe, expect, it } from 'vitest'
import type { WcaEvent, WcaWorldRecordType } from '@api/wcaData'
import {
  formatCentiseconds,
  formatRecordType,
  formatRecordValue,
  formatSolveValue,
} from '../worldRecordFormat'
import { numberEvent, timeEvent } from './wcaDataFixtures'

const multiEvent: WcaEvent = {
  format: 'multi',
  id: '333mbf',
  name: '3x3x3 Multi-Blind',
}

describe('world record formatting', () => {
  it.each([
    { event: timeEvent, expected: 'DNF', raw: -1, type: 'single' },
    { event: timeEvent, expected: 'DNS', raw: -2, type: 'average' },
    { event: timeEvent, expected: '59.99', raw: 5_999, type: 'single' },
    { event: timeEvent, expected: '1:01.05', raw: 6_105, type: 'average' },
    { event: numberEvent, expected: '27 moves', raw: 27, type: 'single' },
    { event: numberEvent, expected: '27.54 moves', raw: 2_754, type: 'average' },
    { event: multiEvent, expected: '820000077', raw: 820_000_077, type: 'single' },
  ] satisfies Array<{
    event: WcaEvent
    expected: string
    raw: number
    type: WcaWorldRecordType
  }>)('formats $event.name $type value $raw', ({ event, expected, raw, type }) => {
    expect(formatRecordValue({ event, type, value: { raw } })).toBe(expected)
  })

  it('formats solve values through the same public rules', () => {
    expect(formatSolveValue(432, timeEvent, 'single')).toBe('4.32')
  })

  it('formats both record type labels', () => {
    expect(formatRecordType('single')).toBe('Single')
    expect(formatRecordType('average')).toBe('Average')
  })

  it('formats negative non-sentinel times by magnitude', () => {
    expect(formatCentiseconds(-432)).toBe('4.32')
  })
})
