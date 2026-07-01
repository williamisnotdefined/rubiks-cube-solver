import { describe, expect, it } from 'vitest'
import { exportFormatMajor } from '../export-metadata.js'

describe('exportFormatMajor', () => {
  it('parses WCA export format major versions', () => {
    expect(exportFormatMajor('v2.0.2')).toBe(2)
    expect(exportFormatMajor('2.0.2')).toBe(2)
    expect(exportFormatMajor('10')).toBe(10)
  })

  it('returns null for unsupported version text', () => {
    expect(exportFormatMajor('latest')).toBeNull()
  })
})
