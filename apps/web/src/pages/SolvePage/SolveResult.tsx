import type { SolveResult as ApiSolveResult } from '@api/solver/types'
import { LoadingIndicator } from '@components/LoadingIndicator'
import { formatElapsedMs } from '@core/format/formatElapsedMs'
import { formatNumber } from '@core/format/formatNumber'
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
  const successResult = result?.status === 'success' ? result : undefined
  const failureResult = result !== undefined && !result.ok ? result : undefined

  return (
    <output
      className="result flex min-h-11 w-full flex-col items-center justify-center gap-2 text-center text-lg font-extrabold text-foreground sm:text-xl"
      aria-live="polite"
    >
      {solving ? <LoadingIndicator /> : null}
      {successResult !== undefined ? (
        <>
          <code className="max-w-full text-inherit [font:inherit] [overflow-wrap:anywhere]">
            {successResult.moves.length === 0 ? 'Solved' : successResult.moves.join(' ')}
          </code>
          <span className="result-meta text-sm font-semibold text-muted-foreground">
            {successResult.strategyLabel} - {successResult.length} moves -{' '}
            {formatNumber(successResult.exploredNodes)} nodes - found in{' '}
            {formatElapsedMs(successResult.elapsedMs)}
            {successResult.generatedTableStatus === 'not_required'
              ? ''
              : ` - tables ${successResult.generatedTableStatus}`}
            {successResult.replayVerified ? ' - replay verified' : ''}
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
            <span className="result-meta text-sm font-semibold text-muted-foreground">
              {solveErrorDetail(failureResult)}
            </span>
          )}
        </>
      ) : null}
      {error !== null ? (
        <>
          <span>API solve request failed</span>
          {error.message.length === 0 ? null : (
            <span className="result-meta text-sm font-semibold text-muted-foreground">
              {error.message}
            </span>
          )}
        </>
      ) : null}
    </output>
  )
}
