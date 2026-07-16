import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ScanSessionResult, SolveScanSessionVariables } from '@api/scan'
import { useAbortableScanSession } from '../useAbortableScanSession'

const mocks = vi.hoisted(() => ({
  isPending: false,
  mutateAsync: vi.fn(),
}))

vi.mock('@api/scan', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@api/scan')>()),
  useSolveScanSession: () => mocks,
}))

describe('useAbortableScanSession', () => {
  beforeEach(() => {
    mocks.isPending = false
    mocks.mutateAsync.mockReset()
  })

  it('aborts and ignores a response after the scan revision changes', async () => {
    let resolveRequest: (result: ScanSessionResult) => void = () => undefined
    mocks.mutateAsync.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve
        }),
    )
    const { result } = renderHook(() => useAbortableScanSession())
    let response: Promise<ScanSessionResult | undefined>

    act(() => {
      response = result.current.submit({ faces: [], maxDepth: 30 })
    })
    const variables = mocks.mutateAsync.mock.calls[0][0] as SolveScanSessionVariables

    act(() => result.current.invalidate())
    expect(variables.signal?.aborted).toBe(true)

    resolveRequest(acceptedResult)
    await expect(response!).resolves.toBeUndefined()
  })

  it('aborts the active request on unmount', () => {
    mocks.mutateAsync.mockReturnValue(new Promise(() => undefined))
    const { result, unmount } = renderHook(() => useAbortableScanSession())

    act(() => {
      void result.current.submit({ faces: [], maxDepth: 30 })
    })
    const variables = mocks.mutateAsync.mock.calls[0][0] as SolveScanSessionVariables
    unmount()

    expect(variables.signal?.aborted).toBe(true)
  })

  it('correlates concurrent submissions and ignores the older response', async () => {
    const resolvers: Array<(result: ScanSessionResult) => void> = []
    mocks.mutateAsync.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvers.push(resolve)
        }),
    )
    const { result } = renderHook(() => useAbortableScanSession())
    let first: Promise<ScanSessionResult | undefined>
    let second: Promise<ScanSessionResult | undefined>

    act(() => {
      first = result.current.submit({ faces: [], maxDepth: 20 })
      second = result.current.submit({ faces: [], maxDepth: 30 })
    })
    const firstVariables = mocks.mutateAsync.mock.calls[0][0] as SolveScanSessionVariables
    const secondVariables = mocks.mutateAsync.mock.calls[1][0] as SolveScanSessionVariables

    expect(firstVariables.signal?.aborted).toBe(true)
    expect(secondVariables.requestId).toBeGreaterThan(firstVariables.requestId!)
    resolvers[0](acceptedResult)
    resolvers[1](acceptedResult)

    await expect(first!).resolves.toBeUndefined()
    await expect(second!).resolves.toBe(acceptedResult)
  })
})

const acceptedResult: ScanSessionResult = {
  manualTargets: [],
  ok: true,
  rescanFaces: [],
  status: 'accepted',
}
