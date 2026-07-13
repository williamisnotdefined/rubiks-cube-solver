import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useScanVideoBinding } from '../useScanVideoBinding'

describe('useScanVideoBinding', () => {
  it('cleans up the previous binding before attaching a replacement stream', () => {
    const firstStream = {} as MediaStream
    const replacementStream = {} as MediaStream
    const video = document.createElement('video')
    const play = vi.spyOn(video, 'play').mockResolvedValue(undefined)
    const pause = vi.spyOn(video, 'pause').mockImplementation(() => undefined)
    Object.defineProperty(video, 'srcObject', {
      configurable: true,
      value: null,
      writable: true,
    })
    const { result, rerender, unmount } = renderHook(
      ({ stream }) => useScanVideoBinding(stream, 'front'),
      { initialProps: { stream: firstStream } },
    )

    act(() => result.current.setVideoRef(video))
    expect(video.srcObject).toBe(firstStream)

    rerender({ stream: replacementStream })

    expect(pause).toHaveBeenCalledOnce()
    expect(video.srcObject).toBe(replacementStream)
    expect(play).toHaveBeenCalledTimes(2)

    unmount()

    expect(pause).toHaveBeenCalledTimes(2)
    expect(video.srcObject).toBeNull()
  })
})
