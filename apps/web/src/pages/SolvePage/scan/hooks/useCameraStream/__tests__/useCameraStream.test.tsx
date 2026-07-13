import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useCameraStream } from '../useCameraStream'

describe('useCameraStream', () => {
  it('stays idle when inactive', () => {
    const getUserMedia = vi.fn()
    mockGetUserMedia(getUserMedia)

    const { result } = renderHook(() => useCameraStream(false))

    expect(result.current.status).toBe('idle')
    expect(getUserMedia).not.toHaveBeenCalled()
  })

  it('reports unavailable camera APIs', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      mediaDevices: undefined,
    })

    const { result } = renderHook(() => useCameraStream(true))

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current).toMatchObject({
      message: 'Camera access is not available in this browser.',
      status: 'error',
    })
  })

  it('reports rejected camera permission', async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new Error('denied'))
    mockGetUserMedia(getUserMedia)

    const { result } = renderHook(() => useCameraStream(true))

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current).toMatchObject({
      message: 'Camera permission was denied or no camera was found.',
      status: 'error',
    })
  })

  it('ignores a camera rejection after becoming inactive', async () => {
    let rejectCamera!: (error: Error) => void
    const getUserMediaPromise = new Promise<MediaStream>((_, reject) => {
      rejectCamera = reject
    })
    const getUserMedia = vi.fn().mockReturnValue(getUserMediaPromise)
    mockGetUserMedia(getUserMedia)
    const { result, rerender } = renderHook(
      ({ active }) => useCameraStream(active),
      { initialProps: { active: true } },
    )

    await waitFor(() => expect(getUserMedia).toHaveBeenCalledOnce())
    rerender({ active: false })

    await act(async () => {
      rejectCamera(new Error('late camera denial'))
      await getUserMediaPromise.catch(() => undefined)
    })

    expect(result.current.status).toBe('idle')
  })

  it('stops camera tracks when unmounted after the stream is ready', async () => {
    const { stop, stream } = createCameraStream()
    const getUserMedia = vi.fn().mockResolvedValue(stream)
    mockGetUserMedia(getUserMedia)

    const { result, unmount } = renderHook(() => useCameraStream(true))

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current).toMatchObject({
      capabilities: { torch: true },
      settings: { width: 1920 },
      status: 'ready',
      stream,
    })

    unmount()

    expect(stop).toHaveBeenCalledTimes(1)
  })

  it('stops camera tracks if getUserMedia resolves after unmount', async () => {
    const { stop, stream } = createCameraStream()
    let resolveStream!: (stream: MediaStream) => void
    const getUserMediaPromise = new Promise<MediaStream>((resolve) => {
      resolveStream = resolve
    })
    const getUserMedia = vi.fn().mockReturnValue(getUserMediaPromise)
    mockGetUserMedia(getUserMedia)

    const { unmount } = renderHook(() => useCameraStream(true))

    await waitFor(() => expect(getUserMedia).toHaveBeenCalled())
    unmount()

    await act(async () => {
      resolveStream(stream)
      await getUserMediaPromise
    })

    expect(stop).toHaveBeenCalledTimes(1)
  })
})

function mockGetUserMedia(getUserMedia: ReturnType<typeof vi.fn>) {
  vi.stubGlobal('navigator', {
    ...navigator,
    mediaDevices: { getUserMedia },
  })
}

function createCameraStream() {
  const stop = vi.fn()
  const track = {
    getCapabilities: vi.fn(() => ({ torch: true })),
    getSettings: vi.fn(() => ({ width: 1920 })),
    stop,
  } as unknown as MediaStreamTrack
  const stream = {
    getTracks: vi.fn(() => [track]),
    getVideoTracks: vi.fn(() => [track]),
  } as unknown as MediaStream

  return { stop, stream }
}
