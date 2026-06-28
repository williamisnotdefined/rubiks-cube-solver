import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { RubiksCubeElement } from '@rubiks-cube-solver/rubiks-cube/view'
import {
  useGetHealth,
  useGetPuzzleStrategies,
  useGetPuzzles,
  useSolvePuzzleNotation,
} from '@api/solver'
import type { SolveResult as ApiSolveResult } from '@api/solver/types'
import { waitForPaint } from '@core/timing/waitForPaint'
import {
  defaultNotation,
  maxMovesLimitForPuzzle,
  nodesPerMillion,
  scramblePlaceholder,
} from '../../solve/constants'
import { isNoSolutionLimitFailure } from '../../solve/noSolutionLimits'
import type { NoSolutionRetryLimits } from '../../solve/NoSolutionLimitsModal'
import { useSolveSettingsStore } from '../../solve/solveSettingsStore'
import { preferredStrategyId } from '../../solve/strategy'
import {
  validateMaxNodesMillionOption,
  validateWholeNumberLimit,
  validationErrorMessage,
  type SolveFormSubmit,
} from '../../solve/validation'
import type { CubeStageCubeType } from '../../visualization/CubeStage'
import { useCubeVisualization } from '../../visualization/hooks/useCubeVisualization'
import { usePageActivity } from '../../visualization/hooks/usePageActivity'

const defaultPuzzleSlug = 'cube-3x3x3'
const cube3VisualizationKind = 'cube3-facelets-v1'
const cube2VisualizationKind = 'cube2-facelets-v1'

export type SolvePageController = ReturnType<typeof useSolvePageController>

export function useSolvePageController() {
  const { t } = useTranslation()
  const cubeRef = useRef<RubiksCubeElement | null>(null)
  const healthQuery = useGetHealth()
  const puzzlesQuery = useGetPuzzles({ enabled: healthQuery.data?.ok === true })
  const [selectedPuzzleSlug, setSelectedPuzzleSlug] = useState(defaultPuzzleSlug)
  const selectedPuzzle = puzzleBySlug(puzzlesQuery.data, selectedPuzzleSlug)
  const strategiesQuery = useGetPuzzleStrategies({
    enabled: healthQuery.data?.ok === true && selectedPuzzle !== undefined,
    puzzleSlug: selectedPuzzleSlug,
  })
  const solveMutation = useSolvePuzzleNotation()
  const cubeActive = usePageActivity()
  const [cubeReadyRevision, markCubeReady] = useReducer(
    (revision: number) => revision + 1,
    0,
  )
  const [notation, setNotation] = useState(defaultNotation)
  const maxMovesInput = useSolveSettingsStore((state) => state.maxMovesInput)
  const maxNodesMillionInput = useSolveSettingsStore((state) => state.maxNodesMillionInput)
  const setMaxMovesInput = useSolveSettingsStore((state) => state.setMaxMovesInput)
  const setMaxNodesMillionInput = useSolveSettingsStore(
    (state) => state.setMaxNodesMillionInput,
  )
  const [solutionStep, setSolutionStep] = useState(0)
  const [scanModalOpen, setScanModalOpen] = useState(false)
  const [scanSessionSolving, setScanSessionSolving] = useState(false)
  const [activeSolveSource, setActiveSolveSource] = useState<'notation' | 'scan'>('notation')
  const [scanSessionSolveResult, setScanSessionSolveResult] = useState<ApiSolveResult | undefined>()
  const [limitFailureModalDismissed, setLimitFailureModalDismissed] = useState(false)
  const activeSolveResult = activeSolveSource === 'scan' ? scanSessionSolveResult : solveMutation.data
  const activeSolveError = activeSolveSource === 'scan' ? null : solveMutation.error
  const successResult =
    activeSolveResult?.status === 'success' ? activeSolveResult : undefined
  const visibleSolutionStep = clampSolutionStep(
    solutionStep,
    successResult?.moves.length ?? 0,
  )
  const visibleSolutionMoves = successResult?.moves.slice(0, visibleSolutionStep) ?? []
  const limitFailureResult = activeSolveSource === 'notation' && isNoSolutionLimitFailure(activeSolveResult)
    ? activeSolveResult
    : undefined
  const visualizationState = successResult?.visualState
  const visualizationStateKind = successResult?.visualStateKind
  const visualizationCubeType: CubeStageCubeType | undefined =
    selectedPuzzle?.supportedVisualizations.includes(cube2VisualizationKind) === true
      ? 'Two'
      : selectedPuzzle?.supportedVisualizations.includes(cube3VisualizationKind) === true
        ? 'Three'
        : undefined
  const visualizationSupported = visualizationCubeType !== undefined
  const useInverseSolutionVisualization =
    activeSolveSource === 'scan' && visualizationCubeType === 'Two' && successResult !== undefined
  const visualizationNotation =
    useInverseSolutionVisualization
      ? notationWithSolutionPrefix(invertMoveSequence(successResult.moves).join(' '), visibleSolutionMoves)
      : visualizationState === undefined && visualizationSupported
        ? notationWithSolutionPrefix(
            notation,
            activeSolveSource === 'notation' ? visibleSolutionMoves : [],
          )
        : visualizationSupported
          ? visibleSolutionMoves.join(' ')
          : ''
  const visualizationStateForCube = useInverseSolutionVisualization ? undefined : visualizationState
  const visualizationStateKindForCube = useInverseSolutionVisualization ? undefined : visualizationStateKind

  useCubeVisualization(
    cubeRef,
    visualizationNotation,
    cubeReadyRevision,
    visualizationSupported ? visualizationStateForCube : undefined,
    visualizationSupported ? visualizationStateKindForCube : undefined,
    visualizationCubeType,
    cubeActive && visualizationSupported,
  )

  useEffect(() => {
    setLimitFailureModalDismissed(false)
  }, [activeSolveResult])

  const strategyOptions = strategiesQuery.data ?? []
  const puzzleOptions = puzzlesQuery.data ?? []
  const strategyId = preferredStrategyId(strategyOptions, selectedPuzzle)
  const scanAvailable = selectedPuzzle?.scannerSupported === true
  const activeScramblePlaceholder =
    selectedPuzzleSlug === 'cube-2x2x2' ? 'R U F' : scramblePlaceholder
  const apiReady =
    healthQuery.data?.ok === true &&
    puzzlesQuery.isSuccess &&
    strategiesQuery.isSuccess &&
    selectedPuzzle !== undefined
  const solving = solveMutation.isPending || scanSessionSolving
  const buttonLoading = !apiReady || solving
  const maxMoves = Number(maxMovesInput)
  const maxNodesMillion = Number(maxNodesMillionInput)
  const maxNodes = maxNodesMillion * nodesPerMillion
  const activeMaxMovesLimit = maxMovesLimitForPuzzle(selectedPuzzleSlug)
  const maxMovesValidation = validateWholeNumberLimit(
    maxMovesInput,
    t('solve.form.maxMoves'),
    activeMaxMovesLimit,
  )
  const maxNodesValidation = validateMaxNodesMillionOption(
    maxNodesMillionInput,
    t('solve.form.maxNodesMillion'),
  )
  const localValidationMessage = validationErrorMessage(
    t,
    maxMovesValidation ?? maxNodesValidation,
  )
  const disabled =
    !apiReady ||
    solving ||
    notation.trim().length === 0 ||
    strategyOptions.length === 0 ||
    strategyId.length === 0 ||
    localValidationMessage !== undefined

  async function handleSubmit(formValues: SolveFormSubmit) {
    if (!apiReady || localValidationMessage !== undefined) {
      return
    }

    await submitNotationSolve({
      maxDepth: formValues.maxMoves,
      maxNodes: formValues.maxNodesMillion * nodesPerMillion,
      notation: formValues.notation,
      puzzleSlug: formValues.puzzleSlug,
    })
  }

  async function handleNoSolutionRetry(limits: NoSolutionRetryLimits) {
    if (
      !apiReady ||
      localValidationMessage !== undefined ||
      notation.trim().length === 0 ||
      strategyId.length === 0
    ) {
      return
    }

    await submitNotationSolve({
      maxDepth: limits.maxDepth,
      maxNodes: limits.maxNodes,
      notation: notation.trim(),
      puzzleSlug: selectedPuzzleSlug,
    })
  }

  async function submitNotationSolve({
    maxDepth,
    maxNodes,
    notation,
    puzzleSlug,
  }: {
    maxDepth: number
    maxNodes: number
    notation: string
    puzzleSlug: string
  }) {
    setSolutionStep(0)
    setActiveSolveSource('notation')
    setScanSessionSolveResult(undefined)
    setLimitFailureModalDismissed(false)

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
      await waitForPaint()
      await solvePromise
    } catch {
      // React Query owns the error state rendered by SolveResult.
    }
  }

  function resetSolveResult() {
    setSolutionStep(0)
    setActiveSolveSource('notation')
    solveMutation.reset()
    setScanSessionSolveResult(undefined)
  }

  function handleSolutionStepChange(nextStep: number) {
    setSolutionStep(clampSolutionStep(nextStep, successResult!.moves.length))
  }

  function handleNotationChange(nextNotation: string) {
    setNotation(nextNotation)
    resetSolveResult()
  }

  function handlePuzzleChange(nextPuzzleSlug: string) {
    setSelectedPuzzleSlug(nextPuzzleSlug)
    const nextMaxMovesLimit = maxMovesLimitForPuzzle(nextPuzzleSlug)
    if (Number(maxMovesInput) > nextMaxMovesLimit) {
      setMaxMovesInput(String(nextMaxMovesLimit))
    }
    resetSolveResult()
  }

  function handleMaxMovesChange(nextMaxMoves: string) {
    setMaxMovesInput(nextMaxMoves)
    resetSolveResult()
  }

  function handleMaxNodesMillionChange(nextMaxNodesMillion: string) {
    setMaxNodesMillionInput(nextMaxNodesMillion)
    resetSolveResult()
  }

  function handleScanSessionSolveResult(solve: ApiSolveResult) {
    setSolutionStep(0)
    setActiveSolveSource('scan')
    solveMutation.reset()
    setScanSessionSolveResult(solve)
  }

  const handleScanSessionSolvingChange = useCallback((nextSolving: boolean) => {
    setScanSessionSolving(nextSolving)
  }, [])

  function handleScanClick() {
    if (scanAvailable) {
      setScanModalOpen(true)
    }
  }

  return {
    form: {
      notation,
      puzzleOptions,
      selectedPuzzleSlug,
      maxMovesInput,
      maxMovesLimit: activeMaxMovesLimit,
      maxNodesMillionInput,
      buttonLoading,
      disabled,
      scanAvailable,
      scramblePlaceholder: activeScramblePlaceholder,
      onScanClick: handleScanClick,
      onNotationChange: handleNotationChange,
      onPuzzleChange: handlePuzzleChange,
      onMaxMovesChange: handleMaxMovesChange,
      onMaxNodesMillionChange: handleMaxNodesMillionChange,
      onSubmit: handleSubmit,
    },
    limitFailureModal: limitFailureResult !== undefined && !limitFailureModalDismissed
      ? {
          puzzleSlug: selectedPuzzleSlug,
          result: limitFailureResult,
          solving,
          onClose: () => setLimitFailureModalDismissed(true),
          onRetry: handleNoSolutionRetry,
        }
      : undefined,
    playback: successResult !== undefined && visualizationSupported
      ? {
          moves: successResult.moves,
          step: visibleSolutionStep,
          onStepChange: handleSolutionStepChange,
        }
      : undefined,
    result: {
      result: activeSolveResult,
      error: activeSolveError,
      solving,
      localValidationMessage,
    },
    scanModal: scanModalOpen && scanAvailable
      ? {
          apiReady,
          maxDepth: maxMoves,
          maxNodes,
          solveDisabledReason: localValidationMessage,
          solving,
          puzzleSlug: selectedPuzzleSlug,
          strategyId,
          visionTileDetectorAvailable: healthQuery.data?.visionTileDetectorAvailable,
          visionTileDetectorReason: healthQuery.data?.visionTileDetectorReason,
          visionOk: healthQuery.data?.visionOk,
          onClose: () => setScanModalOpen(false),
          onSessionSolvingChange: handleScanSessionSolvingChange,
          onSessionSolveResult: handleScanSessionSolveResult,
        }
      : undefined,
    visualization: {
      active: cubeActive,
      cubeRef,
      cubeType: visualizationCubeType,
      onReady: markCubeReady,
    },
  }
}

function puzzleBySlug<TPuzzle extends { slug: string }>(
  puzzles: readonly TPuzzle[] | undefined,
  slug: string,
): TPuzzle | undefined {
  return puzzles?.find((puzzle) => puzzle.slug === slug)
}

function notationWithSolutionPrefix(
  notation: string,
  solutionMoves: readonly string[],
): string {
  return [notation.trim(), ...solutionMoves].filter(Boolean).join(' ')
}

function invertMoveSequence(moves: readonly string[]): string[] {
  return moves.slice().reverse().map(invertMoveToken)
}

function invertMoveToken(move: string): string {
  if (move.endsWith('2')) {
    return move
  }

  return move.endsWith("'") ? move.slice(0, -1) : `${move}'`
}

function clampSolutionStep(step: number, maxStep: number): number {
  return Math.min(Math.max(step, 0), maxStep)
}
