import type { FastifyInstance } from 'fastify'
import type { WcaDataModule } from '../../modules/wca-data/wca-data.module.js'
import { createWcaDataController } from '../controllers/wca-data.controller.js'

type WcaDataRouteOptions = {
  wcaData: WcaDataModule
}

export async function registerWcaDataRoutes(app: FastifyInstance, options: WcaDataRouteOptions) {
  const controller = createWcaDataController(options.wcaData)

  app.get('/status', controller.status)
  app.get('/championship-eligible-countries', controller.listChampionshipEligibleCountries)
  app.get('/championships', controller.listChampionships)
  app.get('/continents', controller.listContinents)
  app.get('/events', controller.listEvents)
  app.get('/formats', controller.listFormats)
  app.get('/countries', controller.listCountries)
  app.get('/competitions', controller.listCompetitions)
  app.get('/competitions/:id', controller.getCompetition)
  app.get('/persons', controller.listPersons)
  app.get('/persons/:id', controller.getPerson)
  app.get('/rankings', controller.listRankings)
  app.get('/results', controller.listResults)
  app.get('/round-types', controller.listRoundTypes)
  app.get('/scrambles', controller.listScrambles)
  app.get('/speedcubers/top', controller.listTopSpeedcubers)
}
