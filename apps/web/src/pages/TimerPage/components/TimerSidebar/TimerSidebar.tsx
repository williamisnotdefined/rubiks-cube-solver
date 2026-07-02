import { useMemo } from 'react'
import { AverageCards } from '@components/timer/AverageCards'
import { SolveTable } from '@components/timer/SolveTable'
import { timerStats } from '@core/timer/statistics'
import { useActiveTimerSession } from '../../hooks/useActiveTimerSession'
import { useTimerSettingsStore } from '../../timerSettingsStore'
import { useTimerStore } from '../../timerStore'

export function TimerSidebar() {
  const activeSession = useActiveTimerSession()
  const deleteSolve = useTimerStore((state) => state.deleteSolve)
  const showMilliseconds = useTimerSettingsStore((state) => state.showMilliseconds)
  const solves = activeSession.solves
  const solveRows = useMemo(
    () => solves.slice().reverse().map((solve, index) => ({
      ...solve,
      index: solves.length - index,
    })),
    [solves],
  )
  const stats = timerStats(solves)

  return (
    <aside className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2 overflow-hidden">
      <AverageCards
        cards={[
          { label: 'best', timeMs: stats.bestMs },
          { label: 'mean', timeMs: stats.meanMs },
          { label: 'ao5', timeMs: stats.ao5.timeMs },
          { label: 'ao12', timeMs: stats.ao12.timeMs },
        ]}
        className="lg:max-h-40"
        showMilliseconds={showMilliseconds}
      />
      <SolveTable
        className="h-full min-h-0"
        rows={solveRows}
        showMilliseconds={showMilliseconds}
        onDeleteSolve={deleteSolve}
      />
    </aside>
  )
}
