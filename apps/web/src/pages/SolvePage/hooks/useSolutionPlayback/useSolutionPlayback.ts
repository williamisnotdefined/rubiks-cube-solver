import { useState } from 'react'
import type { SolveSuccessResult } from '@api/solver/types'

export function useSolutionPlayback(successResult?: SolveSuccessResult) {
  const [solutionStep, setSolutionStep] = useState(0)
  const visibleSolutionStep = clampSolutionStep(
    solutionStep,
    successResult?.moves.length ?? 0,
  )
  const visibleSolutionMoves = successResult?.moves.slice(0, visibleSolutionStep) ?? []

  function handleSolutionStepChange(nextStep: number) {
    setSolutionStep(clampSolutionStep(nextStep, successResult?.moves.length ?? 0))
  }

  function resetSolutionStep() {
    setSolutionStep(0)
  }

  return {
    onSolutionStepChange: handleSolutionStepChange,
    resetSolutionStep,
    visibleSolutionMoves,
    visibleSolutionStep,
  }
}

function clampSolutionStep(step: number, maxStep: number): number {
  return Math.min(Math.max(step, 0), maxStep)
}
