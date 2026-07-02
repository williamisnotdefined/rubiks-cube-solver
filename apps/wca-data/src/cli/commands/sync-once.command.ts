import { CommandError } from '../command-error.js'
import type { CliIo } from '../io.js'
import { loadEnv, requireDatabaseEnv } from '../../config/env.js'
import { createPgPool } from '../../db/postgres.js'
import { YauzlZipReader } from '../../infra/archive/yauzl-zip-reader.js'
import { createWcaExportClient, type WcaExportClient } from '../../infra/http/wca-export-client.js'
import { createCheckWcaExportVersionService } from '../../modules/wca-data/import/check-wca-export-version.service.js'
import { createExtractWcaExportService } from '../../modules/wca-data/import/extract-wca-export.service.js'
import { createLocalWcaExportZipClient } from '../../modules/wca-data/import/local-wca-export-zip.js'
import { createLocalZipWcaSourceFilesService } from '../../modules/wca-data/import/wca-source-files.service.js'
import type { WcaDataEnv } from '../../config/env.schema.js'
import type { Clock } from '../../shared/time/clock.js'
import { createFixtureSyncWcaExportService } from '../../modules/wca-data/fixtures/fixture-sync-service.js'
import { createFixtureWcaExportClient, defaultFixtureWcaExportDir } from '../../modules/wca-data/fixtures/wca-export-fixture.js'
import { createPostgresSyncWcaExportService } from '../../modules/wca-data/postgres-sync-service.js'
import {
  type SyncWcaExportResult,
  type SyncWcaExportService,
} from '../../modules/wca-data/import/sync-wca-export.service.js'
import { systemClock } from '../../shared/time/system-clock.js'

export type SyncOnceOptions = {
  dryRun: boolean
  fixtureDir: string | null
  force: boolean
  sourceZipPath: string | null
  storageDir: string | null
}

export type SyncOnceCommandDeps = {
  clock?: Clock
  createPgPool?: typeof createPgPool
  createPostgresSyncWcaExportService?: typeof createPostgresSyncWcaExportService
  exportClient?: WcaExportClient
  loadEnv?: () => WcaDataEnv
  syncWcaExport?: SyncWcaExportService
}

export async function runSyncOnceCommand(args: string[], io: CliIo, deps: SyncOnceCommandDeps = {}): Promise<number> {
  const options = parseSyncOnceArgs(args)

  if (options === 'help') {
    io.stdout(syncOnceUsage())
    return 0
  }

  if (options.dryRun) {
    const service = createCheckWcaExportVersionService({
      exportClient: deps.exportClient ?? dryRunExportClient(options, deps),
    })
    const remote = await service.execute()

    io.stdout(JSON.stringify({ command: 'sync-once', dryRun: true, force: options.force, remote, status: 'remote_checked' }, null, 2))
    return 0
  }

  const result = await executeSyncOnce(options, deps)

  io.stdout(JSON.stringify({ command: 'sync-once', dryRun: false, force: options.force, result }, null, 2))
  return 0
}

export function parseSyncOnceArgs(args: string[]): SyncOnceOptions | 'help' {
  const options: SyncOnceOptions = { dryRun: false, fixtureDir: null, force: false, sourceZipPath: null, storageDir: null }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (arg === undefined) {
      break
    }

    const [flag, inlineValue] = arg.split('=', 2)

    switch (flag) {
      case '--dry-run':
        options.dryRun = true
        break
      case '--fixture': {
        const nextValue = inlineValue ?? (args[index + 1]?.startsWith('--') === false ? args[++index] : undefined)
        options.fixtureDir = nextValue ?? defaultFixtureWcaExportDir()
        break
      }
      case '--force':
        options.force = true
        break
      case '--storage-dir': {
        const value = inlineValue ?? args[++index]

        if (value === undefined || value.startsWith('--')) {
          throw new CommandError('--storage-dir requires a path')
        }

        options.storageDir = value
        break
      }
      case '--source-zip': {
        const value = inlineValue ?? args[++index]

        if (value === undefined || value.startsWith('--')) {
          throw new CommandError('--source-zip requires a path')
        }

        options.sourceZipPath = value
        break
      }
      case '--help':
      case '-h':
        return 'help'
      default:
        throw new CommandError(`Unknown sync-once option: ${arg}`)
    }
  }

  if (options.fixtureDir !== null && options.sourceZipPath !== null) {
    throw new CommandError('--fixture and --source-zip cannot be used together')
  }

  return options
}

export function syncOnceUsage(): string {
  return `Usage: npm run wca:sync-once -- [options]

Checks the WCA Results Export and runs one import/publish cycle.

Options:
  --dry-run             Check the export without writing or publishing data
  --fixture [dir]       Run against bundled or local TSV fixtures without DB/network
  --force               Run even when the active dataset matches the export
  --source-zip <path>   Import from an official local WCA TSV ZIP instead of downloading it
  --storage-dir <dir>   Storage root for downloaded import artifacts
  --help                Show this help
`
}

async function executeSyncOnce(options: SyncOnceOptions, deps: SyncOnceCommandDeps): Promise<SyncWcaExportResult> {
  if (deps.syncWcaExport !== undefined) {
    return deps.syncWcaExport.execute({ force: options.force, reason: 'manual' })
  }

  if (options.fixtureDir !== null) {
    if (options.sourceZipPath !== null) {
      throw new CommandError('--fixture and --source-zip cannot be used together')
    }

    const service = createFixtureSyncWcaExportService({
      clock: deps.clock ?? systemClock,
      fixtureDir: options.fixtureDir,
    })

    return service.execute({ force: options.force, reason: 'manual' })
  }

  const databaseEnv = requireDatabaseEnv((deps.loadEnv ?? loadEnv)())
  const pool = (deps.createPgPool ?? createPgPool)(databaseEnv)
  const storageRootDir = options.storageDir ?? databaseEnv.WCA_DATA_STORAGE_DIR
  const zipReader = options.sourceZipPath === null ? null : new YauzlZipReader()

  try {
    const service = (deps.createPostgresSyncWcaExportService ?? createPostgresSyncWcaExportService)({
      clock: deps.clock ?? systemClock,
      copyPool: pool,
      db: pool,
      exportClient: deps.exportClient ?? (options.sourceZipPath === null
        ? createWcaExportClient({ metadataUrl: databaseEnv.WCA_DATA_WCA_EXPORT_METADATA_URL })
        : createLocalWcaExportZipClient({ sourceZipPath: options.sourceZipPath, zipReader: zipReader ?? new YauzlZipReader() })),
      ...(options.sourceZipPath === null ? {} : { sourceFiles: createLocalZipWcaSourceFilesService({
        extract: createExtractWcaExportService({ storageRootDir, zipReader: zipReader ?? new YauzlZipReader() }),
        sourceZipPath: options.sourceZipPath,
      }) }),
      storageRootDir,
    })

    return await service.execute({ force: options.force, reason: 'manual' })
  } finally {
    await pool.end()
  }
}

function dryRunExportClient(options: SyncOnceOptions, deps: SyncOnceCommandDeps): WcaExportClient {
  if (options.fixtureDir !== null) {
    if (options.sourceZipPath !== null) {
      throw new CommandError('--fixture and --source-zip cannot be used together')
    }

    return createFixtureWcaExportClient(options.fixtureDir)
  }

  if (options.sourceZipPath !== null) {
    return createLocalWcaExportZipClient({ sourceZipPath: options.sourceZipPath, zipReader: new YauzlZipReader() })
  }

  const env = (deps.loadEnv ?? loadEnv)()
  return createWcaExportClient({ metadataUrl: env.WCA_DATA_WCA_EXPORT_METADATA_URL })
}
