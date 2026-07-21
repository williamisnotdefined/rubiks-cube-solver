import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCopyToClipboard } from 'usehooks-ts'
import { useToast } from '@core/toast/toastStore'
import { scrambleEventById } from '@core/scramble/catalog'
import { generateHighQualityScrambleForEvent } from '@core/scramble/highQuality'
import { finalTimeMs } from '@core/timer/penalties'
import type { GeneratedScramble } from '@core/scramble/types'
import type { TimerPenalty } from '@core/timer/penalties'
import { useTimerSettingsStore } from '../../timerSettingsStore'
import { createTimerId, useTimerStore } from '../../timerStore'
import type { TimerSolve } from '../../types'

type ScrambleHistory = {
  index: number
  items: GeneratedScramble[]
}

type QueueNextScrambleOptions = {
  replaceHistory?: boolean
}

type AttemptSnapshot = Readonly<{
  eventId: string
  scramble: string
  sessionId: string
}>

export type TimerScrambleHistory = ReturnType<typeof useTimerScrambleHistory>

export function useTimerScrambleHistory(interactionLocked = false) {
  const { t } = useTranslation()
  const [, copyToClipboard] = useCopyToClipboard()
  const showToast = useToast()
  const selectedEventId = useTimerSettingsStore((state) => state.selectedEventId)
  const addSolve = useTimerStore((state) => state.addSolve)
  const setActiveSessionEvent = useTimerStore((state) => state.setActiveSessionEvent)
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
  const [lastCompletedSolveId, setLastCompletedSolveId] = useState<string | null>(null)
  const [timerResetSignal, setTimerResetSignal] = useState(0)
  const isMountedRef = useRef(false)
  const scrambleRequestIdRef = useRef(0)
  const requestedEventIdRef = useRef<string | null>(null)
  const attemptSnapshotRef = useRef<AttemptSnapshot | null>(null)
  const generatedScramble = scrambleHistory.items[scrambleHistory.index]!

  useEffect(
    () => {
      isMountedRef.current = true

      return () => {
        isMountedRef.current = false
      }
    },
    [],
  )

  useEffect(() => {
    if (interactionLocked || requestedEventIdRef.current === selectedEventId) {
      return
    }

    requestedEventIdRef.current = selectedEventId
    const requestId = ++scrambleRequestIdRef.current

    setActiveSessionEvent(selectedEventId)
    setIsScramblePending(true)
    setScrambleLoadFailed(false)
    setCopied(false)

    void generateHighQualityScrambleForEvent(selectedEventId)
      .then((scramble) => {
        if (!isMountedRef.current || scrambleRequestIdRef.current !== requestId) {
          return
        }

        setScrambleHistory({ index: 0, items: [scramble] })
        setScrambleLoadFailed(false)
      })
      .catch(() => {
        if (!isMountedRef.current || scrambleRequestIdRef.current !== requestId) {
          return
        }

        setScrambleLoadFailed(true)
      })
      .finally(() => {
        if (isMountedRef.current && scrambleRequestIdRef.current === requestId) {
          setIsScramblePending(false)
        }
      })
  }, [interactionLocked, selectedEventId, setActiveSessionEvent])

  function handleAttemptStart() {
    const { activeSessionId, sessions, setActiveSessionId } = useTimerStore.getState()
    const activeSession = sessions.find((session) => session.id === activeSessionId) ?? sessions[0]

    if (
      activeSession === undefined ||
      scrambleLoadFailed ||
      generatedScramble.scramble.trim() === ''
    ) {
      attemptSnapshotRef.current = null
      return
    }

    if (activeSession.id !== activeSessionId) {
      setActiveSessionId(activeSession.id)
    }

    attemptSnapshotRef.current = Object.freeze({
      eventId: generatedScramble.event.id,
      scramble: generatedScramble.scramble,
      sessionId: activeSession.id,
    })
  }

  function handleSolveComplete(rawTimeMs: number, penalty: TimerPenalty, endedAt: number) {
    const attempt = attemptSnapshotRef.current
    attemptSnapshotRef.current = null

    if (attempt === null) {
      return
    }

    const solve: TimerSolve = {
      comment: '',
      endedAt,
      eventId: attempt.eventId,
      finalTimeMs: finalTimeMs(rawTimeMs, penalty),
      id: createTimerId('solve'),
      penalty,
      rawTimeMs,
      scramble: attempt.scramble,
      startedAt: endedAt - rawTimeMs,
    }

    addSolve(solve, attempt.sessionId)
    setLastCompletedSolveId(solve.id)
    queueNextScramble(attempt.eventId)
    setCopied(false)
  }

  function handleNextScramble() {
    if (interactionLocked || isScramblePending) {
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

    setScrambleHistory((history) => ({
      ...history,
      index: history.index + 1,
    }))
    setCopied(false)
    setTimerResetSignal((signal) => signal + 1)
  }

  function handlePreviousScramble() {
    if (interactionLocked || isScramblePending) {
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
      title: copySucceeded ? t('timer.scramble.copied') : t('timer.scramble.copyFailed'),
      tone: copySucceeded ? 'success' : 'error',
    })
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
        if (!isMountedRef.current || scrambleRequestIdRef.current !== requestId) {
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
        if (!isMountedRef.current || scrambleRequestIdRef.current !== requestId) {
          return
        }

        setScrambleLoadFailed(true)
      })
      .finally(() => {
        if (isMountedRef.current && scrambleRequestIdRef.current === requestId) {
          setIsScramblePending(false)
        }
      })
  }

  return {
    canGoPrevious: !isScramblePending && !scrambleLoadFailed && scrambleHistory.index > 0,
    copied,
    generatedScramble,
    interactionLocked,
    isScramblePending,
    lastCompletedSolveId,
    scrambleLoadFailed,
    timerDisabled: isScramblePending || scrambleLoadFailed,
    timerResetSignal,
    handleAttemptStart,
    handleCopyScramble,
    handleNextScramble,
    handlePreviousScramble,
    handleSolveComplete,
  }
}
