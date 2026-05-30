import { useEffect, useState } from 'react'
import type { SolveResult as ApiSolveResult } from '@api/solver/types'
import { Loader3x3 } from '@components/Loader3x3'
import { formatElapsedMs } from '@core/format/formatElapsedMs'
import { SolveDetailsModal } from './SolveDetailsModal'
import { solveErrorDetail, solveErrorMessage } from './solveMessages'

type SolveResultProps = {
  result?: ApiSolveResult
  error: Error | null
  solving: boolean
  localValidationMessage?: string
}

export function SolveResult({
  result,
  error,
  solving,
  localValidationMessage,
}: SolveResultProps) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const successResult = result?.status === 'success' ? result : undefined
  const failureResult = result !== undefined && !result.ok ? result : undefined

  useEffect(() => {
    setDetailsOpen(false)
  }, [result])

  return (
    <>
      <output
        className="result flex min-h-11 w-full flex-col items-center justify-center gap-2 text-center text-lg font-extrabold text-[#f7f7f7] sm:text-xl"
        aria-live="polite"
      >
        {solving ? <Loader3x3 /> : null}
        {successResult !== undefined ? (
          <>
            <code className="max-w-full text-inherit [font:inherit] [overflow-wrap:anywhere]">
              {successResult.moves.length === 0 ? 'Solved' : successResult.moves.join(' ')}
            </code>
            <span className="result-meta text-sm font-semibold text-[#a8a8a8]">
              {successResult.length} moves - found in{' '}
              {formatElapsedMs(successResult.elapsedMs)} -{' '}
              <button
                className="border-0 bg-transparent p-0 font-semibold text-[#f7f7f7] underline underline-offset-4 outline-none transition-colors hover:text-[#a8a8a8] focus-visible:ring-2 focus-visible:ring-[#f7f7f7]/50"
                type="button"
                onClick={() => setDetailsOpen(true)}
              >
                see more
              </button>
            </span>
          </>
        ) : null}
        {!solving && result === undefined && error === null && localValidationMessage !== undefined ? (
          <span>{localValidationMessage}</span>
        ) : null}
        {failureResult !== undefined ? (
          <>
            <span>{solveErrorMessage(failureResult)}</span>
            {solveErrorDetail(failureResult) === undefined ? null : (
              <span className="result-meta text-sm font-semibold text-[#a8a8a8]">
                {solveErrorDetail(failureResult)}
              </span>
            )}
          </>
        ) : null}
        {error !== null ? (
          <>
            <span>API solve request failed</span>
            {error.message.length === 0 ? null : (
              <span className="result-meta text-sm font-semibold text-[#a8a8a8]">
                {error.message}
              </span>
            )}
          </>
        ) : null}
      </output>
      {successResult !== undefined && detailsOpen ? (
        <SolveDetailsModal result={successResult} onClose={() => setDetailsOpen(false)} />
      ) : null}
    </>
  )
}
