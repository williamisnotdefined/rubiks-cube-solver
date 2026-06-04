import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const [detailsOpen, setDetailsOpen] = useState(false)
  const successResult = result?.status === 'success' ? result : undefined
  const failureResult = result !== undefined && !result.ok ? result : undefined
  const failureDetail = failureResult === undefined ? undefined : solveErrorDetail(failureResult, t)

  useEffect(() => {
    setDetailsOpen(false)
  }, [result])

  return (
    <>
      <output
        className="result flex min-h-11 w-full flex-col items-center justify-center gap-2 text-center text-lg font-extrabold text-app-text sm:text-xl"
        aria-live="polite"
      >
        {solving ? <Loader3x3 label={t('common.loading')} /> : null}
        {successResult !== undefined ? (
          <>
            <code className="max-w-full text-inherit [font:inherit] [overflow-wrap:anywhere]">
              {successResult.moves.length === 0 ? t('solve.result.solved') : successResult.moves.join(' ')}
            </code>
            <span className="result-meta text-sm font-semibold text-app-muted">
              {t('solve.result.successMeta', {
                count: successResult.length,
                elapsed: t('solve.result.foundIn', {
                  elapsed: formatElapsedMs(successResult.elapsedMs),
                }),
              })}{' '}
              <button
                className="border-0 bg-transparent p-0 font-semibold text-app-text underline underline-offset-4 outline-none transition-colors hover:text-app-muted focus-visible:ring-2 focus-visible:ring-app-focus/50"
                type="button"
                onClick={() => setDetailsOpen(true)}
              >
                {t('solve.result.seeMore')}
              </button>
            </span>
          </>
        ) : null}
        {!solving && result === undefined && error === null && localValidationMessage !== undefined ? (
          <span>{localValidationMessage}</span>
        ) : null}
        {failureResult !== undefined ? (
          <>
            <span>{solveErrorMessage(failureResult, t)}</span>
            {failureDetail === undefined ? null : (
              <span className="result-meta text-sm font-semibold text-app-muted">
                {failureDetail}
              </span>
            )}
          </>
        ) : null}
        {error !== null ? (
          <>
            <span>{t('solve.errors.status.api_error')}</span>
            {error.message.length === 0 ? null : (
              <span className="result-meta text-sm font-semibold text-app-muted">
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
