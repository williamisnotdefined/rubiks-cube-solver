import type { WcaExportClient } from '../../../infra/http/wca-export-client.js'
import type { Clock } from '../../../shared/time/clock.js'
import type { DatasetMetadata } from '../domain/dataset-metadata.js'
import type { WcaExportMetadata } from '../domain/export-metadata.js'
import type { ImportRunReason, ImportRunRecord } from '../domain/import-run.js'
import type { DatasetRepository, ImportRunRepository } from '../repositories/wca-data.repositories.js'
import type { WcaImportExecutionLock } from './import-execution-lock.js'
import type { WcaSyncCycleResult, WcaSyncCycleService } from './wca-sync-cycle.service.js'

export type SyncWcaExportInput = {
  force: boolean
  reason: ImportRunReason
}

export type SyncWcaExportResult =
  | {
    status: 'already_running'
  }
  | {
    activeDataset: DatasetMetadata
    importRun: ImportRunRecord
    remote: WcaExportMetadata
    status: 'skipped'
  }
  | {
    activeDataset: DatasetMetadata | null
    remote: WcaExportMetadata
    status: 'new_export_detected'
  }
  | (WcaSyncCycleResult & {
    activeDataset: DatasetMetadata | null
    remote: WcaExportMetadata
  })

export type SyncWcaExportService = ReturnType<typeof createSyncWcaExportService>

type SyncWcaExportServiceDeps = {
  clock: Clock
  datasets: DatasetRepository
  exportClient: WcaExportClient
  importLock?: WcaImportExecutionLock
  importRuns: ImportRunRepository
  syncCycle?: WcaSyncCycleService
}

export function createSyncWcaExportService({ clock, datasets, exportClient, importLock, importRuns, syncCycle }: SyncWcaExportServiceDeps) {
  return {
    async execute(input: SyncWcaExportInput): Promise<SyncWcaExportResult> {
      const executeSync = async (): Promise<Exclude<SyncWcaExportResult, { status: 'already_running' }>> => {
        const remote = await exportClient.getPublicExportMetadata()
        const activeDataset = await datasets.getActiveDataset()

        if (!input.force && activeDataset !== null && sameExportDate(activeDataset.exportDate, remote.exportDate)) {
          const importRun = await importRuns.recordSkipped({
            log: { activeDatasetId: activeDataset.id },
            now: clock.now(),
            reason: input.reason,
            remote,
          })

          return { activeDataset, importRun, remote, status: 'skipped' }
        }

        if (syncCycle === undefined) {
          return { activeDataset, remote, status: 'new_export_detected' }
        }

        const result = await syncCycle.execute({ activeDataset, reason: input.reason, remote })
        return { activeDataset, remote, ...result }
      }

      if (importLock === undefined) {
        return executeSync()
      }

      return await importLock.executeExclusive(executeSync) ?? { status: 'already_running' }
    },
  }
}

function sameExportDate(activeExportDate: string, remoteExportDate: string): boolean {
  return Date.parse(activeExportDate) === Date.parse(remoteExportDate)
}
