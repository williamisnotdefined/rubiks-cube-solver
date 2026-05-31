export type CapturedScanImage = {
  capturedAt: number
  height: number
  photoDataUrl: string
  source: ScanCaptureSource
  width: number
}

export type ScanCaptureSource = 'canvas' | 'image_capture'

type BrowserImageCapture = {
  takePhoto: () => Promise<Blob>
}

type BrowserImageCaptureConstructor = new (track: MediaStreamTrack) => BrowserImageCapture

type WindowWithImageCapture = Window & {
  ImageCapture?: BrowserImageCaptureConstructor
}

const maxCaptureImageSize = 1280
const maxPreviewImageSize = 480
const maxFinalDataUrlLength = 1_800_000

export async function captureScanImage(
  video: HTMLVideoElement,
  stream?: MediaStream,
): Promise<CapturedScanImage | undefined> {
  const imageCaptureResult = await captureImageCaptureFrame(stream)

  return imageCaptureResult ?? captureScanFrame(video, maxCaptureImageSize, 0.9, 'canvas')
}

export function captureScanPreviewImage(video: HTMLVideoElement): CapturedScanImage | undefined {
  return captureScanFrame(video, maxPreviewImageSize, 0.62, 'canvas')
}

async function captureImageCaptureFrame(
  stream: MediaStream | undefined,
): Promise<CapturedScanImage | undefined> {
  const [track] = stream?.getVideoTracks() ?? []
  const ImageCaptureConstructor = (window as WindowWithImageCapture).ImageCapture

  if (track === undefined || ImageCaptureConstructor === undefined) {
    return undefined
  }

  try {
    const blob = await new ImageCaptureConstructor(track).takePhoto()
    return await captureBlobFrame(blob)
  } catch {
    return undefined
  }
}

async function captureBlobFrame(blob: Blob): Promise<CapturedScanImage | undefined> {
  const objectUrl = URL.createObjectURL(blob)
  const image = document.createElement('img')

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Could not decode captured photo.'))
      image.src = objectUrl
    })

    const width = image.naturalWidth || image.width
    const height = image.naturalHeight || image.height

    return captureSquareImage(image, width, height, maxCaptureImageSize, 0.92, 'image_capture')
  } catch {
    return undefined
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function captureScanFrame(
  video: HTMLVideoElement,
  maxImageSize: number,
  jpegQuality: number,
  source: ScanCaptureSource,
): CapturedScanImage | undefined {
  return captureSquareImage(video, video.videoWidth, video.videoHeight, maxImageSize, jpegQuality, source)
}

function captureSquareImage(
  image: CanvasImageSource,
  width: number,
  height: number,
  maxImageSize: number,
  jpegQuality: number,
  source: ScanCaptureSource,
): CapturedScanImage | undefined {

  if (width === 0 || height === 0) {
    return undefined
  }

  const sourceSize = Math.min(width, height)
  const outputSize = Math.min(maxImageSize, sourceSize)
  const sourceX = Math.floor((width - sourceSize) / 2)
  const sourceY = Math.floor((height - sourceSize) / 2)
  const canvas = document.createElement('canvas')
  canvas.width = outputSize
  canvas.height = outputSize
  const context = canvas.getContext('2d')

  if (context === null) {
    return undefined
  }

  context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, outputSize, outputSize)
  const encoded = encodeCanvasJpeg(canvas, jpegQuality)

  return {
    capturedAt: Date.now(),
    height: encoded.height,
    photoDataUrl: encoded.photoDataUrl,
    source,
    width: encoded.width,
  }
}

function encodeCanvasJpeg(
  canvas: HTMLCanvasElement,
  initialQuality: number,
): { height: number; photoDataUrl: string; width: number } {
  let workingCanvas = canvas
  let quality = initialQuality
  let photoDataUrl = workingCanvas.toDataURL('image/jpeg', quality)

  for (let attempt = 0; attempt < 8 && photoDataUrl.length > maxFinalDataUrlLength; attempt += 1) {
    if (quality > 0.74) {
      quality = Math.max(0.72, quality - 0.08)
    } else if (workingCanvas.width > 640) {
      workingCanvas = resizeCanvas(workingCanvas, Math.max(640, Math.floor(workingCanvas.width * 0.85)))
      quality = 0.82
    } else {
      break
    }

    photoDataUrl = workingCanvas.toDataURL('image/jpeg', quality)
  }

  return {
    height: workingCanvas.height,
    photoDataUrl,
    width: workingCanvas.width,
  }
}

function resizeCanvas(sourceCanvas: HTMLCanvasElement, outputSize: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = outputSize
  canvas.height = outputSize
  const context = canvas.getContext('2d')

  if (context === null) {
    return sourceCanvas
  }

  context.drawImage(sourceCanvas, 0, 0, sourceCanvas.width, sourceCanvas.height, 0, 0, outputSize, outputSize)

  return canvas
}
