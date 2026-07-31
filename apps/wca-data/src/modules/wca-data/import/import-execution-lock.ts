export type WcaImportExecutionLock = {
  executeExclusive: <T>(operation: () => Promise<T>) => Promise<T | null>
}
