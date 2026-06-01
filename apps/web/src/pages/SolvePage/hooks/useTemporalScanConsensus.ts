import { useCallback, useEffect, useRef, useState } from 'react'
import type { AnalyzeScanFaceResponse } from '@api/scan'
import type { ScanFaceSymbol } from '@api/solver/types'
import {
  addTemporalScanFrame,
  buildTemporalFaceConsensus,
  defaultTemporalConsensusOptions,
  type TemporalConsensusOptions,
  type TemporalFaceConsensus,
  type TemporalScanFrame,
} from '../scanTemporalConsensus'

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
  const bufferRef = useRef<TemporalScanFrame[]>([])
  const initialConsensus = buildTemporalFaceConsensus([], options)
  const consensusRef = useRef<TemporalFaceConsensus>(initialConsensus)
  const [temporalConsensus, setTemporalConsensus] = useState(initialConsensus)

  const resetTemporalConsensus = useCallback(() => {
    bufferRef.current = []
    const nextConsensus = buildTemporalFaceConsensus([], options)
    consensusRef.current = nextConsensus
    setTemporalConsensus(nextConsensus)
  }, [options])

  useEffect(() => {
    resetTemporalConsensus()
  }, [enabled, expectedCenter, resetTemporalConsensus])

  const recordAnalysis = useCallback(
    (analysis: AnalyzeScanFaceResponse, capturedAt = Date.now()) => {
      if (!enabled) {
        return consensusRef.current
      }

      bufferRef.current = addTemporalScanFrame(
        bufferRef.current,
        {
          analysis,
          capturedAt,
          expectedCenter,
        },
        options,
      )
      const nextConsensus = buildTemporalFaceConsensus(bufferRef.current, options)
      consensusRef.current = nextConsensus
      setTemporalConsensus(nextConsensus)
      return nextConsensus
    },
    [enabled, expectedCenter, options],
  )

  return {
    recordAnalysis,
    resetTemporalConsensus,
    temporalConsensus,
  }
}
