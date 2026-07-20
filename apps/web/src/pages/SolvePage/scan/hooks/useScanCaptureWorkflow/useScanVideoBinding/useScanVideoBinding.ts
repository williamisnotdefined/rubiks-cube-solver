import { useEffect, useRef, useState } from 'react'

export function useScanVideoBinding(cameraStream: MediaStream | undefined, resetKey: unknown) {
  const videoElementRef = useRef<HTMLVideoElement | null>(null)
  const [videoElementRevision, setVideoElementRevision] = useState(0)

  function setVideoRef(video: HTMLVideoElement | null) {
    if (videoElementRef.current === video) {
      return
    }

    videoElementRef.current = video
    setVideoElementRevision((revision) => revision + 1)
  }

  useEffect(() => {
    const video = videoElementRef.current

    if (cameraStream === undefined || video === null) {
      return
    }

    video.srcObject = cameraStream
    void video.play().catch(() => undefined)

    return () => {
      if (video.srcObject === cameraStream) {
        try {
          video.pause()
        } catch {
          // Some test environments do not implement media playback controls.
        }
        video.srcObject = null
      }
    }
  }, [cameraStream, resetKey, videoElementRevision])

  return { setVideoRef, videoElementRef }
}
