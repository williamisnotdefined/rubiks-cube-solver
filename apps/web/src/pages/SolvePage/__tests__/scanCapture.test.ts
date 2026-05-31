import { beforeEach, describe, expect, it, vi } from 'vitest'
import { captureScanImage, captureScanPreviewImage } from '../scanCapture'

const drawImage = vi.fn()

describe('scan capture helpers', () => {
  beforeEach(() => {
    drawImage.mockReset()
    vi.spyOn(Date, 'now').mockReturnValue(123)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/jpeg;base64,capture',
    )
  })

  it('captures a high-quality square final frame from the video fallback', async () => {
    const video = videoElementWithSize(1920, 1080)

    await expect(captureScanImage(video)).resolves.toMatchObject({
      capturedAt: 123,
      height: 1080,
      photoDataUrl: 'data:image/jpeg;base64,capture',
      source: 'canvas',
      width: 1080,
    })
    expect(drawImage).toHaveBeenCalledWith(video, 420, 0, 1080, 1080, 0, 0, 1080, 1080)
    expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.9)
  })

  it('keeps preview capture smaller and lower quality', () => {
    const video = videoElementWithSize(1280, 720)

    expect(captureScanPreviewImage(video)).toMatchObject({
      height: 480,
      photoDataUrl: 'data:image/jpeg;base64,capture',
      source: 'canvas',
      width: 480,
    })
    expect(drawImage).toHaveBeenCalledWith(video, 280, 0, 720, 720, 0, 0, 480, 480)
    expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.62)
  })

  it('returns undefined when the video has no readable frame', async () => {
    const video = videoElementWithSize(0, 720)

    await expect(captureScanImage(video)).resolves.toBeUndefined()
    expect(captureScanPreviewImage(video)).toBeUndefined()
    expect(drawImage).not.toHaveBeenCalled()
  })
})

function videoElementWithSize(width: number, height: number): HTMLVideoElement {
  const video = document.createElement('video')
  Object.defineProperties(video, {
    videoHeight: { configurable: true, value: height },
    videoWidth: { configurable: true, value: width },
  })

  return video
}
