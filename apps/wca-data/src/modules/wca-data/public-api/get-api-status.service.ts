import type { Clock } from '../../../shared/time/clock.js'
import { systemClock } from '../../../shared/time/system-clock.js'
import type { DatasetMetadata } from '../domain/dataset-metadata.js'
import type { ImportRunRecord } from '../domain/import-run.js'
import { wcaDataWorkerHeartbeatStaleAfterSeconds } from '../domain/worker-heartbeat.js'
import type {
  DatasetMetricsRepository,
  DatasetRecordCounts,
  DatasetRepository,
  ImportRunHistoryRepository,
  WorkerHeartbeatRepository,
} from '../repositories/wca-data.repositories.js'

export type WcaDataSchedulerStatus = {
  cron: string
  enabled: boolean
  timezone: string
}

export type WcaDataApiStatus = {
  activeDataset: DatasetMetadata | null
  lastImportRun: ImportRunRecord | null
  metrics: WcaDataApiStatusMetrics
  scheduler: WcaDataSchedulerStatus
  source: {
    official: false
    provider: 'World Cube Association Results Export'
  }
  status: 'dataset_unavailable' | 'ok'
  worker: WcaDataWorkerHealth
}

export type WcaDataWorkerHealth = {
  lastHeartbeatAt: string | null
  staleAfterSeconds: number
  status: 'healthy' | 'stale' | 'unknown'
}

export type WcaDataApiStatusMetrics = {
  activeDataset: {
    counts: DatasetRecordCounts | null
    exportAgeSeconds: number
    publishDelaySeconds: number
    publishedAgeSeconds: number
  } | null
  checkedAt: string
}

export type GetApiStatusService = ReturnType<typeof createGetApiStatusService>

type GetApiStatusServiceDeps = {
  clock?: Clock
  datasetMetrics?: DatasetMetricsRepository
  datasets: DatasetRepository
  importRuns?: ImportRunHistoryRepository
  scheduler: WcaDataSchedulerStatus
  workerHeartbeats?: WorkerHeartbeatRepository
}

export function createGetApiStatusService({
  clock = systemClock,
  datasetMetrics,
  datasets,
  importRuns,
  scheduler,
  workerHeartbeats,
}: GetApiStatusServiceDeps) {
  return {
    async execute(): Promise<WcaDataApiStatus> {
      const now = clock.now()
      const [activeDataset, lastImportRun, lastWorkerHeartbeat] = await Promise.all([
        datasets.getActiveDataset(),
        importRuns?.getLastImportRun() ?? Promise.resolve(null),
        workerHeartbeats?.getLastHeartbeat() ?? Promise.resolve(null),
      ])
      const activeDatasetMetrics = activeDataset === null
        ? null
        : {
          counts: await datasetCounts(datasetMetrics, activeDataset.id),
          exportAgeSeconds: secondsSince(activeDataset.exportDate, now),
          publishDelaySeconds: secondsBetween(activeDataset.exportDate, activeDataset.publishedAt),
          publishedAgeSeconds: secondsSince(activeDataset.publishedAt, now),
        }

      return {
        activeDataset,
        lastImportRun,
        metrics: {
          activeDataset: activeDatasetMetrics,
          checkedAt: now.toISOString(),
        },
        scheduler,
        source: {
          official: false,
          provider: 'World Cube Association Results Export',
        },
        status: activeDataset === null ? 'dataset_unavailable' : 'ok',
        worker: workerHealth({
          heartbeatAt: lastWorkerHeartbeat,
          now,
          trackingEnabled: workerHeartbeats !== undefined,
        }),
      }
    },
  }
}

function workerHealth({
  heartbeatAt,
  now,
  trackingEnabled,
}: {
  heartbeatAt: string | null
  now: Date
  trackingEnabled: boolean
}): WcaDataWorkerHealth {
  if (!trackingEnabled) {
    return {
      lastHeartbeatAt: null,
      staleAfterSeconds: wcaDataWorkerHeartbeatStaleAfterSeconds,
      status: 'unknown',
    }
  }

  return {
    lastHeartbeatAt: heartbeatAt,
    staleAfterSeconds: wcaDataWorkerHeartbeatStaleAfterSeconds,
    status: heartbeatAt !== null && secondsSince(heartbeatAt, now) <= wcaDataWorkerHeartbeatStaleAfterSeconds
      ? 'healthy'
      : 'stale',
  }
}

async function datasetCounts(datasetMetrics: DatasetMetricsRepository | undefined, datasetId: string): Promise<DatasetRecordCounts | null> {
  return datasetMetrics?.getDatasetCounts(datasetId) ?? null
}

function secondsSince(value: string, now: Date): number {
  return secondsBetween(value, now.toISOString())
}

function secondsBetween(start: string, end: string): number {
  return Math.max(0, Math.floor((Date.parse(end) - Date.parse(start)) / 1000))
}
