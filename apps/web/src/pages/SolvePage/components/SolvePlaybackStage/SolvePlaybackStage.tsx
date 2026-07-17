import type { ReactNode } from 'react'
import type { SolveSuccessResult } from '@api/solver/types'
import { SolveVisualizationStage } from '../SolveVisualizationStage'
import { useSolutionPlayback } from '../../hooks/useSolutionPlayback'
import { useSolveVisualizationController } from '../../hooks/useSolveVisualizationController'
import type { SolveSource } from '../../hooks/useSolveResultFlow/useSolveResultFlow'
import { SolutionPlayback } from '../../solve/SolutionPlayback'
import type { CubeStageCubeType } from '../../visualization/CubeStage'

type SolvePlaybackStageProps = {
  activeSolveSource: SolveSource
  children: ReactNode
  notation: string
  successResult?: SolveSuccessResult
  visualizationCubeType?: CubeStageCubeType
  visualizationSupported: boolean
}

export function SolvePlaybackStage({
  activeSolveSource,
  children,
  notation,
  successResult,
  visualizationCubeType,
  visualizationSupported,
}: SolvePlaybackStageProps) {
  const playback = useSolutionPlayback(successResult)
  const visualization = useSolveVisualizationController({
    activeSolveSource,
    notation,
    successResult,
    visibleSolutionMoves: playback.visibleSolutionMoves,
    visualizationCubeType,
    visualizationSupported,
  })

  return (
    <>
      <SolveVisualizationStage {...visualization} />
      {children}
      {successResult !== undefined && visualizationSupported ? (
        <SolutionPlayback
          moves={successResult.moves}
          step={playback.visibleSolutionStep}
          onStepChange={playback.onSolutionStepChange}
          onVisualizationRequest={visualization.onLoadRequest}
        />
      ) : null}
    </>
  )
}
