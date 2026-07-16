import { describe, expect, it, vi } from 'vitest'
import {
  getVisualizationRegistrationStatus,
  requestVisualizationRegistration,
  retryVisualizationRegistration,
} from '../visualizationRegistration'

const register = vi.hoisted(() => vi.fn())

vi.mock('@rubiks-cube-solver/rubiks-cube/puzzles/megaminx', () => ({
  MegaminxPuzzleElement: { register },
}))

describe('visualization registration', () => {
  it('shares loading and error state and can retry a failed registration', async () => {
    let registered = false
    vi.spyOn(customElements, 'get').mockImplementation((name) => {
      return name === 'megaminx-puzzle' && registered ? class extends HTMLElement {} : undefined
    })
    register
      .mockImplementationOnce(() => {
        throw new Error('renderer unavailable')
      })
      .mockImplementationOnce(() => {
        registered = true
      })

    const firstRequest = requestVisualizationRegistration('megaminx')
    expect(getVisualizationRegistrationStatus('megaminx')).toBe('loading')
    await expect(firstRequest).rejects.toThrow('renderer unavailable')
    expect(getVisualizationRegistrationStatus('megaminx')).toBe('error')

    await retryVisualizationRegistration('megaminx')

    expect(register).toHaveBeenCalledTimes(2)
    expect(getVisualizationRegistrationStatus('megaminx')).toBe('ready')
  })
})
