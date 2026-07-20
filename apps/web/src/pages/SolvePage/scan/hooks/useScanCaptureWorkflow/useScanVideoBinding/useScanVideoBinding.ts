import { useEffect, useRef, useState, type MutableRefObject } from 'react'

export function useScanVideoBinding(cameraStream: MediaStream | undefined, resetKey: unknown) {
  const videoElementRef = useRef<HTMLVideoElement | null>(null)
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null)
  // The dialog portal can mount the video after this hook's first effect.
  const [videoRef] = useState<MutableRefObject<HTMLVideoElement | null>>(
    () => ({
      get current() {
        return videoElementRef.current
      },
      set current(video) {
        if (videoElementRef.current !== video) {
          videoElementRef.current = video
          setVideoElement(video)
        }
      },
    }),
  )

  useEffect(() => {
    if (cameraStream === undefined || videoElement === null) {
      return
    }

    bindCameraStream(videoElement, cameraStream)

    return () => {
      clearCameraStream(videoElement, cameraStream)
    }
  }, [cameraStream, resetKey, videoElement])

  return { videoElementRef, videoRef }
}

function bindCameraStream(video: HTMLVideoElement, cameraStream: MediaStream) {
  video.srcObject = cameraStream
  void video.play().catch(() => undefined)
}

function clearCameraStream(video: HTMLVideoElement, cameraStream: MediaStream) {
  if (video.srcObject !== cameraStream) {
    return
  }

  try {
    video.pause()
  } catch {
    // Some test environments do not implement media playback controls.
  }
  video.srcObject = null
}
