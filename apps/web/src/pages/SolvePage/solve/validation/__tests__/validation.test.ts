import { describe, expect, it } from 'vitest'
import i18n from '@src/i18n/i18n'
import {
  validateMaxNodesMillionOption,
  validateWholeNumberLimit,
  validationErrorMessage,
} from '../validation'

describe('solve validation', () => {
  it('validates whole-number limits', () => {
    expect(validationErrorMessage(i18n.t, validateWholeNumberLimit('', 'Max moves', 30))).toBe(
      'Max moves is required',
    )
    expect(validationErrorMessage(i18n.t, validateWholeNumberLimit('1.5', 'Max moves', 30))).toBe(
      'Max moves must be a whole number',
    )
    expect(validationErrorMessage(i18n.t, validateWholeNumberLimit('-1', 'Max moves', 30))).toBe(
      'Max moves must be a whole number',
    )
    expect(validationErrorMessage(i18n.t, validateWholeNumberLimit('31', 'Max moves', 30))).toBe(
      'Max moves must be 30 or less',
    )
    expect(validateWholeNumberLimit('30', 'Max moves', 30)).toBeUndefined()
  })

  it('validates max-node options', () => {
    expect(validationErrorMessage(i18n.t, validateMaxNodesMillionOption('', 'Max nodes (M)'))).toBe(
      'Max nodes (M) is required',
    )
    expect(validationErrorMessage(i18n.t, validateMaxNodesMillionOption('1.5', 'Max nodes (M)'))).toBe(
      'Max nodes (M) must be a whole number',
    )
    expect(validationErrorMessage(i18n.t, validateMaxNodesMillionOption('11', 'Max nodes (M)'))).toBe(
      'Max nodes (M) must be one of 10, 15, 20, 25',
    )
    expect(validateMaxNodesMillionOption('25', 'Max nodes (M)')).toBeUndefined()
  })
})
