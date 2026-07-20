import { useEffect, useSyncExternalStore } from 'react'
import {
  getVisualizationRegistrationStatus,
  requestVisualizationRegistration,
  retryVisualizationRegistration,
  subscribeToVisualizationRegistration,
  type VisualizationKind,
} from './visualizationRegistration'

export function useVisualizationRegistration(kind: VisualizationKind, requested: boolean) {
  const status = useSyncExternalStore(
    (listener) => subscribeToVisualizationRegistration(kind, listener),
    () => getVisualizationRegistrationStatus(kind),
    () => getVisualizationRegistrationStatus(kind),
  )

  useEffect(() => {
    if (requested && status === 'idle') {
      void requestVisualizationRegistration(kind).catch(() => undefined)
    }
  }, [kind, requested, status])

  function retry() {
    void retryVisualizationRegistration(kind).catch(() => undefined)
  }

  return { retry, status }
}
