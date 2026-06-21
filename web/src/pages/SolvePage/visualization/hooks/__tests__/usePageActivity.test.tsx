import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePageActivity } from '../usePageActivity'

describe('usePageActivity', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    setVisibilityState('visible')
  })

  it('starts active when the page is visible and focused', () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(true)
    setVisibilityState('visible')

    const { result } = renderHook(() => usePageActivity())

    expect(result.current).toBe(true)
  })

  it('becomes inactive when the window blurs', () => {
    const hasFocus = vi.spyOn(document, 'hasFocus').mockReturnValue(true)
    setVisibilityState('visible')
    const { result } = renderHook(() => usePageActivity())

    act(() => {
      hasFocus.mockReturnValue(false)
      window.dispatchEvent(new Event('blur'))
    })

    expect(result.current).toBe(false)
  })

  it('becomes inactive when the document is hidden', () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(true)
    setVisibilityState('visible')
    const { result } = renderHook(() => usePageActivity())

    act(() => {
      setVisibilityState('hidden')
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(result.current).toBe(false)
  })

  it('becomes active again when the page is visible and focused', () => {
    const hasFocus = vi.spyOn(document, 'hasFocus').mockReturnValue(false)
    setVisibilityState('hidden')
    const { result } = renderHook(() => usePageActivity())

    act(() => {
      hasFocus.mockReturnValue(true)
      setVisibilityState('visible')
      window.dispatchEvent(new Event('focus'))
    })

    expect(result.current).toBe(true)
  })

  it('becomes active when the tab becomes visible before focus is reliable', () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(false)
    setVisibilityState('hidden')
    const { result } = renderHook(() => usePageActivity())

    act(() => {
      setVisibilityState('visible')
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(result.current).toBe(true)
  })
})

function setVisibilityState(visibilityState: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: visibilityState,
  })
}
