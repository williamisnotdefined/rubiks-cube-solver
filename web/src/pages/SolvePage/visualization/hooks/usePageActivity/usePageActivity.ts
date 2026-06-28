import { useEffect, useState } from 'react'

const initialActivationDelayMs = 6000

export function usePageActivity(): boolean {
  const [active, setActive] = useState(false)

  useEffect(() => {
    let activationTimeout: number | undefined

    function clearActivationTimeout() {
      if (activationTimeout !== undefined) {
        window.clearTimeout(activationTimeout)
        activationTimeout = undefined
      }
    }

    function activateIfVisible() {
      clearActivationTimeout()

      if (document.visibilityState !== 'visible') {
        setActive(false)
        return
      }

      activationTimeout = window.setTimeout(() => {
        setActive(true)
        activationTimeout = undefined
      }, initialActivationDelayMs)
    }

    function handleVisibilityChange() {
      activateIfVisible()
    }

    function deactivate() {
      clearActivationTimeout()
      setActive(false)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', deactivate)
    window.addEventListener('focus', activateIfVisible)
    window.addEventListener('pagehide', deactivate)
    window.addEventListener('pageshow', activateIfVisible)

    activateIfVisible()

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', deactivate)
      window.removeEventListener('focus', activateIfVisible)
      window.removeEventListener('pagehide', deactivate)
      window.removeEventListener('pageshow', activateIfVisible)
      clearActivationTimeout()
    }
  }, [])

  return active
}
