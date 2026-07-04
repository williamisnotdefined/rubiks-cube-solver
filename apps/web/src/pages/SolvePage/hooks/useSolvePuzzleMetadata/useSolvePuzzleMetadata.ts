import {
  useGetHealth,
  useGetPuzzleStrategies,
  useGetPuzzles,
} from '@api/solver'
import type { PuzzleDefinition } from '@api/solver/types'
import type { CubeStageCubeType } from '../../visualization/CubeStage'
import { preferredStrategyId } from '../../solve/strategy'

export const defaultPuzzleSlug = 'cube-3x3x3'

const cube3VisualizationKind = 'cube3-facelets-v1'
const cube2VisualizationKind = 'cube2-facelets-v1'

export function useSolvePuzzleMetadata(selectedPuzzleSlug: string) {
  const healthQuery = useGetHealth()
  const puzzlesQuery = useGetPuzzles()
  const selectedPuzzle = puzzleBySlug(puzzlesQuery.data, selectedPuzzleSlug)
  const strategiesQuery = useGetPuzzleStrategies({
    enabled: selectedPuzzleSlug.length > 0,
    puzzleSlug: selectedPuzzleSlug,
  })
  const strategyOptions = strategiesQuery.data ?? []
  const puzzleOptions = puzzlesQuery.data ?? []
  const strategyId = preferredStrategyId(strategyOptions, selectedPuzzle)
  const apiReady =
    healthQuery.data?.ok === true &&
    puzzlesQuery.isSuccess &&
    strategiesQuery.isSuccess &&
    selectedPuzzle !== undefined
  const visualizationCubeType = cubeTypeForPuzzle(selectedPuzzle)

  return {
    apiReady,
    health: healthQuery.data,
    puzzleOptions,
    scanAvailable: selectedPuzzle?.scannerSupported === true,
    strategyId,
    strategyOptions,
    visualizationCubeType,
    visualizationSupported: visualizationCubeType !== undefined,
  }
}

function puzzleBySlug<TPuzzle extends { slug: string }>(
  puzzles: readonly TPuzzle[] | undefined,
  slug: string,
): TPuzzle | undefined {
  return puzzles?.find((puzzle) => puzzle.slug === slug)
}

function cubeTypeForPuzzle(puzzle?: PuzzleDefinition): CubeStageCubeType | undefined {
  if (puzzle?.supportedVisualizations.includes(cube2VisualizationKind) === true) {
    return 'Two'
  }

  if (puzzle?.supportedVisualizations.includes(cube3VisualizationKind) === true) {
    return 'Three'
  }

  return undefined
}
