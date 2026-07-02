import { describe, expect, it } from 'vitest'
import { safeJoin } from '../safe-path.js'

describe('safeJoin', () => {
  it('joins paths under the root', () => {
    expect(safeJoin('/tmp/wca-data', 'v1/continents.json')).toBe('/tmp/wca-data/v1/continents.json')
  })

  it.each(['../secret.json', '/tmp/secret.json', 'v1/..//secret.json', 'v1\\secret.json'])(
    'rejects unsafe storage path %s',
    (path) => {
      expect(() => safeJoin('/tmp/wca-data', path)).toThrow()
    },
  )
})
