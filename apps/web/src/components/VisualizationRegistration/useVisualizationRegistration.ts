import { useCallback, useEffect, useSyncExternalStore } from 'react'
import {
  getVisualizationRegistrationStatus,
  requestVisualizationRegistration,
  retryVisualizationRegistration,
  subscribeToVisualizationRegistration,
  type VisualizationKind,
} from './visualizationRegistration'

export function useVisualizationRegistration(kind: VisualizationKind, requested: boolean) {
  const subscribe = useCallback(
    (listener: () => void) => subscribeToVisualizationRegistration(kind, listener),
    [kind],
  )
  const getSnapshot = useCallback(() => getVisualizationRegistrationStatus(kind), [kind])
  const status = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  useEffect(() => {
    if (requested && status === 'idle') {
      void requestVisualizationRegistration(kind).catch(() => undefined)
    }
  }, [kind, requested, status])

  const retry = useCallback(
    () => void retryVisualizationRegistration(kind).catch(() => undefined),
    [kind],
  )

  return { retry, status }
}
