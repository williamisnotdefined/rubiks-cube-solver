import { beforeEach, describe, expect, it } from 'vitest'
import { useSolveSettingsStore } from '../solveSettingsStore'

describe('solve settings store', () => {
  beforeEach(() => {
    useSolveSettingsStore.getState().resetSolveSettings()
  })

  it('starts with default solve limits', () => {
    expect(useSolveSettingsStore.getState()).toMatchObject({
      maxMovesInput: '20',
      maxNodesMillionInput: '10',
    })
  })

  it('updates and resets solve limits', () => {
    useSolveSettingsStore.getState().setMaxMovesInput('30')
    useSolveSettingsStore.getState().setMaxNodesMillionInput('25')

    expect(useSolveSettingsStore.getState()).toMatchObject({
      maxMovesInput: '30',
      maxNodesMillionInput: '25',
    })

    useSolveSettingsStore.getState().resetSolveSettings()

    expect(useSolveSettingsStore.getState()).toMatchObject({
      maxMovesInput: '20',
      maxNodesMillionInput: '10',
    })
  })
})
