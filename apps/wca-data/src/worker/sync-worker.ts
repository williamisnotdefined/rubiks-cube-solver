import type { SyncWcaExportResult, SyncWcaExportService } from '../modules/wca-data/application/import/sync-wca-export.service.js'

export const syncWcaExportJobName = 'wca-data.sync-export'
export const syncWcaExportScheduleKey = 'daily-wca-export-sync'

export type SyncWcaExportJobData = {
  force?: boolean
  reason: 'schedule' | 'manual'
}

export type SyncWcaExportJobResult = {
  jobCount: number
  status: 'noop'
} | {
  jobCount: number
  results: Array<{
    jobId: string
    result: SyncWcaExportResult
    status: 'completed'
  }>
  status: 'completed'
}

type BossJob<T> = {
  data: T
  id: string
}

export type WcaDataBoss = {
  createQueue: (name: string, options: Record<string, unknown>) => Promise<void>
  schedule: (name: string, cron: string, data: SyncWcaExportJobData, options: Record<string, unknown>) => Promise<void>
  start: () => Promise<unknown>
  stop: (options?: { graceful?: boolean; timeout?: number }) => Promise<void>
  work: <ReqData, ResData>(name: string, handler: (jobs: BossJob<ReqData>[]) => Promise<ResData>) => Promise<string>
}

export type WcaDataWorker = {
  stop: () => Promise<void>
  workId: string
}

export type WorkerLogger = {
  error: (message: string, metadata?: Record<string, unknown>) => void
  info: (message: string, metadata?: Record<string, unknown>) => void
}

type StartWcaDataWorkerDeps = {
  boss: WcaDataBoss
  logger?: WorkerLogger
  syncCron: string
  syncEnabled: boolean
  syncWcaExport?: SyncWcaExportService
  syncTimezone: string
}

const defaultLogger: WorkerLogger = {
  error: (message, metadata) => console.error(message, metadata ?? ''),
  info: (message, metadata) => console.info(message, metadata ?? ''),
}

export async function startWcaDataWorker({
  boss,
  logger = defaultLogger,
  syncCron,
  syncEnabled,
  syncWcaExport,
  syncTimezone,
}: StartWcaDataWorkerDeps): Promise<WcaDataWorker> {
  await boss.start()
  await boss.createQueue(syncWcaExportJobName, {
    expireInSeconds: 6 * 60 * 60,
    policy: 'singleton',
    retryBackoff: true,
    retryDelay: 5 * 60,
    retryLimit: 3,
  })

  const workId = await boss.work<SyncWcaExportJobData, SyncWcaExportJobResult>(syncWcaExportJobName, async (jobs) => {
    if (syncWcaExport === undefined) {
      logger.info('WCA export sync job received; no sync service is configured for this worker.', {
        jobCount: jobs.length,
        jobIds: jobs.map((job) => job.id),
      })

      return { jobCount: jobs.length, status: 'noop' }
    }

    logger.info('WCA export sync job received.', {
      jobCount: jobs.length,
      jobIds: jobs.map((job) => job.id),
    })

    const results: Array<{ jobId: string; result: SyncWcaExportResult; status: 'completed' }> = []

    for (const job of jobs) {
      try {
        results.push({
          jobId: job.id,
          result: await syncWcaExport.execute({ force: job.data.force ?? false, reason: job.data.reason }),
          status: 'completed',
        })
      } catch (error) {
        logger.error('WCA export sync job failed.', {
          error: error instanceof Error ? error.message : String(error),
          jobId: job.id,
        })

        throw error
      }
    }

    return { jobCount: jobs.length, results, status: 'completed' }
  })

  if (syncEnabled) {
    await boss.schedule(
      syncWcaExportJobName,
      syncCron,
      { reason: 'schedule' },
      {
        key: syncWcaExportScheduleKey,
        retryBackoff: true,
        retryDelay: 5 * 60,
        retryLimit: 3,
        tz: syncTimezone,
      },
    )
  }

  logger.info('WCA Data worker started.', { scheduleKey: syncWcaExportScheduleKey, syncCron, syncEnabled, syncTimezone, workId })

  return {
    stop: () => boss.stop({ graceful: true, timeout: 30_000 }),
    workId,
  }
}
