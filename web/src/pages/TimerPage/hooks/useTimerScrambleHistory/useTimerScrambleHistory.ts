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
import { useTimerStore } from '../../timerStore'
import type { TimerSolve } from '../../types'

type ScrambleHistory = {
  index: number
  items: GeneratedScramble[]
}

type QueueNextScrambleOptions = {
  replaceHistory?: boolean
}

export type TimerScrambleHistory = ReturnType<typeof useTimerScrambleHistory>

export function useTimerScrambleHistory() {
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
  const [timerResetSignal, setTimerResetSignal] = useState(0)
  const scrambleRequestIdRef = useRef(0)
  const generatedScramble = scrambleHistory.items[scrambleHistory.index]!

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

    setScrambleHistory((history) => ({
      ...history,
      index: history.index + 1,
    }))
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

  return {
    canGoPrevious: !isScramblePending && !scrambleLoadFailed && scrambleHistory.index > 0,
    copied,
    generatedScramble,
    isScramblePending,
    scrambleLoadFailed,
    timerDisabled: isScramblePending || scrambleLoadFailed,
    timerResetSignal,
    handleCopyScramble,
    handleNextScramble,
    handlePreviousScramble,
    handleSolveComplete,
  }
}
