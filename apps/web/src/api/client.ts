export const defaultApiBaseUrl = 'http://127.0.0.1:8787'

export type ApiJsonResponse<TResponse> = {
  payload: TResponse
  httpOk: boolean
  requestElapsedMs: number
  status: number
  statusText: string
}

export class ApiRequestError extends Error {
  readonly payload: unknown
  readonly status: number

  constructor(message: string, status: number, payload: unknown) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.payload = payload
  }
}

export function apiBaseUrl(): string {
  const configuredApiUrl = import.meta.env.VITE_RUBIKS_API_URL

  if (configuredApiUrl !== undefined) {
    return configuredApiUrl
  }

  if (import.meta.env.PROD && typeof window !== 'undefined') {
    return window.location.origin
  }

  return defaultApiBaseUrl
}

export function apiUrl(path: string): string {
  return `${apiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`
}

export async function apiRequest<TResponse>(
  path: string,
  options: RequestInit = {},
): Promise<TResponse> {
  const result = await apiJsonResponse<TResponse>(path, options)

  if (!result.httpOk) {
    throw new ApiRequestError(
      errorMessageFromPayload(result.payload, result.statusText),
      result.status,
      result.payload,
    )
  }

  return result.payload
}

export async function apiJsonResponse<TResponse>(
  path: string,
  options: RequestInit = {},
): Promise<ApiJsonResponse<TResponse>> {
  const startedAt = nowMs()
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: jsonHeaders(options.headers),
  })
  const payload = await responseJson<TResponse>(response)
  const requestElapsedMs = Math.max(0, Math.round(nowMs() - startedAt))

  return {
    payload,
    httpOk: response.ok,
    requestElapsedMs,
    status: response.status,
    statusText: response.statusText,
  }
}

export function postJson<TResponse>(path: string, body: unknown, options: RequestInit = {}) {
  return apiRequest<TResponse>(path, {
    ...options,
    body: JSON.stringify(body),
    method: 'POST',
  })
}

export function postJsonResponse<TResponse>(path: string, body: unknown, options: RequestInit = {}) {
  return apiJsonResponse<TResponse>(path, {
    ...options,
    body: JSON.stringify(body),
    method: 'POST',
  })
}

function jsonHeaders(headers: HeadersInit | undefined): Headers {
  const nextHeaders = new Headers(headers)
  if (!nextHeaders.has('content-type')) {
    nextHeaders.set('content-type', 'application/json')
  }

  return nextHeaders
}

async function responseJson<TResponse>(response: Response): Promise<TResponse> {
  return response.json().catch(() => undefined) as Promise<TResponse>
}

function errorMessageFromPayload(payload: unknown, fallback: string): string {
  if (isRecord(payload)) {
    const message = payload.message

    if (typeof message === 'string' && message.length > 0) {
      return message
    }

    if (Array.isArray(message)) {
      const messages = message.filter(
        (value): value is string => typeof value === 'string' && value.length > 0,
      )
      if (messages.length > 0) {
        return messages.join(', ')
      }
    }
  }

  return fallback
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function nowMs(): number {
  return typeof globalThis.performance?.now === 'function'
    ? globalThis.performance.now()
    : Date.now()
}
