import * as matchers from '@testing-library/jest-dom/matchers'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, expect, vi } from 'vitest'
import i18n from '@src/i18n/i18n'

expect.extend(matchers)

const testLocalStorage = createMemoryStorage()

Object.defineProperty(window, 'localStorage', {
  configurable: true,
  value: testLocalStorage,
})

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: testLocalStorage,
})

;(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

function createMemoryStorage(): Storage {
  const storage = new Map<string, string>()

  return {
    clear() {
      storage.clear()
    },
    getItem(key) {
      return storage.get(String(key)) ?? null
    },
    key(index) {
      return Array.from(storage.keys())[index] ?? null
    },
    get length() {
      return storage.size
    },
    removeItem(key) {
      storage.delete(String(key))
    },
    setItem(key, value) {
      storage.set(String(key), String(value))
    },
  }
}

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

export class TestResizeObserver implements ResizeObserver {
  static instances: TestResizeObserver[] = []
  readonly callback: ResizeObserverCallback
  readonly observedElements = new Set<Element>()

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    TestResizeObserver.instances.push(this)
  }

  disconnect() {
    this.observedElements.clear()
  }

  observe(element: Element) {
    this.observedElements.add(element)
  }

  trigger(entries?: ResizeObserverEntry[]) {
    const observedEntries =
      entries ??
      [...this.observedElements].map(
        (target) =>
          ({
            contentRect: target.getBoundingClientRect(),
            target,
          }) as ResizeObserverEntry,
      )
    this.callback(observedEntries, this)
  }

  unobserve(element: Element) {
    this.observedElements.delete(element)
  }
}

if (!window.ResizeObserver) {
  window.ResizeObserver = TestResizeObserver
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

export class TestIntersectionObserver implements IntersectionObserver {
  static instances: TestIntersectionObserver[] = []
  readonly callback: IntersectionObserverCallback
  readonly observedElements = new Set<Element>()
  readonly root = null
  readonly rootMargin = ''
  readonly scrollMargin = ''
  readonly thresholds = []

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    TestIntersectionObserver.instances.push(this)
  }

  disconnect() {
    this.observedElements.clear()
  }

  observe(element: Element) {
    this.observedElements.add(element)
  }

  takeRecords() {
    return []
  }

  trigger(isIntersecting = true) {
    const entries = [...this.observedElements].map(
      (target) =>
        ({
          isIntersecting,
          target,
        }) as IntersectionObserverEntry,
    )
    this.callback(entries, this)
  }

  unobserve(element: Element) {
    this.observedElements.delete(element)
  }
}

if (!window.IntersectionObserver) {
  window.IntersectionObserver = TestIntersectionObserver
}

beforeEach(async () => {
  testLocalStorage.clear()
  TestResizeObserver.instances = []
  TestIntersectionObserver.instances = []
  await i18n.changeLanguage('en-US')
  document.documentElement.lang = 'en-US'
})

afterEach(async () => {
  cleanup()
  testLocalStorage.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  await i18n.changeLanguage('en-US')
})
