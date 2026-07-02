import type { WcaTsvFileDefinition } from './wca-tsv-registry.js'
import { getWcaTsvDefinitionByFileName } from './wca-tsv-registry.js'

export type WcaStagingFile = {
  fileName: string
  localPath: string
}

export type WcaStagingFileLoadResult = {
  fileName: string
  rowCount: number
  stagingTable: string
}

export type LoadWcaStagingInput = {
  files: readonly WcaStagingFile[]
  importRunId: string
}

export type LoadWcaStagingResult = {
  files: WcaStagingFileLoadResult[]
  totalRows: number
}

export type WcaStagingLoader = {
  loadFile: (input: {
    definition: WcaTsvFileDefinition
    importRunId: string
    localPath: string
  }) => Promise<WcaStagingFileLoadResult>
}

export class LoadWcaStagingError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'LoadWcaStagingError'
    this.code = code
  }
}

export type LoadWcaStagingService = ReturnType<typeof createLoadWcaStagingService>

export function createLoadWcaStagingService(loader: WcaStagingLoader) {
  return {
    async execute(input: LoadWcaStagingInput): Promise<LoadWcaStagingResult> {
      const files: WcaStagingFileLoadResult[] = []

      for (const file of input.files) {
        const definition = getWcaTsvDefinitionByFileName(file.fileName)

        if (definition === null) {
          throw new LoadWcaStagingError('wca_staging_unknown_tsv_file', `Unknown WCA TSV file: ${file.fileName}`)
        }

        files.push(await loader.loadFile({ definition, importRunId: input.importRunId, localPath: file.localPath }))
      }

      return {
        files,
        totalRows: files.reduce((sum, file) => sum + file.rowCount, 0),
      }
    },
  }
}
