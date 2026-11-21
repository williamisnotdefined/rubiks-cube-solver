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
    <div className='grid w-full gap-6 lg:grid-cols-12 lg:items-start'>
      <div className='order-1 grid gap-6 lg:col-span-5'>{children}</div>
      <div className='order-2 flex w-full justify-center lg:col-span-7 lg:justify-end'>
        <SolveVisualizationStage {...visualization} />
      </div>
      {successResult !== undefined && visualizationSupported ? (
        <div className='order-3 lg:col-span-12'>
          <SolutionPlayback
            moves={successResult.moves}
            step={playback.visibleSolutionStep}
            onStepChange={playback.onSolutionStepChange}
            onVisualizationRequest={visualization.onLoadRequest}
          />
        </div>
      ) : null}
    </div>
  )
}
