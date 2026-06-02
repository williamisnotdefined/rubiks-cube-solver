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
      <section className="border border-[#2b2b2b] bg-[#101010] p-4 text-center">
        <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-[#a8a8a8]">
          {t('timer.solves.empty')}
        </p>
      </section>
    )
  }

  return (
    <section className="w-full overflow-x-auto border border-[#2b2b2b] bg-[#101010]" aria-label={t('timer.solves.label')}>
      <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
        <thead className="border-b border-[#2b2b2b] text-xs font-extrabold uppercase tracking-[0.16em] text-[#a8a8a8]">
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
            <tr key={row.id} className="border-b border-[#2b2b2b] last:border-b-0">
              <td className="px-4 py-3 font-mono text-[#a8a8a8]">{row.index}</td>
              <td className="px-4 py-3 font-mono text-lg font-black text-[#f7f7f7]">
                {formatTimerTime(row.finalTimeMs, { showMilliseconds })}
              </td>
              <td className="px-4 py-3 text-xs font-extrabold uppercase tracking-[0.16em] text-[#a8a8a8]">
                {t(`timer.penalty.${row.penalty}`)}
              </td>
              <td className="max-w-md truncate px-4 py-3 font-mono text-xs text-[#a8a8a8]">
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
