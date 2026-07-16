import { useTranslation } from 'react-i18next'
import type { GeneratedTableStatus, SolveSuccessResult } from '@api/solver/types'
import { Button } from '@components/Button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@components/Dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@components/Table'
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
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <DialogContent
        className='left-1/2 top-1/2 max-h-[calc(100vh-3rem)] w-[calc(100vw-1.5rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-auto border bg-card p-4 text-left text-card-foreground shadow-lg sm:w-[calc(100vw-3rem)] sm:p-6'
        overlayClassName='backdrop-blur-sm'
        overlayLabel={t('solve.details.dismiss')}
      >
        <div className='flex items-start justify-between gap-4'>
          <div className='grid gap-1'>
            <DialogTitle asChild>
              <h2 className='text-lg font-semibold tracking-tight'>{t('solve.details.title')}</h2>
            </DialogTitle>
            <DialogDescription asChild>
              <p className='text-sm text-muted-foreground'>{t('solve.details.subtitle')}</p>
            </DialogDescription>
          </div>
          <Button size='sm' type='button' variant='secondary' onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>

        <dl className='mt-5 grid gap-2 text-sm sm:grid-cols-3'>
          <div className='rounded-lg border bg-muted/40 p-3'>
            <dt className='font-medium text-muted-foreground'>{t('solve.details.solution')}</dt>
            <dd className='mt-1 font-mono text-chart-2'>{movesLabel}</dd>
          </div>
          <div className='rounded-lg border bg-muted/40 p-3'>
            <dt className='font-medium text-muted-foreground'>{t('solve.details.search')}</dt>
            <dd className='mt-1 font-mono text-chart-2'>{nodesLabel}</dd>
          </div>
          <div className='rounded-lg border bg-muted/40 p-3'>
            <dt className='font-medium text-muted-foreground'>{t('solve.details.time')}</dt>
            <dd className='mt-1 font-mono text-chart-2'>{elapsedLabel}</dd>
          </div>
        </dl>

        <div className='mt-5 overflow-hidden rounded-lg border'>
          <Table className='min-w-[44rem]'>
            <TableHeader>
              <TableRow className='bg-muted/50'>
                <TableHead className='w-48'>{t('solve.details.columns.text')}</TableHead>
                <TableHead>{t('solve.details.columns.meaning')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detailRows.map((row) => (
                <TableRow key={row.text}>
                  <TableCell className='align-top font-mono text-chart-2'>{row.text}</TableCell>
                  <TableCell className='align-top leading-relaxed'>{row.meaning}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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

function tableStatusLabel(
  status: GeneratedTableStatus,
  t: ReturnType<typeof useTranslation>['t'],
): string {
  return t(`solve.details.tables.${status}.label`)
}

function tableStatusMeaning(
  status: GeneratedTableStatus,
  t: ReturnType<typeof useTranslation>['t'],
): string {
  return t(`solve.details.tables.${status}.meaning`)
}
