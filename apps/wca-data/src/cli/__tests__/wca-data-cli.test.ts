import { describe, expect, it, vi } from 'vitest'
import { CommandError } from '../command-error.js'
import { parseSyncOnceArgs } from '../commands/sync-once.command.js'
import { runWcaDataCli } from '../wca-data-cli.js'

describe('WCA Data CLI', () => {
  it('prints root help when no command is provided', async () => {
    const io = captureIo()

    await expect(runWcaDataCli([], io)).resolves.toBe(0)

    expect(io.stdoutMessages.join('\n')).toContain('sync-once')
  })

  it('dispatches sync-once through an injected sync service', async () => {
    const io = captureIo()
    const result = {
      activeDataset: null,
      remote: remoteMetadata(),
      status: 'new_export_detected' as const,
    }

    await expect(runWcaDataCli(['sync-once', '--force'], io, {
      syncOnce: { syncWcaExport: { execute: async () => result } },
    })).resolves.toBe(0)

    expect(JSON.parse(io.stdoutMessages[0] ?? '{}')).toEqual({
      command: 'sync-once',
      dryRun: false,
      force: true,
      result,
    })
  })

  it('keeps the Postgres pool open until sync-once settles', async () => {
    const io = captureIo()
    let ended = false
    const pool = {
      end: vi.fn(async () => {
        ended = true
      }),
    }
    const result = {
      activeDataset: null,
      remote: remoteMetadata(),
      status: 'new_export_detected' as const,
    }
    const execute = vi.fn(async () => {
      expect(ended).toBe(false)
      await Promise.resolve()
      expect(ended).toBe(false)
      return result
    })

    await expect(runWcaDataCli(['sync-once', '--force'], io, {
      syncOnce: {
        createPgPool: () => pool as never,
        createPostgresSyncWcaExportService: () => ({ execute }),
        exportClient: { getPublicExportMetadata: async () => remoteMetadata() },
        loadEnv: () => databaseEnv(),
      },
    })).resolves.toBe(0)

    expect(execute).toHaveBeenCalledWith({ force: true, reason: 'manual' })
    expect(pool.end).toHaveBeenCalledTimes(1)
    expect(ended).toBe(true)
    expect(JSON.parse(io.stdoutMessages[0] ?? '{}')).toMatchObject({ command: 'sync-once', result })
  })

  it('dispatches sync-once dry-run with an injected WCA export client', async () => {
    const io = captureIo()
    const remote = remoteMetadata()

    await expect(runWcaDataCli(['sync-once', '--dry-run'], io, {
      syncOnce: { exportClient: { getPublicExportMetadata: async () => remote } },
    })).resolves.toBe(0)

    expect(JSON.parse(io.stdoutMessages[0] ?? '{}')).toEqual({
      command: 'sync-once',
      dryRun: true,
      force: false,
      remote,
      status: 'remote_checked',
    })
  })

  it('runs sync-once against bundled TSV fixtures without DB or network', async () => {
    const io = captureIo()

    await expect(runWcaDataCli(['sync-once', '--fixture'], io, {
      syncOnce: { clock: { now: () => new Date('2026-06-30T12:34:56Z') } },
    })).resolves.toBe(0)

    expect(JSON.parse(io.stdoutMessages[0] ?? '{}')).toMatchObject({
      command: 'sync-once',
      dryRun: false,
      force: false,
      result: {
        dataset: {
          id: 'fixture-wca-dataset-v1',
          publishedAt: '2026-06-30T12:34:56.000Z',
        },
        publish: { publishedAt: '2026-06-30T12:34:56.000Z' },
        staging: { totalRows: 35 },
        status: 'published',
        transform: { championships: 1, competitions: 3, continents: 2, countries: 2, events: 2, formats: 1, persons: 4, ranksAverage: 1, ranksSingle: 1, resultAttempts: 13, results: 3, roundTypes: 1, scrambles: 1 },
      },
    })
  })

  it('parses sync-once source options', () => {
    expect(parseSyncOnceArgs(['--fixture=/tmp/wca-export', '--storage-dir', '/tmp/wca-storage'])).toMatchObject({
      fixtureDir: '/tmp/wca-export',
      storageDir: '/tmp/wca-storage',
    })
    expect(parseSyncOnceArgs(['--source-zip', '/tmp/wca-export.zip', '--force'])).toMatchObject({
      force: true,
      sourceZipPath: '/tmp/wca-export.zip',
    })
  })

  it('rejects unknown commands and options', async () => {
    expect(() => parseSyncOnceArgs(['--unknown'])).toThrow(CommandError)
    expect(() => parseSyncOnceArgs(['--source-zip'])).toThrow(CommandError)
    expect(() => parseSyncOnceArgs(['--fixture', '--source-zip', '/tmp/wca-export.zip'])).toThrow(CommandError)
    await expect(runWcaDataCli(['missing'], captureIo())).rejects.toThrow(CommandError)
  })
})

function captureIo() {
  return {
    stderrMessages: [] as string[],
    stdoutMessages: [] as string[],
    stderr(message: string) {
      this.stderrMessages.push(message)
    },
    stdout(message: string) {
      this.stdoutMessages.push(message)
    },
  }
}

function remoteMetadata() {
  return {
    exportDate: '2026-06-30T00:00:16Z',
    exportFormatVersion: 'v2.0.2',
    exportVersion: 'v2.0.2',
    readme: 'Readme text',
    sqlFilesizeBytes: 200,
    sqlUrl: 'https://www.worldcubeassociation.org/export/results/v2/sql',
    tsvFilesizeBytes: 100,
    tsvUrl: 'https://www.worldcubeassociation.org/export/results/v2/tsv',
  }
}

function databaseEnv() {
  return {
    WCA_DATA_DATABASE_SSL_MODE: 'disable' as const,
    WCA_DATA_DATABASE_URL: 'postgres://wca:wca@127.0.0.1:5432/wca',
    WCA_DATA_HOST: '127.0.0.1',
    WCA_DATA_LOG_LEVEL: 'info' as const,
    WCA_DATA_NODE_ENV: 'test' as const,
    WCA_DATA_PG_BOSS_SCHEMA: 'wca_jobs',
    WCA_DATA_PORT: 8796,
    WCA_DATA_PUBLIC_BASE_URL: 'http://speedcube.com.br/api',
    WCA_DATA_STORAGE_DIR: '/tmp/wca-data-test',
    WCA_DATA_SYNC_CRON: '30 4 * * *',
    WCA_DATA_SYNC_ENABLED: true,
    WCA_DATA_SYNC_TIMEZONE: 'UTC',
    WCA_DATA_WCA_EXPORT_METADATA_URL: 'https://www.worldcubeassociation.org/api/v0/export/public',
  }
}
