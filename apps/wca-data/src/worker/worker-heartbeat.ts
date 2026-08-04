import type { Clock } from '../shared/time/clock.js'
import { systemClock } from '../shared/time/system-clock.js'
import { wcaDataWorkerHeartbeatIntervalMs } from '../modules/wca-data/domain/worker-heartbeat.js'
import type { WorkerHeartbeatRepository } from '../modules/wca-data/repositories/wca-data.repositories.js'
import type { WorkerLogger } from './sync-worker.js'

export type WcaDataWorkerHeartbeat = {
  stop: () => void
}

export type StartWcaDataWorkerHeartbeatInput = {
  clock?: Clock
  heartbeatIntervalMs?: number
  heartbeats: WorkerHeartbeatRepository
  logger?: WorkerLogger
  schedule?: (callback: () => void, intervalMs: number) => () => void
}

const defaultLogger: WorkerLogger = {
  error: (message, metadata) => console.error(message, metadata ?? ''),
  info: (message, metadata) => console.info(message, metadata ?? ''),
}

export async function startWcaDataWorkerHeartbeat({
  clock = systemClock,
  heartbeatIntervalMs = wcaDataWorkerHeartbeatIntervalMs,
  heartbeats,
  logger = defaultLogger,
  schedule = scheduleRepeating,
}: StartWcaDataWorkerHeartbeatInput): Promise<WcaDataWorkerHeartbeat> {
  let recording = false

  const recordHeartbeat = async () => {
    if (recording) {
      return
    }

    recording = true
    try {
      await heartbeats.recordHeartbeat(clock.now())
    } catch (error) {
      logger.error('WCA Data worker heartbeat failed.', {
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      recording = false
    }
  }

  await recordHeartbeat()
  return { stop: schedule(() => void recordHeartbeat(), heartbeatIntervalMs) }
}

function scheduleRepeating(callback: () => void, intervalMs: number): () => void {
  const timer = setInterval(callback, intervalMs)
  timer.unref()

  return () => clearInterval(timer)
}
