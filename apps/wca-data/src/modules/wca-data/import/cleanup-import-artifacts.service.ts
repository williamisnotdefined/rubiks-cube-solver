import { rm, stat } from 'node:fs/promises'
import { safeJoin } from '../../../shared/files/safe-path.js'

export type CleanupImportArtifactsInput = {
  dryRun?: boolean
  importRunId: string
}

export type CleanupImportArtifactsResult = {
  dryRun: boolean
  existed: boolean
  removed: boolean
  storageKey: string
}

export type CleanupImportArtifactsService = ReturnType<typeof createCleanupImportArtifactsService>

type CleanupImportArtifactsServiceDeps = {
  storageRootDir: string
}

export function createCleanupImportArtifactsService({ storageRootDir }: CleanupImportArtifactsServiceDeps) {
  return {
    async execute(input: CleanupImportArtifactsInput): Promise<CleanupImportArtifactsResult> {
      const storageKey = `imports/${input.importRunId}`
      const localPath = safeJoin(storageRootDir, storageKey)
      const existed = await pathExists(localPath)
      const dryRun = input.dryRun ?? false

      if (existed && !dryRun) {
        await rm(localPath, { force: true, recursive: true })
      }

      return {
        dryRun,
        existed,
        removed: existed && !dryRun,
        storageKey,
      }
    },
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return false
    }

    throw error
  }
}

function isNodeError(error: unknown): error is Error & { code: string } {
  return error instanceof Error && 'code' in error && typeof error.code === 'string'
}
