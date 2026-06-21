import { create } from 'zustand'
import { defaultMaxMoves, defaultMaxNodesMillion } from './constants'

type SolveSettingsState = {
  maxMovesInput: string
  maxNodesMillionInput: string
  resetSolveSettings: () => void
  setMaxMovesInput: (maxMovesInput: string) => void
  setMaxNodesMillionInput: (maxNodesMillionInput: string) => void
}

const defaultSolveSettings = {
  maxMovesInput: String(defaultMaxMoves),
  maxNodesMillionInput: String(defaultMaxNodesMillion),
}

export const useSolveSettingsStore = create<SolveSettingsState>((set) => ({
  ...defaultSolveSettings,
  resetSolveSettings: () => set(defaultSolveSettings),
  setMaxMovesInput: (maxMovesInput) => set({ maxMovesInput }),
  setMaxNodesMillionInput: (maxNodesMillionInput) => set({ maxNodesMillionInput }),
}))
