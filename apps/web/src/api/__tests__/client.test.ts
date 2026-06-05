import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ApiRequestError,
  apiRequest,
  apiUrl,
  postJson,
  postJsonResponse,
} from '../client'

describe('api client', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch')
  })

  it('builds API URLs with or without a leading slash', () => {
    expect(apiUrl('health')).toBe('http://127.0.0.1:8787/health')
    expect(apiUrl('/health')).toBe('http://127.0.0.1:8787/health')
  })

  it('returns JSON payloads and adds JSON headers', async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    )

    await expect(apiRequest('/health')).resolves.toEqual({ ok: true })
    const [, init] = fetchMock.mock.calls[0]

    expect(fetchMock.mock.calls[0][0]).toBe('http://127.0.0.1:8787/health')
    expect(new Headers(init?.headers).get('content-type')).toBe('application/json')
  })

  it('posts JSON bodies', async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    )

    await postJson('/solve-notation', { moves: 'R' })
    const [, init] = fetchMock.mock.calls[0]

    expect(init?.body).toBe(JSON.stringify({ moves: 'R' }))
    expect(init?.method).toBe('POST')
  })

  it('passes request options through POST helpers', async () => {
    const controller = new AbortController()
    const fetchMock = vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    )

    await postJsonResponse('/scan/analyze-face', { image: 'scan' }, {
      headers: { 'x-scan-preview': '1' },
      signal: controller.signal,
    })
    const [, init] = fetchMock.mock.calls[0]

    expect(init?.signal).toBe(controller.signal)
    expect(new Headers(init?.headers).get('x-scan-preview')).toBe('1')
    expect(init?.body).toBe(JSON.stringify({ image: 'scan' }))
    expect(init?.method).toBe('POST')
  })

  it('throws ApiRequestError with payload messages for non-ok responses', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: ['Invalid', 'Scramble'] }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
        statusText: 'Bad Request',
      }),
    )

    await expect(apiRequest('/solve-notation')).rejects.toMatchObject({
      message: 'Invalid, Scramble',
      name: 'ApiRequestError',
      status: 400,
    } satisfies Partial<ApiRequestError>)
  })

  it('keeps HTTP metadata for response helpers', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response('not-json', {
        status: 503,
        statusText: 'Service Unavailable',
      }),
    )

    await expect(postJsonResponse('/solve-notation', { moves: 'R' })).resolves.toMatchObject({
      httpOk: false,
      payload: undefined,
      requestElapsedMs: expect.any(Number),
      status: 503,
      statusText: 'Service Unavailable',
    })
  })

  it('uses string payload messages and fallback status text for errors', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'String failure' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
        statusText: 'Bad Request',
      }),
    )

    await expect(apiRequest('/solve-notation')).rejects.toThrow('String failure')

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({}), {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
        statusText: 'Server Error',
      }),
    )

    await expect(apiRequest('/solve-notation')).rejects.toThrow('Server Error')
  })

  it('keeps caller-provided content-type headers', async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    )

    await apiRequest('/health', { headers: { 'content-type': 'text/plain' } })
    const [, init] = fetchMock.mock.calls[0]

    expect(new Headers(init?.headers).get('content-type')).toBe('text/plain')
  })
})
