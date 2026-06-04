import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AverageCards } from '@components/timer/AverageCards'
import { InspectionBar } from '@components/timer/InspectionBar'
import { PenaltyControls } from '@components/timer/PenaltyControls'
import { SessionSummary } from '@components/timer/SessionSummary'
import { SolveTable } from '@components/timer/SolveTable'
import { TimerDisplay } from '@components/timer/TimerDisplay'
import { TimerStatusBar } from '@components/timer/TimerStatusBar'
import { Panel } from '@components/layout/Panel'
import { ScrambleActions } from '@components/scramble/ScrambleActions'
import { ScrambleSelector } from '@components/scramble/ScrambleSelector'
import { ScrambleViewer } from '@components/scramble/ScrambleViewer'
import {
  generateScrambleForEvent,
  scrambleEventById,
  scrambleEvents,
} from '@core/scramble/catalog'
import { finalTimeMs } from '@core/timer/penalties'
import { timerStats } from '@core/timer/statistics'
import type { TimerPenalty } from '@core/timer/penalties'
import { useKeyboardTimer } from './hooks/useKeyboardTimer'
import { useTimerMachine } from './hooks/useTimerMachine'
import { useTouchTimer } from './hooks/useTouchTimer'
import { useTimerSettingsStore } from './timerSettingsStore'
import { useTimerStore } from './timerStore'
import type { TimerSolve } from './types'

export function TimerPage() {
  const { t } = useTranslation()
  const [generatedScramble, setGeneratedScramble] = useState(() =>
    generateScrambleForEvent(useTimerSettingsStore.getState().selectedEventId),
  )
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
  const event = scrambleEventById(selectedEventId)
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
    setGeneratedScramble(generateScrambleForEvent(selectedEventId))
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
    setGeneratedScramble(generateScrambleForEvent(selectedEventId))
    setCopied(false)
  }

  function handleNextScramble() {
    setGeneratedScramble(generateScrambleForEvent(selectedEventId))
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
    <main className="min-h-screen px-3 py-4 sm:px-5 sm:py-6">
      <section className="mx-auto grid w-full max-w-5xl content-start gap-4">
        <SessionSummary
          eventLabel={event.label}
          sessionName={activeSession.name}
          solveCount={solves.length}
        />
        <ScrambleViewer eventLabel={generatedScramble.event.label} scramble={generatedScramble.scramble} />
        <ScrambleActions copied={copied} onCopy={handleCopyScramble} onNext={handleNextScramble} />
        <TimerDisplay
          aria-label={t('timer.displayLabel')}
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
        <AverageCards
          cards={[
            { label: 'best', timeMs: stats.bestMs },
            { label: 'mean', timeMs: stats.meanMs },
            { label: 'ao5', timeMs: stats.ao5.timeMs },
            { label: 'ao12', timeMs: stats.ao12.timeMs },
          ]}
          showMilliseconds={showMilliseconds}
        />
        <Panel className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end" aria-label={t('timer.settings.label')}>
          <ScrambleSelector
            events={scrambleEvents}
            selectedEventId={selectedEventId}
            onEventChange={setSelectedEventId}
          />
          <label className="flex min-h-12 items-center gap-3 border border-app-border bg-app-control px-4 py-3 text-xs font-extrabold uppercase tracking-[0.16em] text-app-text">
            <input
              checked={inspectionEnabled}
              className="size-4 accent-app-text"
              type="checkbox"
              onChange={(event) => setInspectionEnabled(event.target.checked)}
            />
            {t('timer.settings.inspection')}
          </label>
          <label className="flex min-h-12 items-center gap-3 border border-app-border bg-app-control px-4 py-3 text-xs font-extrabold uppercase tracking-[0.16em] text-app-text">
            <input
              checked={showMilliseconds}
              className="size-4 accent-app-text"
              type="checkbox"
              onChange={(event) => setShowMilliseconds(event.target.checked)}
            />
            {t('timer.settings.milliseconds')}
          </label>
        </Panel>
        <Panel className="grid gap-3" aria-label={t('timer.penalty.label')}>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-app-muted">
            {t('timer.penalty.latest')}
          </p>
          <PenaltyControls
            disabled={lastSolve === undefined}
            penalty={lastSolve?.penalty ?? 'ok'}
            onPenaltyChange={handlePenaltyChange}
          />
        </Panel>
        <SolveTable
          rows={solves
            .slice()
            .reverse()
            .map((solve, index) => ({ ...solve, index: solves.length - index }))}
          showMilliseconds={showMilliseconds}
          onDeleteSolve={deleteSolve}
        />
      </section>
    </main>
  )
}
