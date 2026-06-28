import { useTranslation } from 'react-i18next'
import type { GeneratedTableStatus, SolveSuccessResult } from '@api/solver/types'
import { Button } from '@components/Button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@components/Dialog'
import { formatElapsedMs } from '@core/format/formatElapsedMs'
import { formatNumber } from '@core/format/formatNumber'
import { solveStrategyLabel } from '../solveMessages'

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
  const movesLabel = t('solve.details.movesLabel', { count: result.length })
  const elapsedLabel = t('solve.details.elapsedLabel', {
    elapsed: formatElapsedMs(result.requestElapsedMs),
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

  return (
    <Dialog open onOpenChange={(open) => {
      if (!open) {
        onClose()
      }
    }}>
      <DialogContent
        className="left-1/2 top-1/2 max-h-[calc(100vh-3rem)] w-[calc(100vw-1.5rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-auto border border-app-border bg-app-surface p-4 text-left text-app-text shadow-2xl sm:w-[calc(100vw-3rem)] sm:p-6"
        overlayClassName="bg-app-bg/85 backdrop-blur-sm"
        overlayLabel={t('solve.details.dismiss')}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-1">
            <DialogTitle asChild>
              <h2 className="text-lg font-extrabold uppercase tracking-[0.16em]">
                {t('solve.details.title')}
              </h2>
            </DialogTitle>
            <DialogDescription asChild>
              <p className="text-sm font-semibold text-app-muted">
                {t('solve.details.subtitle')}
              </p>
            </DialogDescription>
          </div>
          <Button size="sm" type="button" variant="secondary" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>

        <dl className="mt-5 grid gap-2 text-sm sm:grid-cols-3">
          <div className="border border-app-border bg-app-surface-raised p-3">
            <dt className="font-extrabold uppercase tracking-[0.16em] text-app-muted">{t('solve.details.solution')}</dt>
            <dd className="mt-1 font-mono text-app-success">{movesLabel}</dd>
          </div>
          <div className="border border-app-border bg-app-surface-raised p-3">
            <dt className="font-extrabold uppercase tracking-[0.16em] text-app-muted">{t('solve.details.search')}</dt>
            <dd className="mt-1 font-mono text-app-success">{nodesLabel}</dd>
          </div>
          <div className="border border-app-border bg-app-surface-raised p-3">
            <dt className="font-extrabold uppercase tracking-[0.16em] text-app-muted">{t('solve.details.time')}</dt>
            <dd className="mt-1 font-mono text-app-success">{elapsedLabel}</dd>
          </div>
        </dl>

        <div className="mt-5 overflow-x-auto border border-app-border">
          <table className="min-w-[44rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-app-border bg-app-bg">
                <th className="w-48 px-3 py-3 text-left font-extrabold uppercase tracking-[0.16em] text-app-muted">
                  {t('solve.details.columns.text')}
                </th>
                <th className="px-3 py-3 text-left font-extrabold uppercase tracking-[0.16em] text-app-muted">
                  {t('solve.details.columns.meaning')}
                </th>
              </tr>
            </thead>
            <tbody>
              {detailRows.map((row) => (
                <tr className="border-b border-app-border last:border-b-0" key={row.text}>
                  <td className="border-r border-app-border px-3 py-3 align-top font-mono text-app-success">
                    {row.text}
                  </td>
                  <td className="px-3 py-3 align-top leading-relaxed text-app-text">{row.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
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
