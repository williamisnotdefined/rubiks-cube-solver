import { lazy, Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SolveResult as ApiSolveResult } from '@api/solver/types'
import { Loader3x3 } from '@components/Loader3x3'
import { formatElapsedMs } from '@core/format/formatElapsedMs'
import { solveErrorDetail, solveErrorMessage } from '../solveMessages'

const SolveDetailsModal = lazy(() =>
  import('../SolveDetailsModal').then((module) => ({ default: module.SolveDetailsModal })),
)

type SolveResultProps = {
  result?: ApiSolveResult
  error: Error | null
  solving: boolean
  localValidationMessage?: string
}

export function SolveResult({ result, error, solving, localValidationMessage }: SolveResultProps) {
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
      <section className='w-full max-w-4xl px-6 py-6'>
        <output
          aria-label={t('solve.result.regionLabel')}
          aria-live='polite'
          className='result flex min-h-11 w-full flex-col items-center justify-center gap-2 text-center text-lg font-semibold text-foreground sm:text-xl'
        >
          {solving ? <Loader3x3 label={t('common.loading')} /> : null}
          {successResult !== undefined ? (
            <>
              <code
                aria-label={t('solve.result.movesLabel')}
                className='max-w-full text-inherit [font:inherit] [overflow-wrap:anywhere]'
              >
                {successResult.moves.length === 0
                  ? t('solve.result.solved')
                  : successResult.moves.join(' ')}
              </code>
              <span className='result-meta text-sm text-muted-foreground'>
                {t('solve.result.successMeta', {
                  count: successResult.length,
                  elapsed: t('solve.result.foundIn', {
                    elapsed: formatElapsedMs(successResult.requestElapsedMs),
                  }),
                })}{' '}
                <button
                  className='border-0 bg-transparent p-0 font-medium text-foreground underline underline-offset-4 outline-none transition-colors hover:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50'
                  type='button'
                  onClick={() => setDetailsOpen(true)}
                >
                  {t('solve.result.seeMore')}
                </button>
              </span>
            </>
          ) : null}
          {!solving &&
          result === undefined &&
          error === null &&
          localValidationMessage !== undefined ? (
            <span>{localValidationMessage}</span>
          ) : null}
          {failureResult !== undefined ? (
            <>
              <span>{solveErrorMessage(failureResult, t)}</span>
              {failureDetail === undefined ? null : (
                <span className='result-meta text-sm text-muted-foreground'>{failureDetail}</span>
              )}
            </>
          ) : null}
          {error !== null ? (
            <>
              <span>{t('solve.errors.status.api_error')}</span>
              {error.message.length === 0 ? null : (
                <span className='result-meta text-sm text-muted-foreground'>{error.message}</span>
              )}
            </>
          ) : null}
        </output>
      </section>
      {successResult !== undefined && detailsOpen ? (
        <Suspense fallback={null}>
          <SolveDetailsModal result={successResult} onClose={() => setDetailsOpen(false)} />
        </Suspense>
      ) : null}
    </>
  )
}
