import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import i18n from '@src/i18n/i18n'

void i18n.changeLanguage('en');

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

if (!globalThis.requestAnimationFrame) {
  globalThis.requestAnimationFrame = (callback) =>
    window.setTimeout(() => callback(performance.now()), 0)
}

if (!globalThis.cancelAnimationFrame) {
  globalThis.cancelAnimationFrame = (handle) => window.clearTimeout(handle)
}

if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  })
}

if (!window.ResizeObserver) {
  window.ResizeObserver = class MockResizeObserver implements ResizeObserver {
    disconnect() {}
    observe() {}
    unobserve() {}
  }
}

if (!HTMLElement.prototype.hasPointerCapture) {
  Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
    configurable: true,
    value: () => false,
  })
}

if (!HTMLElement.prototype.releasePointerCapture) {
  Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
    configurable: true,
    value: () => undefined,
  })
}

if (!HTMLElement.prototype.setPointerCapture) {
  Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
    configurable: true,
    value: () => undefined,
  })
}

if (!HTMLElement.prototype.scrollIntoView) {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: () => undefined,
  })
}

if (!window.IntersectionObserver) {
  window.IntersectionObserver = class MockIntersectionObserver implements IntersectionObserver {
    readonly root = null
    readonly rootMargin = ''
    readonly thresholds = []

    disconnect() {}
    observe() {}
    takeRecords() {
      return []
    }
    unobserve() {}
  }
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
