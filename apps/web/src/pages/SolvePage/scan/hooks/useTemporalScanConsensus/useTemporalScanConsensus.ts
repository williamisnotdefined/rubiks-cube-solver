import { useRef, useState } from 'react'
import type { AnalyzeScanFaceResponse } from '@api/scan'
import type { ScanFaceSymbol } from '@api/solver/types'
import {
  addTemporalScanFrame,
  buildTemporalFaceConsensus,
  defaultTemporalConsensusOptions,
  type TemporalConsensusOptions,
  type TemporalFaceConsensus,
  type TemporalScanFrame,
} from '../../scanTemporalConsensus'

type UseTemporalScanConsensusOptions = {
  enabled: boolean
  expectedCenter: ScanFaceSymbol
  options?: TemporalConsensusOptions
}

type UseTemporalScanConsensusResult = {
  recordAnalysis: (analysis: AnalyzeScanFaceResponse, capturedAt?: number) => TemporalFaceConsensus
  resetTemporalConsensus: () => void
  temporalConsensus: TemporalFaceConsensus
}

export function useTemporalScanConsensus({
  enabled,
  expectedCenter,
  options = defaultTemporalConsensusOptions,
}: UseTemporalScanConsensusOptions): UseTemporalScanConsensusResult {
  const optionsKey = temporalConsensusOptionsKey(options)
  const configurationKey = `${enabled}:${expectedCenter}:${optionsKey}`
  const emptyConsensus = buildTemporalFaceConsensus([], options)
  const bufferRef = useRef<{ configurationKey: string; frames: TemporalScanFrame[]; version: number }>({
    configurationKey,
    frames: [],
    version: 0,
  })
  const [consensusState, setConsensusState] = useState(() => ({
    configurationKey,
    consensus: emptyConsensus,
    version: 0,
  }))

  if (consensusState.configurationKey !== configurationKey) {
    setConsensusState({
      configurationKey,
      consensus: emptyConsensus,
      version: consensusState.version + 1,
    })
  }

  const temporalConsensus =
    consensusState.configurationKey === configurationKey ? consensusState.consensus : emptyConsensus

  function resetTemporalConsensus() {
    const version = consensusState.version + 1
    bufferRef.current = { configurationKey, frames: [], version }
    setConsensusState({ configurationKey, consensus: emptyConsensus, version })
  }

  function recordAnalysis(analysis: AnalyzeScanFaceResponse, capturedAt = Date.now()) {
    if (!enabled) {
      return temporalConsensus
    }

    const frames =
      bufferRef.current.configurationKey === configurationKey &&
      bufferRef.current.version === consensusState.version
        ? bufferRef.current.frames
        : []
    const nextFrames = addTemporalScanFrame(
      frames,
      {
        analysis,
        capturedAt,
        expectedCenter,
      },
      options,
    )
    const nextConsensus = buildTemporalFaceConsensus(nextFrames, options)
    bufferRef.current = { configurationKey, frames: nextFrames, version: consensusState.version }
    setConsensusState({
      configurationKey,
      consensus: nextConsensus,
      version: consensusState.version,
    })
    return nextConsensus
  }

  return {
    recordAnalysis,
    resetTemporalConsensus,
    temporalConsensus,
  }
}

function temporalConsensusOptionsKey(options: TemporalConsensusOptions): string {
  return [
    options.gridSize,
    options.maxFrameAgeMs,
    options.maxFrames,
    options.maxMeanBboxMovement,
    options.maxStickerBboxMovement,
    options.minBboxStability,
    options.minFaceAgreement,
    options.minFaceConfidence,
    options.minFrames,
    options.minStickerAgreement,
    options.minStickerConfidence,
    options.minStickerMargin,
    options.minTileConfidence,
    options.minTileDetections,
  ].join(':')
}
