import { describe, expect, it, vi } from 'vitest'
import { startWcaDataWorker, syncWcaExportJobName, syncWcaExportScheduleKey, type WcaDataBoss } from '../sync-worker.js'

describe('startWcaDataWorker', () => {
  it('starts pg-boss, registers the sync worker, and schedules the daily job', async () => {
    const boss = new FakeBoss()
    const logger = { error: vi.fn(), info: vi.fn() }

    const worker = await startWcaDataWorker({
      boss,
      logger,
      syncCron: '30 4 * * *',
      syncEnabled: true,
      syncTimezone: 'UTC',
    })

    expect(worker.workId).toBe('worker-1')
    expect(boss.calls).toEqual([
      'start',
      'createQueue:wca-data.sync-export',
      'work:wca-data.sync-export',
      'schedule:wca-data.sync-export:30 4 * * *',
    ])
    expect(boss.queueOptions).toMatchObject({ policy: 'singleton', retryBackoff: true, retryDelay: 300, retryLimit: 3 })
    expect(boss.scheduleOptions).toMatchObject({ key: syncWcaExportScheduleKey, retryLimit: 3, tz: 'UTC' })
    expect(boss.scheduledData).toEqual({ reason: 'schedule' })

    await expect(boss.runRegisteredHandler()).resolves.toEqual({ jobCount: 1, status: 'noop' })
    await worker.stop()

    expect(boss.calls.at(-1)).toBe('stop')
    expect(boss.stopOptions).toEqual({ graceful: true, timeout: 30_000 })
  })

  it('can start without registering the daily schedule', async () => {
    const boss = new FakeBoss()
    const logger = { error: vi.fn(), info: vi.fn() }

    await startWcaDataWorker({ boss, logger, syncCron: '30 4 * * *', syncEnabled: false, syncTimezone: 'UTC' })

    expect(boss.calls).toEqual(['start', 'createQueue:wca-data.sync-export', 'work:wca-data.sync-export'])
  })

  it('runs an injected sync service for received jobs', async () => {
    const boss = new FakeBoss()
    const logger = { error: vi.fn(), info: vi.fn() }
    const syncWcaExport = {
      execute: vi.fn(async () => ({
        activeDataset: null,
        remote: remoteMetadata(),
        status: 'new_export_detected' as const,
      })),
    }

    await startWcaDataWorker({
      boss,
      logger,
      syncCron: '30 4 * * *',
      syncEnabled: false,
      syncTimezone: 'UTC',
      syncWcaExport,
    })

    await expect(boss.runRegisteredHandler([{ data: { force: true, reason: 'manual' }, id: 'job-1' }])).resolves.toEqual({
      jobCount: 1,
      results: [{
        jobId: 'job-1',
        result: { activeDataset: null, remote: remoteMetadata(), status: 'new_export_detected' },
        status: 'completed',
      }],
      status: 'completed',
    })
    expect(syncWcaExport.execute).toHaveBeenCalledWith({ force: true, reason: 'manual' })
  })

  it('logs and rethrows sync job failures so pg-boss can retry', async () => {
    const boss = new FakeBoss()
    const logger = { error: vi.fn(), info: vi.fn() }
    const syncWcaExport = {
      execute: vi.fn(async () => {
        throw new Error('download failed')
      }),
    }

    await startWcaDataWorker({
      boss,
      logger,
      syncCron: '30 4 * * *',
      syncEnabled: false,
      syncTimezone: 'UTC',
      syncWcaExport,
    })

    await expect(boss.runRegisteredHandler([{ data: { reason: 'schedule' }, id: 'job-1' }])).rejects.toThrow('download failed')
    expect(logger.error).toHaveBeenCalledWith('WCA export sync job failed.', {
      error: 'download failed',
      jobId: 'job-1',
    })
  })
})

class FakeBoss implements WcaDataBoss {
  calls: string[] = []
  queueOptions: unknown
  scheduledData: unknown
  scheduleOptions: unknown
  stopOptions: unknown
  private handler: ((jobs: Array<{ data: unknown; id: string }>) => Promise<unknown>) | undefined

  async createQueue(name: string, options: unknown): Promise<void> {
    this.calls.push(`createQueue:${name}`)
    this.queueOptions = options
  }

  async schedule(name: string, cron: string, data: unknown, options: unknown): Promise<void> {
    this.calls.push(`schedule:${name}:${cron}`)
    this.scheduledData = data
    this.scheduleOptions = options
  }

  async start(): Promise<void> {
    this.calls.push('start')
  }

  async stop(options: unknown): Promise<void> {
    this.calls.push('stop')
    this.stopOptions = options
  }

  async work<ReqData, ResData>(name: string, handler: (jobs: Array<{ data: ReqData; id: string }>) => Promise<ResData>): Promise<string> {
    expect(name).toBe(syncWcaExportJobName)
    this.calls.push(`work:${name}`)
    this.handler = handler as (jobs: Array<{ data: unknown; id: string }>) => Promise<unknown>

    return 'worker-1'
  }

  async runRegisteredHandler(jobs: Array<{ data: unknown; id: string }> = [{ data: { reason: 'schedule' }, id: 'job-1' }]): Promise<unknown> {
    if (this.handler === undefined) {
      throw new Error('handler was not registered')
    }

    return this.handler(jobs)
  }
}

function remoteMetadata() {
  return {
    exportDate: '2026-06-30T00:00:16Z',
    exportFormatVersion: 'v2.0.2',
    exportVersion: 'v2.0.2',
    readme: 'Readme text',
    sqlFilesizeBytes: null,
    sqlUrl: null,
    tsvFilesizeBytes: 100,
    tsvUrl: 'https://www.worldcubeassociation.org/export/results/v2/tsv',
  }
}
