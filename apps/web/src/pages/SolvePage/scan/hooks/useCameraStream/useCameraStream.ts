import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

type CameraStreamState =
  | { status: 'idle' | 'loading' }
  | {
      capabilities?: MediaTrackCapabilities
      settings?: MediaTrackSettings
      status: 'ready'
      stream: MediaStream
    }
  | { status: 'error'; message: string }

export function useCameraStream(active: boolean): CameraStreamState {
  const { t } = useTranslation()
  const [state, setState] = useState<CameraStreamState>({ status: 'idle' })

  useEffect(() => {
    if (!active) {
      return undefined
    }

    let cancelled = false
    let stream: MediaStream | undefined

    async function openCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState({ status: 'error', message: t('scan.live.cameraUnavailable') })
        return
      }

      setState({ status: 'loading' })

      try {
        const nextStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            height: { ideal: 1080 },
            width: { ideal: 1920 },
          },
        })
        stream = nextStream

        if (cancelled) {
          stopMediaStream(nextStream)
          return
        }

        const [videoTrack] = nextStream.getVideoTracks()

        setState({
          capabilities: videoTrack?.getCapabilities?.(),
          settings: videoTrack?.getSettings(),
          status: 'ready',
          stream: nextStream,
        })
      } catch {
        if (!cancelled) {
          setState({
            status: 'error',
            message: t('scan.live.cameraDenied'),
          })
        }
      }
    }

    void openCamera()

    return () => {
      cancelled = true
      stopMediaStream(stream)
    }
  }, [active, t])

  return active ? state : { status: 'idle' }
}

function stopMediaStream(stream: MediaStream | undefined) {
  stream?.getTracks().forEach((track) => track.stop())
}
