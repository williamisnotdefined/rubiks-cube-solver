import { describe, expect, it } from 'vitest'
import { createValidateWcaTsvHeadersService, WcaTsvHeaderValidationError } from '../validate-wca-tsv-headers.service.js'
import { getWcaTsvDefinitionByFileName } from '../wca-tsv-registry.js'

describe('ValidateWcaTsvHeadersService', () => {
  const service = createValidateWcaTsvHeadersService()

  it('validates exact header columns and returns source indexes', () => {
    const definition = requiredDefinition('WCA_export_Events.tsv')

    expect(service.execute({ definition, headerLine: 'id\tname\trank\tformat\textra' })).toEqual({
      headerColumns: ['id', 'name', 'rank', 'format', 'extra'],
      sourceColumnIndexes: [0, 1, 2, 3],
      stagingColumns: ['id', 'name', 'rank', 'format'],
    })
  })

  it('accepts declared aliases for source headers', () => {
    const definition = requiredDefinition('WCA_export_Persons.tsv')

    expect(service.execute({ definition, headerLine: 'id\tsubid\tname\tcountryId\tgender' }).sourceColumnIndexes).toEqual([
      0,
      1,
      2,
      3,
      4,
    ])
  })

  it('prefers exact source headers over aliases', () => {
    const definition = requiredDefinition('WCA_export_Countries.tsv')

    expect(service.execute({ definition, headerLine: 'id\tiso2\tname\tcontinent_id' }).sourceColumnIndexes).toEqual([
      0,
      2,
      3,
      1,
    ])
  })

  it('allows optional source headers to be absent', () => {
    const definition = requiredDefinition('WCA_export_Formats.tsv')

    expect(service.execute({
      definition,
      headerLine: 'id\texpected_solve_count\tname\tsort_by\tsort_by_second\ttrim_fastest_n\ttrim_slowest_n',
    }).sourceColumnIndexes).toEqual([0, 3, 4, 1, 5, 6, 2, null])
  })

  it('rejects missing required columns', () => {
    const definition = requiredDefinition('WCA_export_Events.tsv')

    expect(() => service.execute({ definition, headerLine: 'id\tname\trank' })).toThrow(WcaTsvHeaderValidationError)
  })
})

function requiredDefinition(fileName: string) {
  const definition = getWcaTsvDefinitionByFileName(fileName)

  if (definition === null) {
    throw new Error(`Missing test definition ${fileName}`)
  }

  return definition
}
