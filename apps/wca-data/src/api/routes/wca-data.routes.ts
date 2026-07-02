import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { WcaDataModule } from '../../modules/wca-data/wca-data.module.js'

type WcaDataRouteOptions = {
  wcaData: WcaDataModule
}

const listQuerySchema = z.object({
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

const competitionsQuerySchema = listQuerySchema.extend({
  countryIso2: z.string().min(1).optional(),
  eventId: z.string().min(1).optional(),
  year: z.coerce.number().int().min(1982).optional(),
})

const championshipsQuerySchema = listQuerySchema.extend({
  championshipType: z.string().min(1).optional(),
  competitionId: z.string().min(1).optional(),
})

const championshipEligibleCountriesQuerySchema = listQuerySchema.extend({
  championshipType: z.string().min(1).optional(),
  countryIso2: z.string().min(1).optional(),
})

const personsQuerySchema = listQuerySchema.extend({
  countryIso2: z.string().min(1).optional(),
  search: z.string().min(1).optional(),
})

const rankingsQuerySchema = listQuerySchema.extend({
  continentId: z.string().min(1).optional(),
  countryIso2: z.string().min(1).optional(),
  eventId: z.string().min(1),
  region: z.enum(['continent', 'country', 'world']).optional(),
  type: z.enum(['average', 'single']),
})

const resultsQuerySchema = listQuerySchema.extend({
  competitionId: z.string().min(1).optional(),
  eventId: z.string().min(1).optional(),
  personId: z.string().min(1).optional(),
})

const scramblesQuerySchema = listQuerySchema.extend({
  competitionId: z.string().min(1).optional(),
  eventId: z.string().min(1).optional(),
  groupId: z.string().min(1).optional(),
  isExtra: queryBooleanSchema.optional(),
  roundTypeId: z.string().min(1).optional(),
})

const idParamsSchema = z.object({ id: z.string().min(1) })

export async function registerWcaDataRoutes(app: FastifyInstance, options: WcaDataRouteOptions) {
  app.get('/status', async () => options.wcaData.getApiStatus.execute())
  app.get('/championship-eligible-countries', async (request) => options.wcaData.wcaDataApi.listChampionshipEligibleCountries(championshipEligibleCountriesQuerySchema.parse(request.query)))
  app.get('/championships', async (request) => options.wcaData.wcaDataApi.listChampionships(championshipsQuerySchema.parse(request.query)))
  app.get('/continents', async (request) => options.wcaData.wcaDataApi.listContinents(listQuerySchema.parse(request.query)))
  app.get('/events', async (request) => options.wcaData.wcaDataApi.listEvents(listQuerySchema.parse(request.query)))
  app.get('/formats', async (request) => options.wcaData.wcaDataApi.listFormats(listQuerySchema.parse(request.query)))
  app.get('/countries', async (request) => options.wcaData.wcaDataApi.listCountries(listQuerySchema.parse(request.query)))
  app.get('/competitions', async (request) => options.wcaData.wcaDataApi.listCompetitions(competitionsQuerySchema.parse(request.query)))
  app.get('/competitions/:id', async (request) => {
    const { id } = idParamsSchema.parse(request.params)
    return options.wcaData.wcaDataApi.getCompetition(id)
  })
  app.get('/persons', async (request) => options.wcaData.wcaDataApi.listPersons(personsQuerySchema.parse(request.query)))
  app.get('/persons/:id', async (request) => {
    const { id } = idParamsSchema.parse(request.params)
    return options.wcaData.wcaDataApi.getPerson(id)
  })
  app.get('/rankings', async (request) => options.wcaData.wcaDataApi.listRankings(rankingsQuerySchema.parse(request.query)))
  app.get('/results', async (request) => options.wcaData.wcaDataApi.listResults(resultsQuerySchema.parse(request.query)))
  app.get('/round-types', async (request) => options.wcaData.wcaDataApi.listRoundTypes(listQuerySchema.parse(request.query)))
  app.get('/scrambles', async (request) => options.wcaData.wcaDataApi.listScrambles(scramblesQuerySchema.parse(request.query)))
  app.get('/speedcubers/top', async (request) => options.wcaData.wcaDataApi.listTopSpeedcubers(rankingsQuerySchema.omit({ region: true }).parse(request.query)))
}
