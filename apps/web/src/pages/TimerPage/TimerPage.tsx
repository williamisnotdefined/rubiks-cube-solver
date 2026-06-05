import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AverageCards } from '@components/timer/AverageCards'
import { InspectionBar } from '@components/timer/InspectionBar'
import { PenaltyControls } from '@components/timer/PenaltyControls'
import { SolveTable } from '@components/timer/SolveTable'
import { TimerDisplay } from '@components/timer/TimerDisplay'
import { TimerStatusBar } from '@components/timer/TimerStatusBar'
import { Panel } from '@components/layout/Panel'
import { ScrambleViewer } from '@components/scramble/ScrambleViewer'
import {
  generateScrambleForEvent,
  scrambleEvents,
} from '@core/scramble/catalog'
import { finalTimeMs } from '@core/timer/penalties'
import { timerStats } from '@core/timer/statistics'
import type { GeneratedScramble, ScrambleEvent } from '@core/scramble/types'
import type { TimerPenalty } from '@core/timer/penalties'
import { useKeyboardTimer } from './hooks/useKeyboardTimer'
import { useTimerMachine } from './hooks/useTimerMachine'
import { useTouchTimer } from './hooks/useTouchTimer'
import { useTimerSettingsStore } from './timerSettingsStore'
import { useTimerStore } from './timerStore'
import type { TimerSolve } from './types'

export function TimerPage() {
  const { t } = useTranslation()
  const [scrambleHistory, setScrambleHistory] = useState<ScrambleHistory>(() => {
    const initialScramble = generateScrambleForEvent(
      useTimerSettingsStore.getState().selectedEventId,
    )

    return { index: 0, items: [initialScramble] }
  })
  const [copied, setCopied] = useState(false)
  const sessions = useTimerStore((state) => state.sessions)
  const activeSessionId = useTimerStore((state) => state.activeSessionId)
  const addSolve = useTimerStore((state) => state.addSolve)
  const deleteSolve = useTimerStore((state) => state.deleteSolve)
  const setActiveSessionEvent = useTimerStore((state) => state.setActiveSessionEvent)
  const updateSolvePenalty = useTimerStore((state) => state.updateSolvePenalty)
  const holdToStartMs = useTimerSettingsStore((state) => state.holdToStartMs)
  const inspectionEnabled = useTimerSettingsStore((state) => state.inspectionEnabled)
  const selectedEventId = useTimerSettingsStore((state) => state.selectedEventId)
  const setInspectionEnabled = useTimerSettingsStore((state) => state.setInspectionEnabled)
  const setSelectedEventId = useTimerSettingsStore((state) => state.setSelectedEventId)
  const setShowMilliseconds = useTimerSettingsStore((state) => state.setShowMilliseconds)
  const showMilliseconds = useTimerSettingsStore((state) => state.showMilliseconds)
  const activeSession = sessions.find((session) => session.id === activeSessionId) ?? sessions[0]!
  const solves = activeSession.solves
  const lastSolve = solves.at(-1)
  const generatedScramble = scrambleHistory.items[scrambleHistory.index]!
  const stats = timerStats(solves)
  const timer = useTimerMachine({
    holdToStartMs,
    inspectionEnabled,
    onSolveComplete: handleSolveComplete,
  })
  const touchHandlers = useTouchTimer(timer)

  useKeyboardTimer(timer)

  useEffect(() => {
    setActiveSessionEvent(selectedEventId)
    setScrambleHistory({ index: 0, items: [generateScrambleForEvent(selectedEventId)] })
    setCopied(false)
  }, [selectedEventId, setActiveSessionEvent])

  function handleSolveComplete(rawTimeMs: number, penalty: TimerPenalty) {
    const endedAt = Date.now()
    const solve: TimerSolve = {
      comment: '',
      endedAt,
      eventId: selectedEventId,
      finalTimeMs: finalTimeMs(rawTimeMs, penalty),
      id: `solve-${endedAt}-${Math.random().toString(36).slice(2)}`,
      penalty,
      rawTimeMs,
      scramble: generatedScramble.scramble,
      startedAt: endedAt - rawTimeMs,
    }

    addSolve(solve)
    setScrambleHistory((history) => {
      const retainedHistory = history.items.slice(0, history.index + 1)

      return {
        index: retainedHistory.length,
        items: [...retainedHistory, generateScrambleForEvent(selectedEventId)],
      }
    })
    setCopied(false)
  }

  function handleNextScramble() {
    setScrambleHistory((history) => {
      if (history.index < history.items.length - 1) {
        return { ...history, index: history.index + 1 }
      }

      return {
        index: history.items.length,
        items: [...history.items, generateScrambleForEvent(selectedEventId)],
      }
    })
    setCopied(false)
    timer.resetStopped()
  }

  function handlePreviousScramble() {
    setScrambleHistory((history) => ({
      ...history,
      index: Math.max(0, history.index - 1),
    }))
    setCopied(false)
    timer.resetStopped()
  }

  async function handleCopyScramble() {
    try {
      await navigator.clipboard?.writeText(generatedScramble.scramble)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  function handlePenaltyChange(penalty: TimerPenalty) {
    if (lastSolve === undefined) {
      return
    }

    updateSolvePenalty(lastSolve.id, penalty)
  }

  return (
    <main className="flex h-full min-h-0 flex-1 overflow-hidden px-3 py-2 sm:px-5 sm:py-3">
      <section className="mx-auto grid h-full min-h-0 w-full max-w-7xl grid-rows-[auto_minmax(0,1fr)] gap-2">
        <div className="grid min-h-0 shrink-0 gap-2">
          <ScrambleViewer
            className="min-h-0"
            canGoPrevious={scrambleHistory.index > 0}
            copied={copied}
            eventControl={(
              <CompactScrambleEventSelect
                events={scrambleEvents}
                selectedEventId={selectedEventId}
                onEventChange={setSelectedEventId}
              />
            )}
            eventLabel={generatedScramble.event.label}
            scramble={generatedScramble.scramble}
            onCopy={handleCopyScramble}
            onNext={handleNextScramble}
            onPrevious={handlePreviousScramble}
          />
          <Panel className="grid min-h-0 grid-cols-2 gap-2 p-2 sm:grid-cols-[auto_auto_minmax(14rem,1fr)] sm:items-center" aria-label={t('timer.settings.label')}>
            <label className="flex min-h-9 items-center gap-2 border border-app-border bg-app-control px-3 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-app-text">
              <input
                checked={inspectionEnabled}
                className="size-3 accent-app-text"
                type="checkbox"
                onChange={(event) => setInspectionEnabled(event.target.checked)}
              />
              {t('timer.settings.inspection')}
            </label>
            <label className="flex min-h-9 items-center gap-2 border border-app-border bg-app-control px-3 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-app-text">
              <input
                checked={showMilliseconds}
                className="size-3 accent-app-text"
                type="checkbox"
                onChange={(event) => setShowMilliseconds(event.target.checked)}
              />
              {t('timer.settings.milliseconds')}
            </label>
            <div className="col-span-2 grid gap-1 sm:col-span-1 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center" aria-label={t('timer.penalty.label')}>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-app-muted sm:whitespace-nowrap">
                {t('timer.penalty.latest')}
              </p>
              <PenaltyControls
                compact
                disabled={lastSolve === undefined}
                penalty={lastSolve?.penalty ?? 'ok'}
                onPenaltyChange={handlePenaltyChange}
              />
            </div>
          </Panel>
        </div>
        <div className="grid min-h-0 grid-rows-[minmax(12rem,2fr)_minmax(7rem,1fr)] gap-2 overflow-hidden lg:grid-cols-[minmax(0,1fr)_24rem] lg:grid-rows-none xl:grid-cols-[minmax(0,1fr)_30rem]">
          <section className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto_auto] gap-2 overflow-hidden">
            <TimerDisplay
              aria-label={t('timer.displayLabel')}
              className="h-full"
              elapsedMs={timer.elapsedMs}
              showMilliseconds={showMilliseconds}
              status={timer.status}
              {...touchHandlers}
            />
            <TimerStatusBar status={timer.status} />
            <InspectionBar
              enabled={inspectionEnabled}
              penalty={timer.inspectionPenalty}
              remainingMs={timer.inspectionRemainingMs}
            />
          </section>
          <aside className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2 overflow-hidden">
            <AverageCards
              cards={[
                { label: 'best', timeMs: stats.bestMs },
                { label: 'mean', timeMs: stats.meanMs },
                { label: 'ao5', timeMs: stats.ao5.timeMs },
                { label: 'ao12', timeMs: stats.ao12.timeMs },
              ]}
              className="grid-cols-2 sm:grid-cols-4 lg:grid-cols-2"
              showMilliseconds={showMilliseconds}
            />
            <SolveTable
              className="h-full min-h-0"
              rows={solves
                .slice()
                .reverse()
                .map((solve, index) => ({ ...solve, index: solves.length - index }))}
              showMilliseconds={showMilliseconds}
              onDeleteSolve={deleteSolve}
            />
          </aside>
        </div>
      </section>
    </main>
  )
}

type ScrambleHistory = {
  index: number
  items: GeneratedScramble[]
}

type CompactScrambleEventSelectProps = {
  events: readonly ScrambleEvent[]
  selectedEventId: string
  onEventChange: (eventId: string) => void
}

function CompactScrambleEventSelect({
  events,
  selectedEventId,
  onEventChange,
}: CompactScrambleEventSelectProps) {
  const { t } = useTranslation()
  const groups = Array.from(new Set(events.map((event) => event.group)))

  return (
    <select
      aria-label={t('timer.scramble.event')}
      className="h-7 max-w-40 border border-app-border bg-app-control px-2 text-xs font-extrabold uppercase tracking-[0.16em] text-app-muted outline-none transition-colors focus-visible:border-app-text focus-visible:ring-2 focus-visible:ring-app-focus/50"
      value={selectedEventId}
      onChange={(event) => onEventChange(event.target.value)}
    >
      {groups.map((group) => (
        <optgroup key={group} label={group}>
          {events
            .filter((event) => event.group === group)
            .map((event) => (
              <option key={event.id} value={event.id}>
                {event.label}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  )
}
