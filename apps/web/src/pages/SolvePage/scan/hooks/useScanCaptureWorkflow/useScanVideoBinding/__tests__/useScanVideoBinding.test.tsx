import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useScanVideoBinding } from '../useScanVideoBinding'

describe('useScanVideoBinding', () => {
  it('cleans up the previous binding before attaching a replacement stream', () => {
    const firstStream = {} as MediaStream
    const replacementStream = {} as MediaStream
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    Object.defineProperty(HTMLMediaElement.prototype, 'srcObject', {
      configurable: true,
      value: null,
      writable: true,
    })
    const { rerender, unmount } = render(<VideoBindingHarness stream={firstStream} />)
    const boundVideo = screen.getByTestId('camera-video') as HTMLVideoElement

    expect(boundVideo.srcObject).toBe(firstStream)

    rerender(<VideoBindingHarness stream={replacementStream} />)

    expect(pause).toHaveBeenCalledOnce()
    expect(boundVideo.srcObject).toBe(replacementStream)
    expect(play).toHaveBeenCalledTimes(2)

    unmount()

    expect(pause).toHaveBeenCalledTimes(2)
    expect(boundVideo.srcObject).toBeNull()
  })
})

function VideoBindingHarness({ stream }: { stream: MediaStream }) {
  const { videoRef } = useScanVideoBinding(stream, 'front')

  return (
    <video data-testid='camera-video' ref={videoRef}>
      <track kind='captions' />
    </video>
  )
}
