import { beforeEach, describe, expect, it, vi } from 'vitest'
import { captureScanImage, captureScanPreviewImage } from '../scanCapture'

const drawImage = vi.fn()
const canvasContext = { drawImage } as unknown as CanvasRenderingContext2D

type CanvasGetContextSpy = {
  mockReturnValue(value: CanvasRenderingContext2D | null): CanvasGetContextSpy
  mockReturnValueOnce(value: CanvasRenderingContext2D | null): CanvasGetContextSpy
}

function spyOnCanvasGetContext(): CanvasGetContextSpy {
  return vi.spyOn(HTMLCanvasElement.prototype, 'getContext') as unknown as CanvasGetContextSpy
}

describe('scan capture helpers', () => {
  beforeEach(() => {
    drawImage.mockReset()
    vi.spyOn(Date, 'now').mockReturnValue(123)
    spyOnCanvasGetContext().mockReturnValue(canvasContext)
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

  it('returns undefined when canvas context is unavailable', async () => {
    spyOnCanvasGetContext().mockReturnValue(null)
    const video = videoElementWithSize(640, 480)

    await expect(captureScanImage(video)).resolves.toBeUndefined()
    expect(captureScanPreviewImage(video)).toBeUndefined()
  })

  it('falls back to canvas capture when ImageCapture fails', async () => {
    const video = videoElementWithSize(640, 480)
    const stream = mediaStreamWithTrack()
    vi.stubGlobal(
      'ImageCapture',
      class MockImageCapture {
        takePhoto() {
          throw new Error('camera failed')
        }
      },
    )

    await expect(captureScanImage(video, stream)).resolves.toMatchObject({
      source: 'canvas',
      width: 480,
    })
  })

  it('uses ImageCapture photos when the browser provides them', async () => {
    const originalCreateElement = document.createElement.bind(document)
    const stream = mediaStreamWithTrack()
    const objectUrl = 'blob:scan-photo'
    vi.stubGlobal(
      'ImageCapture',
      class MockImageCapture {
        takePhoto() {
          return Promise.resolve(new Blob(['photo']))
        }
      },
    )
    vi.spyOn(URL, 'createObjectURL').mockReturnValue(objectUrl)
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'img') {
        const image = originalCreateElement('img')
        Object.defineProperties(image, {
          naturalHeight: { configurable: true, value: 900 },
          naturalWidth: { configurable: true, value: 1600 },
        })
        Object.defineProperty(image, 'src', {
          configurable: true,
          set() {
            window.setTimeout(() => image.onload?.(new Event('load')), 0)
          },
        })

        return image
      }

      return originalCreateElement(tagName)
    })

    await expect(captureScanImage(videoElementWithSize(1, 1), stream)).resolves.toMatchObject({
      height: 900,
      source: 'image_capture',
      width: 900,
    })
    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(objectUrl)
    expect(drawImage).toHaveBeenCalledWith(
      expect.any(HTMLImageElement),
      350,
      0,
      900,
      900,
      0,
      0,
      900,
      900,
    )
  })

  it('falls back to decoded image layout size when natural size is unavailable', async () => {
    const originalCreateElement = document.createElement.bind(document)
    const stream = mediaStreamWithTrack()
    vi.stubGlobal(
      'ImageCapture',
      class MockImageCapture {
        takePhoto() {
          return Promise.resolve(new Blob(['photo']))
        }
      },
    )
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:scan-photo')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'img') {
        const image = originalCreateElement('img')
        Object.defineProperties(image, {
          height: { configurable: true, value: 700 },
          naturalHeight: { configurable: true, value: 0 },
          naturalWidth: { configurable: true, value: 0 },
          width: { configurable: true, value: 900 },
        })
        Object.defineProperty(image, 'src', {
          configurable: true,
          set() {
            window.setTimeout(() => image.onload?.(new Event('load')), 0)
          },
        })

        return image
      }

      return originalCreateElement(tagName)
    })

    await expect(captureScanImage(videoElementWithSize(1, 1), stream)).resolves.toMatchObject({
      height: 700,
      source: 'image_capture',
      width: 700,
    })
  })

  it('returns undefined when ImageCapture photo decode fails', async () => {
    const originalCreateElement = document.createElement.bind(document)
    const stream = mediaStreamWithTrack()
    vi.stubGlobal(
      'ImageCapture',
      class MockImageCapture {
        takePhoto() {
          return Promise.resolve(new Blob(['photo']))
        }
      },
    )
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:scan-photo')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'img') {
        const image = originalCreateElement('img')
        Object.defineProperty(image, 'src', {
          configurable: true,
          set() {
            window.setTimeout(() => image.onerror?.(new Event('error')), 0)
          },
        })

        return image
      }

      return originalCreateElement(tagName)
    })

    await expect(captureScanImage(videoElementWithSize(0, 0), stream)).resolves.toBeUndefined()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:scan-photo')
  })

  it('lowers quality and resizes oversized JPEG payloads', async () => {
    const longDataUrl = `data:image/jpeg;base64,${'a'.repeat(1_800_001)}`
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL')
      .mockReturnValueOnce(longDataUrl)
      .mockReturnValueOnce(longDataUrl)
      .mockReturnValueOnce(longDataUrl)
      .mockReturnValueOnce(longDataUrl)
      .mockReturnValueOnce('data:image/jpeg;base64,small')

    await expect(captureScanImage(videoElementWithSize(1600, 1600))).resolves.toMatchObject({
      height: 1088,
      photoDataUrl: 'data:image/jpeg;base64,small',
      width: 1088,
    })
    expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenNthCalledWith(1, 'image/jpeg', 0.9)
    expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenLastCalledWith('image/jpeg', 0.82)
  })

  it('keeps the original canvas when resize context is unavailable', async () => {
    const longDataUrl = `data:image/jpeg;base64,${'a'.repeat(1_800_001)}`
    spyOnCanvasGetContext().mockReturnValueOnce(canvasContext).mockReturnValue(null)
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL')
      .mockReturnValueOnce(longDataUrl)
      .mockReturnValueOnce(longDataUrl)
      .mockReturnValueOnce(longDataUrl)
      .mockReturnValueOnce('data:image/jpeg;base64,still-large-canvas')

    await expect(captureScanImage(videoElementWithSize(1600, 1600))).resolves.toMatchObject({
      height: 1280,
      photoDataUrl: 'data:image/jpeg;base64,still-large-canvas',
      width: 1280,
    })
  })
})

function mediaStreamWithTrack(): MediaStream {
  return {
    getVideoTracks: vi.fn(() => [{} as MediaStreamTrack]),
  } as unknown as MediaStream
}

function videoElementWithSize(width: number, height: number): HTMLVideoElement {
  const video = document.createElement('video')
  Object.defineProperties(video, {
    videoHeight: { configurable: true, value: height },
    videoWidth: { configurable: true, value: width },
  })

  return video
}
