import { describe, expect, it, vi } from 'vitest'
import { waitForPaint } from '../waitForPaint'

describe('waitForPaint', () => {
  it('waits for two animation frames', async () => {
    const requestAnimationFrame = vi
      .spyOn(globalThis, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        callback(0)
        return 1
      })

    await waitForPaint()

    expect(requestAnimationFrame).toHaveBeenCalledTimes(2)
  })
})
