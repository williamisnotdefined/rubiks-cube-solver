import { describe, expect, it, vi } from 'vitest'
import { createTransformGeneralCanonicalService } from '../transform-general-canonical.service.js'

describe('TransformGeneralCanonicalService', () => {
  it('delegates dataset-scoped transform work to the transformer', async () => {
    const replaceGeneralTables = vi.fn(async () => ({
      championships: 0,
      championshipEligibleCountries: 2,
      competitions: 1,
      continents: 7,
      countries: 200,
      events: 21,
      formats: 9,
      persons: 400,
      ranksAverage: 50,
      ranksSingle: 50,
      resultAttempts: 900,
      results: 800,
      roundTypes: 1,
      scrambles: 3,
    }))
    const service = createTransformGeneralCanonicalService({ replaceGeneralTables })

    await expect(service.execute({
      datasetId: '11111111-1111-4111-8111-111111111111',
      importRunId: '22222222-2222-4222-8222-222222222222',
    })).resolves.toEqual({
      championships: 0,
      championshipEligibleCountries: 2,
      competitions: 1,
      continents: 7,
      countries: 200,
      events: 21,
      formats: 9,
      persons: 400,
      ranksAverage: 50,
      ranksSingle: 50,
      resultAttempts: 900,
      results: 800,
      roundTypes: 1,
      scrambles: 3,
    })
    expect(replaceGeneralTables).toHaveBeenCalledWith({
      datasetId: '11111111-1111-4111-8111-111111111111',
      importRunId: '22222222-2222-4222-8222-222222222222',
    })
  })
})
