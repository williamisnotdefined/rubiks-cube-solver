import { describe, expect, it } from 'vitest'
import { fourByFourPllParityCases } from '../../4x4/pllParity'
import { validateAlgorithmCases } from '../algorithmSets'

describe('algorithm set integrity', () => {
  it('keeps the 4x4 CwO parity algorithm intact', () => {
    const cwo = fourByFourPllParityCases.find(({ name }) => name === 'CwO')

    expect(cwo?.algorithm).toBe("M2 U' M2 U' M' U2 M2 U2 M' 2R2 U2 2R2 Uw2 2R2 Uw2")
    expect(() => validateAlgorithmCases(fourByFourPllParityCases, '4x4 PLL Parity')).not.toThrow()
  })

  it.each([
    ['', 'empty'],
    ["R U R' ...", 'truncated'],
    ['<span class="alg">R U</span>', 'HTML'],
  ])('rejects %s algorithm data (%s)', (algorithm) => {
    expect(() =>
      validateAlgorithmCases(
        [{ algorithm, image: '/case.svg', name: 'Broken case' }],
        'Broken set',
      ),
    ).toThrow('Invalid algorithm in Broken set: Broken case')
  })
})
