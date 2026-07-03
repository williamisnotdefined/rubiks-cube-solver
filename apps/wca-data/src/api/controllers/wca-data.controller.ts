import { Controller, Get, Inject, Param, Query } from '@nestjs/common'
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
  worldRecordsQuerySchema,
} from '../schemas/wca-data-http.schemas.js'
import { WCA_DATA_MODULE } from '../tokens.js'

@Controller('api/wca-data/v1')
export class WcaDataController {
  constructor(@Inject(WCA_DATA_MODULE) private readonly wcaData: WcaDataModule) {}

  @Get('status')
  status() {
    return this.wcaData.getApiStatus.execute()
  }

  @Get('championship-eligible-countries')
  listChampionshipEligibleCountries(@Query() query: unknown) {
    return this.wcaData.publicApi.listChampionshipEligibleCountries(championshipEligibleCountriesQuerySchema.parse(query))
  }

  @Get('championships')
  listChampionships(@Query() query: unknown) {
    return this.wcaData.publicApi.listChampionships(championshipsQuerySchema.parse(query))
  }

  @Get('continents')
  listContinents(@Query() query: unknown) {
    return this.wcaData.publicApi.listContinents(listQuerySchema.parse(query))
  }

  @Get('events')
  listEvents(@Query() query: unknown) {
    return this.wcaData.publicApi.listEvents(listQuerySchema.parse(query))
  }

  @Get('formats')
  listFormats(@Query() query: unknown) {
    return this.wcaData.publicApi.listFormats(listQuerySchema.parse(query))
  }

  @Get('countries')
  listCountries(@Query() query: unknown) {
    return this.wcaData.publicApi.listCountries(listQuerySchema.parse(query))
  }

  @Get('competitions')
  listCompetitions(@Query() query: unknown) {
    return this.wcaData.publicApi.listCompetitions(competitionsQuerySchema.parse(query))
  }

  @Get('competitions/:id')
  getCompetition(@Param() params: unknown) {
    const { id } = idParamsSchema.parse(params)
    return this.wcaData.publicApi.getCompetition(id)
  }

  @Get('persons')
  listPersons(@Query() query: unknown) {
    return this.wcaData.publicApi.listPersons(personsQuerySchema.parse(query))
  }

  @Get('persons/:id/profile')
  getPersonProfile(@Param() params: unknown) {
    const { id } = idParamsSchema.parse(params)
    return this.wcaData.publicApi.getPersonProfile(id)
  }

  @Get('persons/:id')
  getPerson(@Param() params: unknown) {
    const { id } = idParamsSchema.parse(params)
    return this.wcaData.publicApi.getPerson(id)
  }

  @Get('rankings')
  listRankings(@Query() query: unknown) {
    return this.wcaData.publicApi.listRankings(rankingsQuerySchema.parse(query))
  }

  @Get('results')
  listResults(@Query() query: unknown) {
    return this.wcaData.publicApi.listResults(resultsQuerySchema.parse(query))
  }

  @Get('records/world')
  listWorldRecords(@Query() query: unknown) {
    return this.wcaData.publicApi.listWorldRecords(worldRecordsQuerySchema.parse(query))
  }

  @Get('round-types')
  listRoundTypes(@Query() query: unknown) {
    return this.wcaData.publicApi.listRoundTypes(listQuerySchema.parse(query))
  }

  @Get('scrambles')
  listScrambles(@Query() query: unknown) {
    return this.wcaData.publicApi.listScrambles(scramblesQuerySchema.parse(query))
  }

  @Get('speedcubers/top')
  listTopSpeedcubers(@Query() query: unknown) {
    return this.wcaData.publicApi.listTopSpeedcubers(topSpeedcubersQuerySchema.parse(query))
  }
}
