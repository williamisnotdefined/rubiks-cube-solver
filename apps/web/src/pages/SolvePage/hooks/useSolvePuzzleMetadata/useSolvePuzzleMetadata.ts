import { useGetHealth, useGetPuzzleStrategies, useGetPuzzles } from '@api/solver'
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
    enabled: selectedPuzzle !== undefined,
    puzzleSlug: selectedPuzzleSlug,
  })
  const strategyOptions = strategiesQuery.data ?? []
  const puzzleOptions = puzzlesQuery.data ?? []
  const strategyId = preferredStrategyId(strategyOptions, selectedPuzzle)
  const status = metadataStatus({
    healthQuery,
    puzzlesQuery,
    selectedPuzzle,
    strategiesQuery,
  })
  const apiReady = status === 'ready'
  const visualizationCubeType = cubeTypeForPuzzle(selectedPuzzle)

  function retry() {
    const requests: Promise<unknown>[] = [healthQuery.refetch(), puzzlesQuery.refetch()]

    if (selectedPuzzle !== undefined) {
      requests.push(strategiesQuery.refetch())
    }

    return Promise.all(requests)
  }

  return {
    apiReady,
    health: healthQuery.data,
    puzzleOptions,
    scanAvailable: selectedPuzzle?.scannerSupported === true,
    status,
    strategyId,
    strategyOptions,
    visualizationCubeType,
    visualizationSupported: visualizationCubeType !== undefined,
    retry,
  }
}

type MetadataQuery = {
  isError: boolean
  isPending: boolean
}

type MetadataStatusInput = {
  healthQuery: MetadataQuery & { data?: { ok: boolean } }
  puzzlesQuery: MetadataQuery
  selectedPuzzle: PuzzleDefinition | undefined
  strategiesQuery: MetadataQuery
}

function metadataStatus({
  healthQuery,
  puzzlesQuery,
  selectedPuzzle,
  strategiesQuery,
}: MetadataStatusInput): 'loading' | 'error' | 'unavailable' | 'ready' {
  if (healthQuery.isError || puzzlesQuery.isError || strategiesQuery.isError) {
    return 'error'
  }

  if (
    healthQuery.isPending ||
    puzzlesQuery.isPending ||
    (selectedPuzzle !== undefined && strategiesQuery.isPending)
  ) {
    return 'loading'
  }

  if (healthQuery.data?.ok !== true || selectedPuzzle === undefined) {
    return 'unavailable'
  }

  return 'ready'
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
