import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

if (!globalThis.requestAnimationFrame) {
  globalThis.requestAnimationFrame = (callback) =>
    window.setTimeout(() => callback(performance.now()), 0)
}

if (!globalThis.cancelAnimationFrame) {
  globalThis.cancelAnimationFrame = (handle) => window.clearTimeout(handle)
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
