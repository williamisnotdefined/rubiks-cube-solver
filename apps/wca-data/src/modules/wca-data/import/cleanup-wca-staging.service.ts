export type CleanupWcaStagingResult = {
  truncatedTableCount: number
}

export type WcaStagingCleaner = {
  truncate: () => Promise<CleanupWcaStagingResult>
}

export type CleanupWcaStagingService = {
  execute: () => Promise<CleanupWcaStagingResult>
}

export function createCleanupWcaStagingService({ cleaner }: { cleaner: WcaStagingCleaner }): CleanupWcaStagingService {
  return {
    execute: () => cleaner.truncate(),
  }
}
