import { useEffect, useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { GeneratedTableStatus, SolveSuccessResult } from '@api/solver/types'
import { Button } from '@components/Button'
import { formatElapsedMs } from '@core/format/formatElapsedMs'
import { formatNumber } from '@core/format/formatNumber'
import { solveStrategyLabel } from './solveMessages'

type SolveDetailsModalProps = {
  result: SolveSuccessResult
  onClose: () => void
}

type DetailRow = {
  text: string
  meaning: string
}

export function SolveDetailsModal({ result, onClose }: SolveDetailsModalProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const movesLabel = t('solve.details.movesLabel', { count: result.length })
  const elapsedLabel = t('solve.details.elapsedLabel', {
    elapsed: formatElapsedMs(result.elapsedMs),
  })
  const nodesLabel = t('solve.details.nodesLabel', { nodes: formatNumber(result.exploredNodes) })
  const tablesLabel = tableStatusLabel(result.generatedTableStatus, t)
  const replayLabel = result.replayVerified
    ? t('solve.details.replayVerified')
    : t('solve.details.replayNotVerified')
  const maxNodesLabel =
    result.maxNodes === undefined
      ? t('solve.details.maxNodesUnlimited')
      : t('solve.details.maxNodesConfigured', { nodes: formatNumber(result.maxNodes) })
  const detailRows = explainRows(result, {
    elapsedLabel,
    maxNodesLabel,
    movesLabel,
    nodesLabel,
    replayLabel,
    tablesLabel,
    t,
  })

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-3 py-6 sm:px-6">
      <button
        aria-label={t('solve.details.dismiss')}
        className="absolute inset-0 bg-[#070707]/85 backdrop-blur-sm"
        type="button"
        onClick={onClose}
      />
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="relative max-h-[calc(100vh-3rem)] w-full max-w-3xl overflow-auto border border-[#2b2b2b] bg-[#101010] p-4 text-left text-[#f7f7f7] shadow-2xl sm:p-6"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-1">
            <h2 className="text-lg font-extrabold uppercase tracking-[0.16em]" id={titleId}>
              {t('solve.details.title')}
            </h2>
            <p className="text-sm font-semibold text-[#a8a8a8]">
              {t('solve.details.subtitle')}
            </p>
          </div>
          <Button className="min-h-10 px-4 py-2" type="button" variant="secondary" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>

        <dl className="mt-5 grid gap-2 text-sm sm:grid-cols-3">
          <div className="border border-[#2b2b2b] bg-[#171717] p-3">
            <dt className="font-extrabold uppercase tracking-[0.16em] text-[#a8a8a8]">{t('solve.details.solution')}</dt>
            <dd className="mt-1 font-mono text-emerald-300">{movesLabel}</dd>
          </div>
          <div className="border border-[#2b2b2b] bg-[#171717] p-3">
            <dt className="font-extrabold uppercase tracking-[0.16em] text-[#a8a8a8]">{t('solve.details.search')}</dt>
            <dd className="mt-1 font-mono text-emerald-300">{nodesLabel}</dd>
          </div>
          <div className="border border-[#2b2b2b] bg-[#171717] p-3">
            <dt className="font-extrabold uppercase tracking-[0.16em] text-[#a8a8a8]">{t('solve.details.time')}</dt>
            <dd className="mt-1 font-mono text-emerald-300">{elapsedLabel}</dd>
          </div>
        </dl>

        <div className="mt-5 overflow-x-auto border border-[#2b2b2b]">
          <table className="min-w-[44rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#2b2b2b] bg-[#070707]">
                <th className="w-48 px-3 py-3 text-left font-extrabold uppercase tracking-[0.16em] text-[#a8a8a8]">
                  {t('solve.details.columns.text')}
                </th>
                <th className="px-3 py-3 text-left font-extrabold uppercase tracking-[0.16em] text-[#a8a8a8]">
                  {t('solve.details.columns.meaning')}
                </th>
              </tr>
            </thead>
            <tbody>
              {detailRows.map((row) => (
                <tr className="border-b border-[#2b2b2b] last:border-b-0" key={row.text}>
                  <td className="border-r border-[#2b2b2b] px-3 py-3 align-top font-mono text-emerald-300">
                    {row.text}
                  </td>
                  <td className="px-3 py-3 align-top leading-relaxed text-[#f7f7f7]">{row.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function explainRows(
  result: SolveSuccessResult,
  labels: {
    elapsedLabel: string
    maxNodesLabel: string
    movesLabel: string
    nodesLabel: string
    replayLabel: string
    tablesLabel: string
    t: ReturnType<typeof useTranslation>['t']
  },
): DetailRow[] {
  return [
    {
      text: solveStrategyLabel(result.strategyId, result.strategyLabel, labels.t),
      meaning: strategyMeaning(result.strategyId, labels.t),
    },
    {
      text: labels.movesLabel,
      meaning: labels.t('solve.details.solutionLengthMeaning'),
    },
    {
      text: labels.nodesLabel,
      meaning: labels.t('solve.details.nodesMeaning', { maxNodesLabel: labels.maxNodesLabel }),
    },
    {
      text: labels.elapsedLabel,
      meaning: labels.t('solve.details.elapsedMeaning'),
    },
    {
      text: labels.tablesLabel,
      meaning: tableStatusMeaning(result.generatedTableStatus, labels.t),
    },
    {
      text: labels.replayLabel,
      meaning: labels.t('solve.details.replayVerifiedMeaning'),
    },
  ]
}

function strategyMeaning(strategyId: string, t: ReturnType<typeof useTranslation>['t']): string {
  if (strategyId.includes('generated-two-phase')) {
    return t('solve.strategies.meaningGeneratedTwoPhase')
  }

  return t('solve.strategies.meaningDefault')
}

function tableStatusLabel(status: GeneratedTableStatus, t: ReturnType<typeof useTranslation>['t']): string {
  return t(`solve.details.tables.${status}.label`)
}

function tableStatusMeaning(status: GeneratedTableStatus, t: ReturnType<typeof useTranslation>['t']): string {
  return t(`solve.details.tables.${status}.meaning`)
}
