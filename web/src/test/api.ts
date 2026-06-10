import { vi } from 'vitest'

export function mockApiSuccess(payload: unknown, init: ResponseInit = {}) {
  return mockFetchResponse(payload, { status: 200, ...init })
}

export function mockApiError(payload: unknown = { message: 'Request failed' }, status = 400) {
  return mockFetchResponse(payload, { status })
}

export function mockFetchResponse(payload: unknown, init: ResponseInit = {}) {
  const response = new Response(JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  const fetchMock = vi.fn().mockResolvedValue(response)

  vi.spyOn(globalThis, 'fetch').mockImplementation(fetchMock)

  return fetchMock
}
