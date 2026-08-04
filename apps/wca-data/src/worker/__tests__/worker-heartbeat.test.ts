import { describe, expect, it, vi } from 'vitest'
import { startWcaDataWorkerHeartbeat } from '../worker-heartbeat.js'

describe('startWcaDataWorkerHeartbeat', () => {
  it('records immediately, repeats at the configured interval, and stops the timer', async () => {
    let callback: (() => void) | undefined
    const stop = vi.fn()
    const heartbeats = { recordHeartbeat: vi.fn(async () => undefined), getLastHeartbeat: vi.fn(async () => null) }

    const heartbeat = await startWcaDataWorkerHeartbeat({
      clock: { now: () => new Date('2026-08-04T04:30:00Z') },
      heartbeatIntervalMs: 60_000,
      heartbeats,
      schedule: (nextCallback, intervalMs) => {
        expect(intervalMs).toBe(60_000)
        callback = nextCallback
        return stop
      },
    })

    expect(heartbeats.recordHeartbeat).toHaveBeenCalledWith(new Date('2026-08-04T04:30:00Z'))
    callback?.()
    await vi.waitFor(() => expect(heartbeats.recordHeartbeat).toHaveBeenCalledTimes(2))
    heartbeat.stop()
    expect(stop).toHaveBeenCalledOnce()
  })

  it('logs failed heartbeat writes and keeps the scheduler running', async () => {
    const logger = { error: vi.fn(), info: vi.fn() }
    const heartbeats = {
      getLastHeartbeat: vi.fn(async () => null),
      recordHeartbeat: vi.fn(async () => { throw new Error('database unavailable') }),
    }

    await startWcaDataWorkerHeartbeat({ heartbeats, logger, schedule: () => vi.fn() })

    expect(logger.error).toHaveBeenCalledWith('WCA Data worker heartbeat failed.', {
      error: 'database unavailable',
    })
  })
})
