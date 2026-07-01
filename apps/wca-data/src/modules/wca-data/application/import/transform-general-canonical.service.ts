export type GeneralCanonicalTransformCounts = {
  championships: number
  championshipEligibleCountries: number
  competitions: number
  continents: number
  countries: number
  events: number
  formats: number
  persons: number
  ranksAverage: number
  ranksSingle: number
  resultAttempts: number
  results: number
  roundTypes: number
  scrambles: number
}

export type TransformGeneralCanonicalInput = {
  datasetId: string
  importRunId: string
}

export type GeneralCanonicalTransformer = {
  replaceGeneralTables: (input: TransformGeneralCanonicalInput) => Promise<GeneralCanonicalTransformCounts>
}

export type TransformGeneralCanonicalService = ReturnType<typeof createTransformGeneralCanonicalService>

export function createTransformGeneralCanonicalService(transformer: GeneralCanonicalTransformer) {
  return {
    async execute(input: TransformGeneralCanonicalInput): Promise<GeneralCanonicalTransformCounts> {
      return transformer.replaceGeneralTables(input)
    },
  }
}
