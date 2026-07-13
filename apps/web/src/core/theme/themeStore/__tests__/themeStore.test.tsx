import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  applyThemePreference,
  storedThemePreference,
  themeStorageKey,
  useThemePreferenceSync,
  useThemeStore,
} from '../themeStore'

const originalMatchMedia = window.matchMedia

describe('themeStore', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark', 'light')
    delete document.documentElement.dataset.theme
    useThemeStore.setState({ theme: 'system' })
  })

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: originalMatchMedia,
    })
  })

  it('accepts stored explicit themes and treats other values as system', () => {
    expect(storedThemePreference()).toBe('system')

    localStorage.setItem(themeStorageKey, 'light')
    expect(storedThemePreference()).toBe('light')

    localStorage.setItem(themeStorageKey, 'dark')
    expect(storedThemePreference()).toBe('dark')

    localStorage.setItem(themeStorageKey, 'sepia')
    expect(storedThemePreference()).toBe('system')
  })

  it('persists and applies explicit theme choices through the store', () => {
    document.documentElement.classList.add('dark')

    useThemeStore.getState().setThemePreference('light')

    expect(useThemeStore.getState().theme).toBe('light')
    expect(localStorage.getItem(themeStorageKey)).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(document.documentElement.classList.contains('light')).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('resolves system preference in both light and dark modes without persisting it', () => {
    const mediaQuery = createMediaQuery(false)
    setMatchMedia(mediaQuery)
    localStorage.setItem(themeStorageKey, 'dark')
    document.documentElement.dataset.theme = 'dark'
    document.documentElement.classList.add('dark')

    applyThemePreference('system')

    expect(localStorage.getItem(themeStorageKey)).toBeNull()
    expect(document.documentElement.dataset.theme).toBeUndefined()
    expect(document.documentElement.className).toBe('light')

    mediaQuery.matches = true
    applyThemePreference('system')

    expect(document.documentElement.className).toBe('dark')
  })

  it('falls back to light when matchMedia is unavailable', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: undefined,
    })

    applyThemePreference('system')
    renderHook(() => useThemePreferenceSync())

    expect(document.documentElement.className).toBe('light')
  })

  it('tracks system changes and removes its listener on unmount', () => {
    const mediaQuery = createMediaQuery(false)
    setMatchMedia(mediaQuery)
    const { unmount } = renderHook(() => useThemePreferenceSync())

    expect(document.documentElement.className).toBe('light')
    expect(mediaQuery.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))

    mediaQuery.matches = true
    const changeListener = mediaQuery.addEventListener.mock.calls[0]?.[1]
    act(() => changeListener?.())

    expect(document.documentElement.className).toBe('dark')

    unmount()

    expect(mediaQuery.removeEventListener).toHaveBeenCalledWith('change', changeListener)
  })

  it('does not subscribe to system changes for an explicit theme', () => {
    const mediaQuery = createMediaQuery(true)
    setMatchMedia(mediaQuery)
    useThemeStore.setState({ theme: 'dark' })

    renderHook(() => useThemePreferenceSync())

    expect(document.documentElement.className).toBe('dark')
    expect(mediaQuery.addEventListener).not.toHaveBeenCalled()
  })
})

function createMediaQuery(matches: boolean) {
  return {
    addEventListener: vi.fn(),
    matches,
    removeEventListener: vi.fn(),
  }
}

function setMatchMedia(mediaQuery: ReturnType<typeof createMediaQuery>) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => mediaQuery as unknown as MediaQueryList),
  })
}
