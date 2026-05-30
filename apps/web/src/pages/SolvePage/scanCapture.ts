export type CapturedScanImage = {
  photoDataUrl: string
}

const maxCaptureImageSize = 960

export function captureScanImage(video: HTMLVideoElement): CapturedScanImage | undefined {
  const width = video.videoWidth
  const height = video.videoHeight

  if (width === 0 || height === 0) {
    return undefined
  }

  const sourceSize = Math.min(width, height)
  const outputSize = Math.min(maxCaptureImageSize, sourceSize)
  const sourceX = Math.floor((width - sourceSize) / 2)
  const sourceY = Math.floor((height - sourceSize) / 2)
  const canvas = document.createElement('canvas')
  canvas.width = outputSize
  canvas.height = outputSize
  const context = canvas.getContext('2d')

  if (context === null) {
    return undefined
  }

  context.drawImage(video, sourceX, sourceY, sourceSize, sourceSize, 0, 0, outputSize, outputSize)

  return {
    photoDataUrl: canvas.toDataURL('image/jpeg', 0.82),
  }
}
