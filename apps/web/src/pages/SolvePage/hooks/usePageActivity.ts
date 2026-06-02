import { useEffect, useState } from 'react'

export function usePageActivity(): boolean {
  const [active, setActive] = useState(getInitialPageActivity)

  useEffect(() => {
    function activateIfVisible() {
      setActive(document.visibilityState === 'visible')
    }

    function handleVisibilityChange() {
      setActive(document.visibilityState === 'visible')
    }

    function deactivate() {
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
    }
  }, [])

  return active
}

function getInitialPageActivity(): boolean {
  return document.visibilityState === 'visible' && document.hasFocus()
}
