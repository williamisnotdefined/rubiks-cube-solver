import type { WcaTsvFileDefinition } from './wca-tsv-registry.js'

export type ValidatedWcaTsvHeaders = {
  headerColumns: string[]
  sourceColumnIndexes: Array<number | null>
  stagingColumns: readonly string[]
}

export class WcaTsvHeaderValidationError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'WcaTsvHeaderValidationError'
    this.code = code
  }
}

export type ValidateWcaTsvHeadersService = ReturnType<typeof createValidateWcaTsvHeadersService>

export function createValidateWcaTsvHeadersService() {
  return {
    execute(input: { definition: WcaTsvFileDefinition; headerLine: string }): ValidatedWcaTsvHeaders {
      const headerColumns = input.headerLine.replace(/\r$/, '').split('\t')

      if (headerColumns.length === 0 || headerColumns[0] === '') {
        throw new WcaTsvHeaderValidationError('wca_tsv_empty_header', `${input.definition.fileName} has an empty TSV header`)
      }

      const sourceColumnIndexes = input.definition.columns.map((column) => {
        const exactIndex = headerColumns.indexOf(column.name)
        const index = exactIndex === -1
          ? headerColumns.findIndex((header) => column.aliases?.includes(header) === true)
          : exactIndex

        if (index === -1) {
          if (column.optional === true) {
            return null
          }

          throw new WcaTsvHeaderValidationError(
            'wca_tsv_missing_column',
            `${input.definition.fileName} is missing required column ${column.name}`,
          )
        }

        return index
      })

      return { headerColumns, sourceColumnIndexes, stagingColumns: input.definition.stagingColumns }
    },
  }
}
