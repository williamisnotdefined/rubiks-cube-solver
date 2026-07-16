import { useEffect, useRef, useState } from 'react'
import type { TimerPenalty } from '@core/timer/penalties'
import type { TimerStatus } from '../../types'

const inspectionLimitMs = 15_000
const inspectionDnfMs = 17_000
const defaultDisplayTickMs = 50

type SolveCompleteHandler = (rawTimeMs: number, penalty: TimerPenalty) => void

type UseTimerMachineOptions = {
  displayTickMs?: number
  holdToStartMs: number
  inspectionEnabled: boolean
  onAttemptStart?: () => void
  onSolveComplete: SolveCompleteHandler
  onStatusChange?: (status: TimerStatus) => void
}

export type TimerMachine = {
  beginHold: () => void
  cancelHold: () => void
  elapsedMs: number
  inspectionPenalty: TimerPenalty
  inspectionRemainingMs: number
  releaseHold: () => void
  resetStopped: () => void
  status: TimerStatus
  stopTimer: () => void
}

export function useTimerMachine({
  displayTickMs = defaultDisplayTickMs,
  holdToStartMs,
  inspectionEnabled,
  onAttemptStart,
  onSolveComplete,
  onStatusChange,
}: UseTimerMachineOptions): TimerMachine {
  const [status, setStatus] = useState<TimerStatus>('idle')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [inspectionRemainingMs, setInspectionRemainingMs] = useState(inspectionLimitMs)
  const [inspectionPenalty, setInspectionPenalty] = useState<TimerPenalty>('ok')
  const statusRef = useRef<TimerStatus>('idle')
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const timerTickRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const inspectionTickRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const holdTargetRef = useRef<'inspection' | 'solve'>('solve')
  const previousStatusRef = useRef<TimerStatus>('idle')
  const runningStartedAtRef = useRef(0)
  const inspectionStartedAtRef = useRef(0)
  const pendingPenaltyRef = useRef<TimerPenalty>('ok')
  const onAttemptStartRef = useRef(onAttemptStart)
  const onSolveCompleteRef = useRef(onSolveComplete)
  const onStatusChangeRef = useRef(onStatusChange)

  useEffect(() => {
    onAttemptStartRef.current = onAttemptStart
    onSolveCompleteRef.current = onSolveComplete
    onStatusChangeRef.current = onStatusChange
  }, [onAttemptStart, onSolveComplete, onStatusChange])

  useEffect(
    () => () => {
      if (holdTimeoutRef.current !== undefined) {
        clearTimeout(holdTimeoutRef.current)
        holdTimeoutRef.current = undefined
      }

      if (timerTickRef.current !== undefined) {
        clearTimeout(timerTickRef.current)
        timerTickRef.current = undefined
      }

      if (inspectionTickRef.current !== undefined) {
        clearTimeout(inspectionTickRef.current)
        inspectionTickRef.current = undefined
      }
    },
    [],
  )

  function updateStatus(nextStatus: TimerStatus) {
    statusRef.current = nextStatus
    setStatus(nextStatus)
    onStatusChangeRef.current?.(nextStatus)
  }

  function clearHoldTimeout() {
    if (holdTimeoutRef.current !== undefined) {
      clearTimeout(holdTimeoutRef.current)
      holdTimeoutRef.current = undefined
    }
  }

  function clearFrame() {
    if (timerTickRef.current !== undefined) {
      clearTimeout(timerTickRef.current)
      timerTickRef.current = undefined
    }
  }

  function clearInspectionFrame() {
    if (inspectionTickRef.current !== undefined) {
      clearTimeout(inspectionTickRef.current)
      inspectionTickRef.current = undefined
    }
  }

  function beginHold() {
    const currentStatus = statusRef.current

    if (currentStatus === 'running') {
      stopTimer()
      return
    }

    if (currentStatus === 'holding' || currentStatus === 'ready') {
      return
    }

    if (currentStatus === 'stopped') {
      setElapsedMs(0)
    }

    if (currentStatus === 'idle' || currentStatus === 'stopped') {
      onAttemptStartRef.current?.()
    }

    previousStatusRef.current = currentStatus === 'stopped' ? 'idle' : currentStatus
    holdTargetRef.current =
      currentStatus === 'inspection' ? 'solve' : inspectionEnabled ? 'inspection' : 'solve'
    updateStatus('holding')

    if (holdToStartMs <= 0) {
      updateStatus('ready')
      return
    }

    holdTimeoutRef.current = setTimeout(() => {
      holdTimeoutRef.current = undefined
      updateStatus('ready')
    }, holdToStartMs)
  }

  function releaseHold() {
    const currentStatus = statusRef.current

    if (currentStatus === 'ready') {
      clearHoldTimeout()

      if (holdTargetRef.current === 'inspection') {
        startInspection()
      } else {
        startRunning()
      }

      return
    }

    if (currentStatus === 'holding') {
      cancelHold()
    }
  }

  function cancelHold() {
    if (statusRef.current !== 'holding' && statusRef.current !== 'ready') {
      return
    }

    clearHoldTimeout()
    updateStatus(previousStatusRef.current)
  }

  function resetStopped() {
    if (statusRef.current !== 'stopped') {
      return
    }

    setElapsedMs(0)
    updateStatus('idle')
  }

  function startInspection() {
    clearInspectionFrame()
    inspectionStartedAtRef.current = performance.now()
    pendingPenaltyRef.current = 'ok'
    setElapsedMs(0)
    setInspectionRemainingMs(inspectionLimitMs)
    setInspectionPenalty('ok')
    updateStatus('inspection')

    function tick() {
      const elapsedInspectionMs = performance.now() - inspectionStartedAtRef.current
      const nextPenalty = inspectionPenaltyForElapsed(elapsedInspectionMs)

      pendingPenaltyRef.current = nextPenalty
      setInspectionPenalty(nextPenalty)
      setInspectionRemainingMs(Math.max(0, inspectionLimitMs - elapsedInspectionMs))

      if (
        statusRef.current === 'inspection' ||
        ((statusRef.current === 'holding' || statusRef.current === 'ready') &&
          previousStatusRef.current === 'inspection')
      ) {
        inspectionTickRef.current = setTimeout(tick, displayTickMs)
      }
    }

    inspectionTickRef.current = setTimeout(tick, displayTickMs)
  }

  function startRunning() {
    clearInspectionFrame()
    pendingPenaltyRef.current =
      previousStatusRef.current === 'inspection'
        ? inspectionPenaltyForElapsed(performance.now() - inspectionStartedAtRef.current)
        : 'ok'
    runningStartedAtRef.current = performance.now()
    setElapsedMs(0)
    updateStatus('running')

    function tick() {
      setElapsedMs(Math.max(0, performance.now() - runningStartedAtRef.current))

      if (statusRef.current === 'running') {
        timerTickRef.current = setTimeout(tick, displayTickMs)
      }
    }

    timerTickRef.current = setTimeout(tick, displayTickMs)
  }

  function stopTimer() {
    if (statusRef.current !== 'running') {
      return
    }

    const rawTimeMs = Math.max(0, performance.now() - runningStartedAtRef.current)

    clearFrame()
    setElapsedMs(rawTimeMs)
    updateStatus('stopped')
    onSolveCompleteRef.current(rawTimeMs, pendingPenaltyRef.current)
  }

  return {
    beginHold,
    cancelHold,
    elapsedMs,
    inspectionPenalty,
    inspectionRemainingMs,
    releaseHold,
    resetStopped,
    status,
    stopTimer,
  }
}

export function inspectionPenaltyForElapsed(elapsedMs: number): TimerPenalty {
  if (elapsedMs >= inspectionDnfMs) {
    return 'dnf'
  }

  if (elapsedMs >= inspectionLimitMs) {
    return 'plus2'
  }

  return 'ok'
}
