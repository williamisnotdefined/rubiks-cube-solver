import type { FastifyRequest } from 'fastify'
import type { WcaDataModule } from '../../modules/wca-data/wca-data.module.js'
import {
  championshipEligibleCountriesQuerySchema,
  championshipsQuerySchema,
  competitionsQuerySchema,
  idParamsSchema,
  listQuerySchema,
  personsQuerySchema,
  rankingsQuerySchema,
  resultsQuerySchema,
  scramblesQuerySchema,
  topSpeedcubersQuerySchema,
} from '../schemas/wca-data-http.schemas.js'

export function createWcaDataController(wcaData: WcaDataModule) {
  return {
    status: async () => wcaData.getApiStatus.execute(),

    listChampionshipEligibleCountries: async (request: FastifyRequest) => wcaData.publicApi.listChampionshipEligibleCountries(
      championshipEligibleCountriesQuerySchema.parse(request.query),
    ),

    listChampionships: async (request: FastifyRequest) => wcaData.publicApi.listChampionships(
      championshipsQuerySchema.parse(request.query),
    ),

    listContinents: async (request: FastifyRequest) => wcaData.publicApi.listContinents(listQuerySchema.parse(request.query)),
    listEvents: async (request: FastifyRequest) => wcaData.publicApi.listEvents(listQuerySchema.parse(request.query)),
    listFormats: async (request: FastifyRequest) => wcaData.publicApi.listFormats(listQuerySchema.parse(request.query)),
    listCountries: async (request: FastifyRequest) => wcaData.publicApi.listCountries(listQuerySchema.parse(request.query)),
    listCompetitions: async (request: FastifyRequest) => wcaData.publicApi.listCompetitions(competitionsQuerySchema.parse(request.query)),

    getCompetition: async (request: FastifyRequest) => {
      const { id } = idParamsSchema.parse(request.params)
      return wcaData.publicApi.getCompetition(id)
    },

    listPersons: async (request: FastifyRequest) => wcaData.publicApi.listPersons(personsQuerySchema.parse(request.query)),

    getPerson: async (request: FastifyRequest) => {
      const { id } = idParamsSchema.parse(request.params)
      return wcaData.publicApi.getPerson(id)
    },

    listRankings: async (request: FastifyRequest) => wcaData.publicApi.listRankings(rankingsQuerySchema.parse(request.query)),
    listResults: async (request: FastifyRequest) => wcaData.publicApi.listResults(resultsQuerySchema.parse(request.query)),
    listRoundTypes: async (request: FastifyRequest) => wcaData.publicApi.listRoundTypes(listQuerySchema.parse(request.query)),
    listScrambles: async (request: FastifyRequest) => wcaData.publicApi.listScrambles(scramblesQuerySchema.parse(request.query)),
    listTopSpeedcubers: async (request: FastifyRequest) => wcaData.publicApi.listTopSpeedcubers(topSpeedcubersQuerySchema.parse(request.query)),
  }
}
