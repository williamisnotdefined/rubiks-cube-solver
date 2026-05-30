import { useEffect, useState } from 'react'

type CameraStreamState =
  | { status: 'idle' | 'loading' }
  | { status: 'ready'; stream: MediaStream }
  | { status: 'error'; message: string }

export function useCameraStream(active: boolean): CameraStreamState {
  const [state, setState] = useState<CameraStreamState>({ status: 'idle' })

  useEffect(() => {
    if (!active) {
      setState({ status: 'idle' })
      return undefined
    }

    let cancelled = false
    let stream: MediaStream | undefined

    async function openCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState({ status: 'error', message: 'Camera access is not available in this browser.' })
        return
      }

      setState({ status: 'loading' })

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            height: { ideal: 720 },
            width: { ideal: 1280 },
          },
        })

        if (!cancelled) {
          setState({ status: 'ready', stream })
        }
      } catch {
        if (!cancelled) {
          setState({
            status: 'error',
            message: 'Camera permission was denied or no camera was found.',
          })
        }
      }
    }

    void openCamera()

    return () => {
      cancelled = true
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [active])

  return state
}
