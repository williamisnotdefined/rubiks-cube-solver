import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createCleanupImportArtifactsService } from '../cleanup-import-artifacts.service.js'

let tempDir: string | undefined

afterEach(async () => {
  if (tempDir !== undefined) {
    await rm(tempDir, { force: true, recursive: true })
    tempDir = undefined
  }
})

describe('CleanupImportArtifactsService', () => {
  it('removes only the import run artifacts and leaves published datasets untouched', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'wca-cleanup-'))
    await mkdir(join(tempDir, 'imports', 'run-1', 'extracted'), { recursive: true })
    await mkdir(join(tempDir, 'datasets', 'dataset-1', 'v1'), { recursive: true })
    await writeFile(join(tempDir, 'imports', 'run-1', 'wca-export.tsv.zip'), 'zip')
    await writeFile(join(tempDir, 'imports', 'run-1', 'extracted', 'WCA_export_Events.tsv'), 'events')
    await writeFile(join(tempDir, 'datasets', 'dataset-1', 'v1', 'events.json'), '{"ok":true}')
    const service = createCleanupImportArtifactsService({ storageRootDir: tempDir })

    await expect(service.execute({ importRunId: 'run-1' })).resolves.toEqual({
      dryRun: false,
      existed: true,
      removed: true,
      storageKey: 'imports/run-1',
    })

    await expect(readFile(join(tempDir, 'imports', 'run-1', 'wca-export.tsv.zip'))).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(readFile(join(tempDir, 'datasets', 'dataset-1', 'v1', 'events.json'), 'utf8')).resolves.toBe('{"ok":true}')
  })

  it('reports dry runs without deleting import artifacts', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'wca-cleanup-'))
    await mkdir(join(tempDir, 'imports', 'run-1'), { recursive: true })
    await writeFile(join(tempDir, 'imports', 'run-1', 'wca-export.tsv.zip'), 'zip')
    const service = createCleanupImportArtifactsService({ storageRootDir: tempDir })

    await expect(service.execute({ dryRun: true, importRunId: 'run-1' })).resolves.toEqual({
      dryRun: true,
      existed: true,
      removed: false,
      storageKey: 'imports/run-1',
    })
    await expect(readFile(join(tempDir, 'imports', 'run-1', 'wca-export.tsv.zip'), 'utf8')).resolves.toBe('zip')
  })

  it('rejects unsafe import run IDs before deleting anything', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'wca-cleanup-'))
    await mkdir(join(tempDir, 'datasets', 'dataset-1', 'v1'), { recursive: true })
    await writeFile(join(tempDir, 'datasets', 'dataset-1', 'v1', 'events.json'), '{"ok":true}')
    const service = createCleanupImportArtifactsService({ storageRootDir: tempDir })

    await expect(service.execute({ importRunId: '../dataset-1' })).rejects.toThrow('Storage path contains an invalid segment')
    await expect(readFile(join(tempDir, 'datasets', 'dataset-1', 'v1', 'events.json'), 'utf8')).resolves.toBe('{"ok":true}')
  })
})
