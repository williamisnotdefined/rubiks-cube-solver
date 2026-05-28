import type { SolveResult as ApiSolveResult } from '@api/solver/types'
import { formatNumber } from './format'
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
    <output className="result" aria-live="polite">
      {solving ? <span className="loader" aria-label="Loading" /> : null}
      {successResult !== undefined ? (
        <>
          <code>
            {successResult.moves.length === 0 ? 'Solved' : successResult.moves.join(' ')}
          </code>
          <span className="result-meta">
            {successResult.strategyLabel} - {successResult.length} moves -{' '}
            {formatNumber(successResult.exploredNodes)} nodes
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
            <span className="result-meta">{solveErrorDetail(failureResult)}</span>
          )}
        </>
      ) : null}
      {error !== null ? (
        <>
          <span>API solve request failed</span>
          {error.message.length === 0 ? null : (
            <span className="result-meta">{error.message}</span>
          )}
        </>
      ) : null}
    </output>
  )
}
