import { z } from 'zod'

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
})

const queryBooleanSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value
  }

  switch (value.toLocaleLowerCase()) {
    case '0':
    case 'false':
      return false
    case '1':
    case 'true':
      return true
    default:
      return value
  }
}, z.boolean())

export const competitionsQuerySchema = listQuerySchema.extend({
  countryIso2: z.string().min(1).optional(),
  eventId: z.string().min(1).optional(),
  year: z.coerce.number().int().min(1982).optional(),
})

export const championshipsQuerySchema = listQuerySchema.extend({
  championshipType: z.string().min(1).optional(),
  competitionId: z.string().min(1).optional(),
})

export const championshipEligibleCountriesQuerySchema = listQuerySchema.extend({
  championshipType: z.string().min(1).optional(),
  countryIso2: z.string().min(1).optional(),
})

export const personsQuerySchema = listQuerySchema.extend({
  countryIso2: z.string().min(1).optional(),
  search: z.string().min(1).optional(),
})

export const rankingsQuerySchema = listQuerySchema.extend({
  continentId: z.string().min(1).optional(),
  countryIso2: z.string().min(1).optional(),
  eventId: z.string().min(1),
  region: z.enum(['continent', 'country', 'world']).optional(),
  type: z.enum(['average', 'single']),
})

export const resultsQuerySchema = listQuerySchema.extend({
  competitionId: z.string().min(1).optional(),
  eventId: z.string().min(1).optional(),
  personId: z.string().min(1).optional(),
})

export const scramblesQuerySchema = listQuerySchema.extend({
  competitionId: z.string().min(1).optional(),
  eventId: z.string().min(1).optional(),
  groupId: z.string().min(1).optional(),
  isExtra: queryBooleanSchema.optional(),
  roundTypeId: z.string().min(1).optional(),
})

export const topSpeedcubersQuerySchema = rankingsQuerySchema.omit({ region: true })
export const worldRecordsQuerySchema = listQuerySchema.extend({
  eventId: z.string().min(1),
  search: z.string().min(1).optional(),
  type: z.enum(['average', 'single']).optional(),
})
export const idParamsSchema = z.object({ id: z.string().min(1) })
