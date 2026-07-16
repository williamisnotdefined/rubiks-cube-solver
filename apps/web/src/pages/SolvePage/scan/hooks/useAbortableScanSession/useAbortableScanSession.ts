import { useEffect, useRef, useState } from 'react'
import {
  useSolveScanSession,
  type ScanSessionResult,
  type SolveScanSessionVariables,
} from '@api/scan'

export function useAbortableScanSession() {
  const mutation = useSolveScanSession()
  const controllerRef = useRef<AbortController | undefined>(undefined)
  const requestIdRef = useRef(0)
  const revisionRef = useRef(0)
  const mountedRef = useRef(true)
  const [pending, setPending] = useState(false)

  function invalidate() {
    revisionRef.current += 1
    controllerRef.current?.abort()
    controllerRef.current = undefined
    if (mountedRef.current) {
      setPending(false)
    }
  }

  async function submit(
    variables: Omit<SolveScanSessionVariables, 'requestId' | 'revision' | 'signal'>,
  ): Promise<ScanSessionResult | undefined> {
    controllerRef.current?.abort()
    const controller = new AbortController()
    const requestId = requestIdRef.current + 1
    const revision = revisionRef.current
    requestIdRef.current = requestId
    controllerRef.current = controller
    setPending(true)

    try {
      const result = await mutation.mutateAsync({
        ...variables,
        requestId,
        revision,
        signal: controller.signal,
      })

      if (
        controller.signal.aborted ||
        requestIdRef.current !== requestId ||
        revisionRef.current !== revision
      ) {
        return undefined
      }

      return result
    } catch (error) {
      if (controller.signal.aborted) {
        return undefined
      }
      throw error
    } finally {
      if (requestIdRef.current === requestId && revisionRef.current === revision) {
        controllerRef.current = undefined
        if (mountedRef.current) {
          setPending(false)
        }
      }
    }
  }

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      controllerRef.current?.abort()
    }
  }, [])

  return { invalidate, pending: pending || mutation.isPending, submit }
}
