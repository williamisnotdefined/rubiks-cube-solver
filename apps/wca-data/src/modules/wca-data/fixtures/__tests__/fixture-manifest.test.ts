import { describe, expect, it } from 'vitest'
import { fixtureDataset } from '../fixture-manifest.js'

describe('fixture dataset metadata', () => {
  it('identifies the bundled canonical fixture dataset', () => {
    expect(fixtureDataset).toEqual({
      exportDate: '2026-06-30T00:00:16Z',
      exportVersion: 'v2.0.2',
      id: 'fixture-wca-data-v1',
      publishedAt: '2026-06-30T04:58:00Z',
    })
  })
})
