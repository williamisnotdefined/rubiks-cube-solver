import { useTranslation } from 'react-i18next'
import { Button } from '@components/Button'
import { formatTimerTime } from '@core/timer/formatTimerTime'
import type { TimerPenalty } from '@core/timer/penalties'

export type SolveTableRow = {
  finalTimeMs: number | null
  id: string
  index: number
  penalty: TimerPenalty
  rawTimeMs: number
  scramble: string
}

type SolveTableProps = {
  rows: readonly SolveTableRow[]
  showMilliseconds?: boolean
  onDeleteSolve?: (solveId: string) => void
}

export function SolveTable({ rows, showMilliseconds = false, onDeleteSolve }: SolveTableProps) {
  const { t } = useTranslation()

  if (rows.length === 0) {
    return (
      <section className="border border-app-border bg-app-surface p-4 text-center">
        <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-app-muted">
          {t('timer.solves.empty')}
        </p>
      </section>
    )
  }

  return (
    <section className="w-full overflow-x-auto border border-app-border bg-app-surface" aria-label={t('timer.solves.label')}>
      <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
        <thead className="border-b border-app-border text-xs font-extrabold uppercase tracking-[0.16em] text-app-muted">
          <tr>
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">{t('timer.solves.time')}</th>
            <th className="px-4 py-3">{t('timer.solves.penalty')}</th>
            <th className="px-4 py-3">{t('timer.solves.scramble')}</th>
            <th className="px-4 py-3">{t('timer.solves.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-app-border last:border-b-0">
              <td className="px-4 py-3 font-mono text-app-muted">{row.index}</td>
              <td className="px-4 py-3 font-mono text-lg font-black text-app-text">
                {formatTimerTime(row.finalTimeMs, { showMilliseconds })}
              </td>
              <td className="px-4 py-3 text-xs font-extrabold uppercase tracking-[0.16em] text-app-muted">
                {t(`timer.penalty.${row.penalty}`)}
              </td>
              <td className="max-w-md truncate px-4 py-3 font-mono text-xs text-app-muted">
                {row.scramble}
              </td>
              <td className="px-4 py-3">
                <Button
                  disabled={onDeleteSolve === undefined}
                  type="button"
                  variant="ghost"
                  onClick={() => onDeleteSolve?.(row.id)}
                >
                  {t('timer.solves.delete')}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
