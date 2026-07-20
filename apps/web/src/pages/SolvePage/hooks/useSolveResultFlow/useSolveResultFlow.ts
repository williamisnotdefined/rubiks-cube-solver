import { useSolvePuzzleNotation } from '@api/solver'
import type { SolveResult as ApiSolveResult } from '@api/solver/types'
import { waitForPaint } from '@core/timing/waitForPaint'
import { useState } from 'react'
import { isNoSolutionLimitFailure } from '../../solve/noSolutionLimits'

export type SolveSource = 'notation' | 'scan'

type SubmitNotationSolveInput = {
  maxDepth: number
  maxNodes: number
  notation: string
  puzzleSlug: string
  strategyId: string
}

export function useSolveResultFlow() {
  const solveMutation = useSolvePuzzleNotation()
  const [activeSolveSource, setActiveSolveSource] = useState<SolveSource>('notation')
  const [scanSessionSolveResult, setScanSessionSolveResult] = useState<ApiSolveResult | undefined>()
  const [dismissedLimitFailureResult, setDismissedLimitFailureResult] = useState<
    ApiSolveResult | undefined
  >()
  const activeSolveResult =
    activeSolveSource === 'scan' ? scanSessionSolveResult : solveMutation.data
  const activeSolveError = activeSolveSource === 'scan' ? null : solveMutation.error
  const successResult = activeSolveResult?.status === 'success' ? activeSolveResult : undefined
  const notationLimitFailureResult =
    activeSolveSource === 'notation' && isNoSolutionLimitFailure(activeSolveResult)
      ? activeSolveResult
      : undefined
  const limitFailureModalDismissed =
    activeSolveResult !== undefined && dismissedLimitFailureResult === activeSolveResult

  async function submitNotationSolve({
    maxDepth,
    maxNodes,
    notation,
    puzzleSlug,
    strategyId,
  }: SubmitNotationSolveInput) {
    setActiveSolveSource('notation')
    setScanSessionSolveResult(undefined)
    setDismissedLimitFailureResult(undefined)

    try {
      const solvePromise = solveMutation.mutateAsync({
        notation,
        puzzleSlug,
        limits: {
          maxDepth,
          maxNodes,
          strategyId,
        },
      })
      void solvePromise.catch(() => undefined)
      await waitForPaint()
      await solvePromise
    } catch {
      // React Query owns the error state rendered by SolveResult.
    }
  }

  function resetSolveResult() {
    setActiveSolveSource('notation')
    solveMutation.reset()
    setScanSessionSolveResult(undefined)
    setDismissedLimitFailureResult(undefined)
  }

  function showScanSolveResult(solve: ApiSolveResult) {
    setActiveSolveSource('scan')
    solveMutation.reset()
    setDismissedLimitFailureResult(undefined)
    setScanSessionSolveResult(solve)
  }

  function setLimitFailureModalDismissed(dismissed: boolean) {
    setDismissedLimitFailureResult(dismissed ? activeSolveResult : undefined)
  }

  return {
    activeSolveError,
    activeSolveResult,
    activeSolveSource,
    limitFailureModalDismissed,
    notationLimitFailureResult,
    notationSolving: solveMutation.isPending,
    resetSolveResult,
    setLimitFailureModalDismissed,
    showScanSolveResult,
    submitNotationSolve,
    successResult,
  }
}
