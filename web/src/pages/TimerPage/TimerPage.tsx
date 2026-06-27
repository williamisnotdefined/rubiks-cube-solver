import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { useCopyToClipboard } from 'usehooks-ts'
import { AverageCards } from '@components/timer/AverageCards'
import { InspectionBar } from '@components/timer/InspectionBar'
import { PenaltyControls } from '@components/timer/PenaltyControls'
import { SolveTable } from '@components/timer/SolveTable'
import { TimerDisplay } from '@components/timer/TimerDisplay'
import { TimerStatusBar } from '@components/timer/TimerStatusBar'
import { Panel } from '@components/layout/Panel'
import { ScrambleViewer } from '@components/scramble/ScrambleViewer'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@components/Select'
import { Switch } from '@components/Switch'
import { useToast } from '@core/toast/toastStore'
import {
  scrambleEventById,
  scrambleEvents,
} from '@core/scramble/catalog'
import { generateHighQualityScrambleForEvent } from '@core/scramble/highQuality'
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
  const [, copyToClipboard] = useCopyToClipboard()
  const showToast = useToast()
  const [scrambleHistory, setScrambleHistory] = useState<ScrambleHistory>(() => {
    const initialScramble: GeneratedScramble = {
      event: scrambleEventById(useTimerSettingsStore.getState().selectedEventId),
      scramble: '',
    }

    return { index: 0, items: [initialScramble] }
  })
  const [copied, setCopied] = useState(false)
  const [scrambleLoadFailed, setScrambleLoadFailed] = useState(false)
  const [isScramblePending, setIsScramblePending] = useState(true)
  const [timerResetSignal, setTimerResetSignal] = useState(0)
  const timerDisplayRef = useRef<HTMLDivElement>(null)
  const scrambleRequestIdRef = useRef(0)
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
  const solveRows = useMemo(
    () => solves.slice().reverse().map((solve, index) => ({
      ...solve,
      index: solves.length - index,
    })),
    [solves],
  )
  const stats = timerStats(solves)

  useEffect(() => () => {
    scrambleRequestIdRef.current += 1
  }, [])

  useEffect(() => {
    const requestId = ++scrambleRequestIdRef.current

    setActiveSessionEvent(selectedEventId)
    setIsScramblePending(true)
    setScrambleLoadFailed(false)
    setCopied(false)

    void generateHighQualityScrambleForEvent(selectedEventId)
      .then((scramble) => {
        if (scrambleRequestIdRef.current !== requestId) {
          return
        }

        setScrambleHistory({ index: 0, items: [scramble] })
        setScrambleLoadFailed(false)
      })
      .catch(() => {
        if (scrambleRequestIdRef.current !== requestId) {
          return
        }

        setScrambleLoadFailed(true)
      })
      .finally(() => {
        if (scrambleRequestIdRef.current === requestId) {
          setIsScramblePending(false)
        }
      })
  }, [selectedEventId, setActiveSessionEvent])

  function handleSolveComplete(rawTimeMs: number, penalty: TimerPenalty) {
    if (scrambleLoadFailed || generatedScramble.scramble.trim() === '') {
      return
    }

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
    queueNextScramble(selectedEventId)
    setCopied(false)
  }

  function handleNextScramble() {
    if (isScramblePending) {
      return
    }

    if (scrambleLoadFailed) {
      queueNextScramble(selectedEventId, { replaceHistory: true })
      setCopied(false)
      return
    }

    if (scrambleHistory.index >= scrambleHistory.items.length - 1) {
      queueNextScramble(selectedEventId)
      setCopied(false)
      setTimerResetSignal((signal) => signal + 1)
      return
    }

    setScrambleHistory((history) => {
      return {
        ...history,
        index: history.index + 1,
      }
    })
    setCopied(false)
    setTimerResetSignal((signal) => signal + 1)
  }

  function handlePreviousScramble() {
    if (isScramblePending) {
      return
    }

    setScrambleHistory((history) => ({
      ...history,
      index: Math.max(0, history.index - 1),
    }))
    setCopied(false)
    setTimerResetSignal((signal) => signal + 1)
  }

  async function handleCopyScramble() {
    if (isScramblePending || scrambleLoadFailed) {
      return
    }

    const copySucceeded = await copyToClipboard(generatedScramble.scramble)

    setCopied(copySucceeded)
    showToast({
      title: copySucceeded
        ? t('timer.scramble.copied')
        : t('timer.scramble.copyFailed'),
      tone: copySucceeded ? 'success' : 'error',
    })
  }

  function handlePenaltyChange(penalty: TimerPenalty) {
    if (lastSolve === undefined) {
      return
    }

    updateSolvePenalty(lastSolve.id, penalty)
  }

  function handleEventChange(eventId: string) {
    setSelectedEventId(eventId)
    focusTimerDisplaySoon()
  }

  function handleInspectionEnabledChange(checked: boolean) {
    setInspectionEnabled(checked)
    focusTimerDisplay()
  }

  function handleShowMillisecondsChange(checked: boolean) {
    setShowMilliseconds(checked)
    focusTimerDisplay()
  }

  function focusTimerDisplay() {
    timerDisplayRef.current?.focus({ preventScroll: true })
  }

  function focusTimerDisplaySoon() {
    window.setTimeout(focusTimerDisplay, 0)
  }

  function queueNextScramble(
    eventId: string,
    { replaceHistory = false }: QueueNextScrambleOptions = {},
  ) {
    const requestId = ++scrambleRequestIdRef.current

    setIsScramblePending(true)
    setScrambleLoadFailed(false)

    void generateHighQualityScrambleForEvent(eventId)
      .then((scramble) => {
        if (scrambleRequestIdRef.current !== requestId) {
          return
        }

        setScrambleHistory((history) => {
          if (replaceHistory) {
            return { index: 0, items: [scramble] }
          }

          const retainedHistory = history.items.slice(0, history.index + 1)

          return {
            index: retainedHistory.length,
            items: [...retainedHistory, scramble],
          }
        })
        setScrambleLoadFailed(false)
      })
      .catch(() => {
        if (scrambleRequestIdRef.current !== requestId) {
          return
        }

        setScrambleLoadFailed(true)
      })
      .finally(() => {
        if (scrambleRequestIdRef.current === requestId) {
          setIsScramblePending(false)
        }
      })
  }

  return (
    <main className="flex h-full min-h-0 flex-1 overflow-hidden px-3 py-2 sm:px-5 sm:py-3">
      <section className="mx-auto grid h-full min-h-0 w-full max-w-7xl grid-rows-[auto_minmax(0,1fr)] gap-2">
        <div className="grid min-h-0 shrink-0 gap-2">
          <ScrambleViewer
            className="min-h-0"
            canGoPrevious={!isScramblePending && !scrambleLoadFailed && scrambleHistory.index > 0}
            copied={copied}
            eventControl={(
              <CompactScrambleEventSelect
                events={scrambleEvents}
                selectedEventId={selectedEventId}
                onActionComplete={focusTimerDisplaySoon}
                onEventChange={handleEventChange}
              />
            )}
            eventLabel={generatedScramble.event.label}
            focusableActions={false}
            onActionComplete={focusTimerDisplay}
            scramble={scrambleText({
              failed: scrambleLoadFailed,
              pending: isScramblePending,
              scramble: generatedScramble.scramble,
              t,
            })}
            onCopy={isScramblePending || scrambleLoadFailed ? undefined : handleCopyScramble}
            onNext={isScramblePending ? undefined : handleNextScramble}
            onPrevious={isScramblePending || scrambleLoadFailed ? undefined : handlePreviousScramble}
          />
          <Panel className="grid min-h-0 grid-cols-2 gap-2 p-2 sm:w-fit sm:justify-self-start" aria-label={t('timer.settings.label')}>
            <label className="flex min-h-9 items-center gap-2 border border-app-border bg-app-control px-3 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-app-text">
              <Switch
                aria-label={t('timer.settings.inspection')}
                checked={inspectionEnabled}
                tabIndex={-1}
                onCheckedChange={handleInspectionEnabledChange}
                onPointerDown={preventPointerFocus}
              />
              {t('timer.settings.inspection')}
            </label>
            <label className="flex min-h-9 items-center gap-2 border border-app-border bg-app-control px-3 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-app-text">
              <Switch
                aria-label={t('timer.settings.milliseconds')}
                checked={showMilliseconds}
                tabIndex={-1}
                onCheckedChange={handleShowMillisecondsChange}
                onPointerDown={preventPointerFocus}
              />
              {t('timer.settings.milliseconds')}
            </label>
          </Panel>
        </div>
        <div className="grid min-h-0 grid-rows-[minmax(12rem,2fr)_minmax(7rem,1fr)] gap-2 overflow-hidden lg:grid-cols-[minmax(0,1fr)_24rem] lg:grid-rows-none xl:grid-cols-[minmax(0,1fr)_30rem]">
          <TimerRuntime
            disabled={isScramblePending || scrambleLoadFailed}
            displayRef={timerDisplayRef}
            holdToStartMs={holdToStartMs}
            inspectionEnabled={inspectionEnabled}
            penalty={lastSolve?.penalty ?? 'ok'}
            penaltyDisabled={lastSolve === undefined}
            resetSignal={timerResetSignal}
            showMilliseconds={showMilliseconds}
            onPenaltyChange={handlePenaltyChange}
            onSolveComplete={handleSolveComplete}
          />
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
              focusableActions={false}
              rows={solveRows}
              showMilliseconds={showMilliseconds}
              onActionComplete={focusTimerDisplay}
              onDeleteSolve={deleteSolve}
            />
          </aside>
        </div>
      </section>
    </main>
  )
}

type ScrambleTextOptions = {
  failed: boolean
  pending: boolean
  scramble: string
  t: ReturnType<typeof useTranslation>['t']
}

function scrambleText({ failed, pending, scramble, t }: ScrambleTextOptions): string {
  if (pending) {
    return t('timer.scramble.generating')
  }

  if (failed) {
    return t('timer.scramble.generateFailed')
  }

  return scramble
}

type TimerRuntimeProps = {
  disabled: boolean
  displayRef: RefObject<HTMLDivElement | null>
  holdToStartMs: number
  inspectionEnabled: boolean
  penalty: TimerPenalty
  penaltyDisabled: boolean
  resetSignal: number
  showMilliseconds: boolean
  onPenaltyChange: (penalty: TimerPenalty) => void
  onSolveComplete: (rawTimeMs: number, penalty: TimerPenalty) => void
}

function TimerRuntime({
  disabled,
  displayRef,
  holdToStartMs,
  inspectionEnabled,
  penalty,
  penaltyDisabled,
  resetSignal,
  showMilliseconds,
  onPenaltyChange,
  onSolveComplete,
}: TimerRuntimeProps) {
  const { t } = useTranslation()
  const timer = useTimerMachine({
    holdToStartMs,
    inspectionEnabled,
    onSolveComplete,
  })
  const timerRef = useRef(timer)
  timerRef.current = timer
  const touchHandlers = useTouchTimer(timer, disabled)

  useKeyboardTimer(timer, disabled)

  useEffect(() => {
    if (resetSignal > 0) {
      timerRef.current.resetStopped()
    }
  }, [resetSignal])

  function focusTimerDisplay() {
    displayRef.current?.focus({ preventScroll: true })
  }

  return (
    <section className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto_auto] gap-2 overflow-hidden">
      <TimerDisplay
        ref={displayRef}
        aria-label={t('timer.displayLabel')}
        aria-disabled={disabled}
        className="h-full"
        elapsedMs={timer.elapsedMs}
        showMilliseconds={showMilliseconds}
        status={timer.status}
        {...touchHandlers}
      >
        <PenaltyControls
          compact
          className="mt-5 w-full max-w-44"
          disabled={penaltyDisabled}
          focusable={false}
          penalty={penalty}
          onActionComplete={focusTimerDisplay}
          onPenaltyChange={onPenaltyChange}
        />
      </TimerDisplay>
      <TimerStatusBar status={timer.status} />
      <InspectionBar
        enabled={inspectionEnabled}
        penalty={timer.inspectionPenalty}
        remainingMs={timer.inspectionRemainingMs}
      />
    </section>
  )
}

type ScrambleHistory = {
  index: number
  items: GeneratedScramble[]
}

type QueueNextScrambleOptions = {
  replaceHistory?: boolean
}

type CompactScrambleEventSelectProps = {
  events: readonly ScrambleEvent[]
  selectedEventId: string
  onActionComplete?: () => void
  onEventChange: (eventId: string) => void
}

function CompactScrambleEventSelect({
  events,
  selectedEventId,
  onActionComplete,
  onEventChange,
}: CompactScrambleEventSelectProps) {
  const { t } = useTranslation()
  const groups = Array.from(new Set(events.map((event) => event.group)))

  return (
    <Select
      value={selectedEventId}
      onValueChange={onEventChange}
    >
      <SelectTrigger
        aria-label={t('timer.scramble.event')}
        className="h-7 max-w-40 px-2 py-1 text-xs font-extrabold uppercase tracking-[0.16em] text-app-muted"
        tabIndex={-1}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          onActionComplete?.()
        }}
      >
        {groups.map((group) => (
          <SelectGroup key={group}>
            <SelectLabel>{group}</SelectLabel>
            {events
              .filter((event) => event.group === group)
              .map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.label}
                </SelectItem>
              ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}

function preventPointerFocus(event: { preventDefault: () => void }) {
  event.preventDefault()
}
