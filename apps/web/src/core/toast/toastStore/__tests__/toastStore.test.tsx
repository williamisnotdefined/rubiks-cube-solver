import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useToast, useToastStore } from '../toastStore'

describe('toastStore', () => {
  beforeEach(() => {
    useToastStore.getState().clearToasts()
    vi.spyOn(Date, 'now').mockReturnValue(123)
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.1)
      .mockReturnValueOnce(0.2)
      .mockReturnValueOnce(0.3)
      .mockReturnValueOnce(0.4)
      .mockReturnValueOnce(0.5)
  })

  it('adds toasts with generated ids and a neutral default tone', () => {
    useToastStore.getState().showToast({
      description: 'More detail',
      title: 'Saved',
    })

    expect(useToastStore.getState().toasts).toEqual([
      {
        description: 'More detail',
        id: expect.stringMatching(/^toast-123-/),
        title: 'Saved',
        tone: 'neutral',
      },
    ])
  })

  it('retains only the four newest toasts', () => {
    for (let index = 1; index <= 5; index += 1) {
      useToastStore.getState().showToast({
        title: `Toast ${index}`,
        tone: index === 5 ? 'success' : 'error',
      })
    }

    expect(useToastStore.getState().toasts.map((toast) => toast.title)).toEqual([
      'Toast 2',
      'Toast 3',
      'Toast 4',
      'Toast 5',
    ])
    expect(useToastStore.getState().toasts.at(-1)?.tone).toBe('success')
  })

  it('dismisses a selected toast and clears the queue', () => {
    useToastStore.getState().showToast({ title: 'Keep' })
    useToastStore.getState().showToast({ title: 'Dismiss' })
    const dismissedId = useToastStore.getState().toasts[1]?.id

    useToastStore.getState().dismissToast(dismissedId ?? '')

    expect(useToastStore.getState().toasts.map((toast) => toast.title)).toEqual(['Keep'])

    useToastStore.getState().clearToasts()
    expect(useToastStore.getState().toasts).toEqual([])
  })

  it('exposes showToast through the public hook', () => {
    const { result } = renderHook(() => useToast())

    act(() => result.current({ title: 'Hook toast', tone: 'success' }))

    expect(useToastStore.getState().toasts[0]).toMatchObject({
      title: 'Hook toast',
      tone: 'success',
    })
  })
})
