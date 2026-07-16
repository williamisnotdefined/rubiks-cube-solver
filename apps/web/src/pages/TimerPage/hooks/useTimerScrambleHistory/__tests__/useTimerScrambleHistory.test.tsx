import { scrambleEventById } from '@core/scramble/catalog'
import type { GeneratedScramble } from '@core/scramble/types'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTimerSettingsStore } from '../../../timerSettingsStore'
import { useTimerStore } from '../../../timerStore'
import { useTimerScrambleHistory } from '../useTimerScrambleHistory'

const hookMocks = vi.hoisted(() => ({
  copyToClipboard: vi.fn(),
  generateHighQualityScrambleForEvent: vi.fn(),
  showToast: vi.fn(),
}))

vi.mock('usehooks-ts', () => ({
  useCopyToClipboard: () => [null, hookMocks.copyToClipboard],
}))

vi.mock('@core/scramble/highQuality', () => ({
  generateHighQualityScrambleForEvent: hookMocks.generateHighQualityScrambleForEvent,
}))

vi.mock('@core/toast/toastStore', () => ({
  useToast: () => hookMocks.showToast,
}))

describe('useTimerScrambleHistory', () => {
  beforeEach(() => {
    localStorage.clear()
    useTimerStore.getState().resetTimerStore()
    useTimerSettingsStore.getState().resetTimerSettings()
    hookMocks.copyToClipboard.mockReset().mockResolvedValue(true)
    hookMocks.generateHighQualityScrambleForEvent.mockReset()
    hookMocks.showToast.mockReset()
  })

  it('loads the initial scramble for the selected event and updates the active session', async () => {
    const request = deferred<GeneratedScramble>()
    useTimerSettingsStore.getState().setSelectedEventId('222')
    hookMocks.generateHighQualityScrambleForEvent.mockReturnValue(request.promise)

    const { result } = renderHook(() => useTimerScrambleHistory())

    expect(result.current.generatedScramble).toEqual(scramble('222', ''))
    expect(result.current.isScramblePending).toBe(true)
    expect(result.current.timerDisabled).toBe(true)
    expect(hookMocks.generateHighQualityScrambleForEvent).toHaveBeenCalledWith('222')
    expect(activeSession()?.eventId).toBe('222')

    await resolveRequest(request, scramble('222', "R U R'"))

    await waitFor(() => expect(result.current.isScramblePending).toBe(false))
    expect(result.current.generatedScramble).toEqual(scramble('222', "R U R'"))
    expect(result.current.scrambleLoadFailed).toBe(false)
    expect(result.current.timerDisabled).toBe(false)
  })

  it('guards navigation, copying, and solve completion while the initial scramble is pending', async () => {
    const request = deferred<GeneratedScramble>()
    hookMocks.generateHighQualityScrambleForEvent.mockReturnValue(request.promise)
    const { result } = renderHook(() => useTimerScrambleHistory())

    act(() => {
      result.current.handleNextScramble()
      result.current.handlePreviousScramble()
      result.current.handleSolveComplete(1_000, 'ok')
    })
    await act(async () => result.current.handleCopyScramble())

    expect(hookMocks.generateHighQualityScrambleForEvent).toHaveBeenCalledTimes(1)
    expect(hookMocks.copyToClipboard).not.toHaveBeenCalled()
    expect(activeSession()?.solves).toEqual([])
    expect(result.current.timerResetSignal).toBe(0)

    await resolveRequest(request, scramble('333', 'R U'))
  })

  it('keeps bounded history and reuses generated scrambles during navigation', async () => {
    hookMocks.generateHighQualityScrambleForEvent
      .mockResolvedValueOnce(scramble('333', 'first'))
      .mockResolvedValueOnce(scramble('333', 'second'))
      .mockResolvedValueOnce(scramble('333', 'third'))
    const { result } = renderHook(() => useTimerScrambleHistory())

    await waitFor(() => expect(result.current.generatedScramble.scramble).toBe('first'))

    act(() => result.current.handlePreviousScramble())
    expect(result.current.generatedScramble.scramble).toBe('first')
    expect(result.current.timerResetSignal).toBe(1)

    act(() => result.current.handleNextScramble())
    await waitFor(() => expect(result.current.generatedScramble.scramble).toBe('second'))
    expect(result.current.canGoPrevious).toBe(true)

    act(() => result.current.handlePreviousScramble())
    expect(result.current.generatedScramble.scramble).toBe('first')
    expect(result.current.canGoPrevious).toBe(false)

    act(() => result.current.handleNextScramble())
    expect(result.current.generatedScramble.scramble).toBe('second')
    expect(hookMocks.generateHighQualityScrambleForEvent).toHaveBeenCalledTimes(2)

    act(() => result.current.handleNextScramble())
    await waitFor(() => expect(result.current.generatedScramble.scramble).toBe('third'))

    expect(hookMocks.generateHighQualityScrambleForEvent).toHaveBeenCalledTimes(3)
    expect(result.current.timerResetSignal).toBe(5)
  })

  it('reports generation failure and replaces failed history on retry', async () => {
    hookMocks.generateHighQualityScrambleForEvent
      .mockRejectedValueOnce(new Error('provider unavailable'))
      .mockResolvedValueOnce(scramble('333', 'retry scramble'))
    const { result } = renderHook(() => useTimerScrambleHistory())

    await waitFor(() => expect(result.current.scrambleLoadFailed).toBe(true))
    expect(result.current.isScramblePending).toBe(false)
    expect(result.current.timerDisabled).toBe(true)

    await act(async () => result.current.handleCopyScramble())
    act(() => result.current.handleSolveComplete(1_000, 'ok'))

    expect(hookMocks.copyToClipboard).not.toHaveBeenCalled()
    expect(activeSession()?.solves).toEqual([])

    act(() => result.current.handleNextScramble())
    expect(result.current.isScramblePending).toBe(true)

    await waitFor(() => expect(result.current.generatedScramble.scramble).toBe('retry scramble'))
    expect(result.current.scrambleLoadFailed).toBe(false)
    expect(result.current.canGoPrevious).toBe(false)
    expect(result.current.timerResetSignal).toBe(0)
  })

  it('retries by replacing history when generation fails after a loaded scramble', async () => {
    hookMocks.generateHighQualityScrambleForEvent
      .mockResolvedValueOnce(scramble('333', 'initial scramble'))
      .mockRejectedValueOnce(new Error('next scramble failed'))
      .mockResolvedValueOnce(scramble('333', 'replacement scramble'))
    const { result } = renderHook(() => useTimerScrambleHistory())

    await waitFor(() => expect(result.current.generatedScramble.scramble).toBe('initial scramble'))
    act(() => result.current.handleNextScramble())

    await waitFor(() => expect(result.current.scrambleLoadFailed).toBe(true))
    expect(result.current.generatedScramble.scramble).toBe('initial scramble')

    act(() => result.current.handleNextScramble())

    await waitFor(() =>
      expect(result.current.generatedScramble.scramble).toBe('replacement scramble'),
    )
    expect(result.current.scrambleLoadFailed).toBe(false)
    expect(result.current.canGoPrevious).toBe(false)
  })

  it('ignores an initial request that completes after the selected event changes', async () => {
    const staleRequest = deferred<GeneratedScramble>()
    const currentRequest = deferred<GeneratedScramble>()
    hookMocks.generateHighQualityScrambleForEvent
      .mockReturnValueOnce(staleRequest.promise)
      .mockReturnValueOnce(currentRequest.promise)
    const { result } = renderHook(() => useTimerScrambleHistory())

    act(() => useTimerSettingsStore.getState().setSelectedEventId('222'))
    await waitFor(() =>
      expect(hookMocks.generateHighQualityScrambleForEvent).toHaveBeenCalledTimes(2),
    )

    await resolveRequest(staleRequest, scramble('333', 'stale scramble'))

    expect(result.current.isScramblePending).toBe(true)
    expect(result.current.generatedScramble.scramble).toBe('')
    expect(result.current.scrambleLoadFailed).toBe(false)

    await resolveRequest(currentRequest, scramble('222', 'current scramble'))

    await waitFor(() => expect(result.current.isScramblePending).toBe(false))
    expect(result.current.generatedScramble).toEqual(scramble('222', 'current scramble'))
  })

  it('ignores an initial request rejection after the selected event changes', async () => {
    const staleRequest = deferred<GeneratedScramble>()
    const currentRequest = deferred<GeneratedScramble>()
    hookMocks.generateHighQualityScrambleForEvent
      .mockReturnValueOnce(staleRequest.promise)
      .mockReturnValueOnce(currentRequest.promise)
    const { result } = renderHook(() => useTimerScrambleHistory())

    act(() => useTimerSettingsStore.getState().setSelectedEventId('222'))
    await waitFor(() =>
      expect(hookMocks.generateHighQualityScrambleForEvent).toHaveBeenCalledTimes(2),
    )

    await rejectRequest(staleRequest)

    expect(result.current.isScramblePending).toBe(true)
    expect(result.current.scrambleLoadFailed).toBe(false)

    await resolveRequest(currentRequest, scramble('222', 'current scramble'))

    await waitFor(() => expect(result.current.isScramblePending).toBe(false))
    expect(result.current.generatedScramble).toEqual(scramble('222', 'current scramble'))
  })

  it('ignores a queued request failure after an event change starts a newer request', async () => {
    const staleRequest = deferred<GeneratedScramble>()
    const currentRequest = deferred<GeneratedScramble>()
    hookMocks.generateHighQualityScrambleForEvent
      .mockResolvedValueOnce(scramble('333', 'initial scramble'))
      .mockReturnValueOnce(staleRequest.promise)
      .mockReturnValueOnce(currentRequest.promise)
    const { result } = renderHook(() => useTimerScrambleHistory())

    await waitFor(() => expect(result.current.isScramblePending).toBe(false))
    act(() => result.current.handleNextScramble())
    act(() => useTimerSettingsStore.getState().setSelectedEventId('222'))
    await waitFor(() =>
      expect(hookMocks.generateHighQualityScrambleForEvent).toHaveBeenCalledTimes(3),
    )

    await rejectRequest(staleRequest)

    expect(result.current.isScramblePending).toBe(true)
    expect(result.current.scrambleLoadFailed).toBe(false)

    await resolveRequest(currentRequest, scramble('222', 'new event scramble'))

    await waitFor(() =>
      expect(result.current.generatedScramble.scramble).toBe('new event scramble'),
    )
    expect(result.current.isScramblePending).toBe(false)
  })

  it('ignores a queued request fulfillment after an event change starts a newer request', async () => {
    const staleRequest = deferred<GeneratedScramble>()
    const currentRequest = deferred<GeneratedScramble>()
    hookMocks.generateHighQualityScrambleForEvent
      .mockResolvedValueOnce(scramble('333', 'initial scramble'))
      .mockReturnValueOnce(staleRequest.promise)
      .mockReturnValueOnce(currentRequest.promise)
    const { result } = renderHook(() => useTimerScrambleHistory())

    await waitFor(() => expect(result.current.isScramblePending).toBe(false))
    act(() => result.current.handleNextScramble())
    act(() => useTimerSettingsStore.getState().setSelectedEventId('222'))
    await waitFor(() =>
      expect(hookMocks.generateHighQualityScrambleForEvent).toHaveBeenCalledTimes(3),
    )

    await resolveRequest(staleRequest, scramble('333', 'stale queued scramble'))

    expect(result.current.isScramblePending).toBe(true)
    expect(result.current.generatedScramble.scramble).toBe('initial scramble')

    await resolveRequest(currentRequest, scramble('222', 'new event scramble'))

    await waitFor(() =>
      expect(result.current.generatedScramble.scramble).toBe('new event scramble'),
    )
    expect(result.current.isScramblePending).toBe(false)
  })

  it('records a completed solve and queues the next scramble', async () => {
    const nextRequest = deferred<GeneratedScramble>()
    hookMocks.generateHighQualityScrambleForEvent
      .mockResolvedValueOnce(scramble('333', "R U R'"))
      .mockReturnValueOnce(nextRequest.promise)
    const { result } = renderHook(() => useTimerScrambleHistory())
    await waitFor(() => expect(result.current.isScramblePending).toBe(false))
    vi.spyOn(Date, 'now').mockReturnValue(10_000)
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(
      '00000000-0000-4000-8000-000000000020',
    )

    act(() => {
      result.current.handleAttemptStart()
      result.current.handleSolveComplete(1_500, 'plus2')
    })

    const recordedSolve = activeSession()?.solves[0]
    expect(recordedSolve).toMatchObject({
      endedAt: 10_000,
      eventId: '333',
      finalTimeMs: 3_500,
      penalty: 'plus2',
      rawTimeMs: 1_500,
      scramble: "R U R'",
      startedAt: 8_500,
    })
    expect(recordedSolve?.id).toBe('solve-00000000-0000-4000-8000-000000000020')
    expect(result.current.lastCompletedSolveId).toBe(recordedSolve?.id)
    expect(result.current.isScramblePending).toBe(true)

    await resolveRequest(nextRequest, scramble('333', 'next scramble'))
    await waitFor(() => expect(result.current.generatedScramble.scramble).toBe('next scramble'))
  })

  it('records against the immutable session, event, and scramble captured at attempt start', async () => {
    hookMocks.generateHighQualityScrambleForEvent
      .mockResolvedValueOnce(scramble('333', 'captured scramble'))
      .mockResolvedValue(scramble('333', 'next scramble'))
    const { result, rerender } = renderHook(({ locked }) => useTimerScrambleHistory(locked), {
      initialProps: { locked: false },
    })
    await waitFor(() => expect(result.current.isScramblePending).toBe(false))

    act(() => result.current.handleAttemptStart())
    rerender({ locked: true })

    act(() => {
      useTimerStore.getState().createSession('Concurrent session', '222')
      useTimerSettingsStore.getState().setSelectedEventId('222')
      result.current.handleNextScramble()
      result.current.handleSolveComplete(1_000, 'ok')
    })

    const defaultSession = useTimerStore
      .getState()
      .sessions.find((session) => session.id === 'timer-session-default')
    const concurrentSession = useTimerStore
      .getState()
      .sessions.find((session) => session.name === 'Concurrent session')

    expect(defaultSession?.solves).toEqual([
      expect.objectContaining({ eventId: '333', scramble: 'captured scramble' }),
    ])
    expect(concurrentSession?.solves).toEqual([])
    expect(hookMocks.generateHighQualityScrambleForEvent).toHaveBeenCalledTimes(2)
  })

  it('does not regenerate the selected event only because interaction unlocks', async () => {
    hookMocks.generateHighQualityScrambleForEvent.mockResolvedValue(scramble('333', 'scramble'))
    const { rerender } = renderHook(({ locked }) => useTimerScrambleHistory(locked), {
      initialProps: { locked: false },
    })
    await waitFor(() => {
      expect(hookMocks.generateHighQualityScrambleForEvent).toHaveBeenCalledTimes(1)
    })

    rerender({ locked: true })
    rerender({ locked: false })

    expect(hookMocks.generateHighQualityScrambleForEvent).toHaveBeenCalledTimes(1)
  })

  it('surfaces successful and failed clipboard writes through state and toasts', async () => {
    hookMocks.generateHighQualityScrambleForEvent.mockResolvedValue(scramble('333', 'R U'))
    hookMocks.copyToClipboard.mockResolvedValueOnce(true).mockResolvedValueOnce(false)
    const { result } = renderHook(() => useTimerScrambleHistory())
    await waitFor(() => expect(result.current.isScramblePending).toBe(false))

    await act(async () => result.current.handleCopyScramble())

    expect(hookMocks.copyToClipboard).toHaveBeenLastCalledWith('R U')
    expect(result.current.copied).toBe(true)
    expect(hookMocks.showToast).toHaveBeenNthCalledWith(1, {
      title: 'Copied',
      tone: 'success',
    })

    await act(async () => result.current.handleCopyScramble())

    expect(result.current.copied).toBe(false)
    expect(hookMocks.showToast).toHaveBeenNthCalledWith(2, {
      title: 'Could not copy scramble',
      tone: 'error',
    })
  })
})

function activeSession() {
  const { activeSessionId, sessions } = useTimerStore.getState()
  return sessions.find((session) => session.id === activeSessionId)
}

function scramble(eventId: string, value: string): GeneratedScramble {
  return {
    event: scrambleEventById(eventId),
    scramble: value,
  }
}

function deferred<T>() {
  let rejectPromise!: (reason?: unknown) => void
  let resolvePromise!: (value: T) => void
  const promise = new Promise<T>((resolve, reject) => {
    rejectPromise = reject
    resolvePromise = resolve
  })

  return { promise, reject: rejectPromise, resolve: resolvePromise }
}

async function resolveRequest<T>(request: ReturnType<typeof deferred<T>>, value: T) {
  await act(async () => {
    request.resolve(value)
    await request.promise
  })
}

async function rejectRequest<T>(request: ReturnType<typeof deferred<T>>) {
  await act(async () => {
    request.reject(new Error('stale failure'))

    try {
      await request.promise
    } catch {
      // The hook observes and ignores this rejection because a newer request owns the state.
    }
  })
}
