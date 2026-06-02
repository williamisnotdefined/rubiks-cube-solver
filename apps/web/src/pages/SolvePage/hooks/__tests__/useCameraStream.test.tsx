import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useCameraStream } from '../useCameraStream'

describe('useCameraStream', () => {
  it('stops camera tracks when unmounted after the stream is ready', async () => {
    const { stop, stream } = createCameraStream()
    const getUserMedia = vi.fn().mockResolvedValue(stream)
    mockGetUserMedia(getUserMedia)

    const { result, unmount } = renderHook(() => useCameraStream(true))

    await waitFor(() => expect(result.current.status).toBe('ready'))

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
    getCapabilities: vi.fn(() => ({})),
    getSettings: vi.fn(() => ({})),
    stop,
  } as unknown as MediaStreamTrack
  const stream = {
    getTracks: vi.fn(() => [track]),
    getVideoTracks: vi.fn(() => [track]),
  } as unknown as MediaStream

  return { stop, stream }
}
