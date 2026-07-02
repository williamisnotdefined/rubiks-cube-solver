import { describe, expect, it } from 'vitest'
import { PostgresGeneralDataRepository } from '../postgres-general-data.repository.js'
import type { Queryable } from '../queryable.js'

describe('PostgresGeneralDataRepository', () => {
  it('maps general canonical rows for document builders', async () => {
    const calls: Array<{ params?: unknown[]; sql: string }> = []
    const db: Queryable = {
      async query(sql, params) {
        calls.push({ params, sql })

        if (sql.includes('select count(*) as total')) {
          return { rows: [{ total: '1' }] }
        }

        if (sql.includes('from wca_ranks_single r') && sql.includes('order by r.country_rank')) {
          return {
            rows: [{
              best: '1000',
              continent_id: 'south-america',
              continent_rank: '1',
              country_id: 'BR',
              country_rank: '1',
              event_id: '333',
              person_id: '2026FIXT01',
              world_rank: '1',
            }],
          }
        }

        if (sql.includes('from wca_championship_eligible_countries')) {
          return { rows: [{ championship_type: 'world', eligible_country_iso2: 'PL' }] }
        }

        if (sql.includes('from wca_championships')) {
          return { rows: [{ championship_type: 'world', competition_id: 'FixtureOpen2026', id: '1' }] }
        }

        if (sql.includes('from wca_competitions')) {
          return {
            rows: [{
              cancelled: false,
              cell_name: 'Fixture Open',
              city: 'Warsaw',
              country_id: 'PL',
              day: '30',
              end_day: '30',
              end_month: '6',
              event_specs: '333 clock',
              external_website: '',
              id: 'FixtureOpen2026',
              information: 'Fixture competition',
              latitude: '52123456',
              longitude: '21012345',
              month: '6',
              name: 'Fixture Open 2026',
              organisers: 'Fixture Organiser',
              venue: 'Fixture Venue',
              venue_address: 'Fixture Address',
              venue_details: 'Fixture Details',
              wca_delegates: 'Fixture Delegate',
              year: '2026',
            }],
          }
        }

        if (sql.includes('from wca_continents')) {
          return { rows: [{ id: 'europe', name: 'Europe' }] }
        }

        if (sql.includes('from wca_countries')) {
          return { rows: [{ continent_id: 'south-america', iso2_code: 'BR', name: 'Brazil' }] }
        }

        if (sql.includes('from wca_events')) {
          return { rows: [{ format: 'time', id: '333', name: '3x3x3 Cube' }] }
        }

        if (sql.includes('from wca_formats')) {
          return {
            rows: [{
              expected_solve_count: '5',
              id: 'a',
              name: 'Average of 5',
              short_name: 'Ao5',
              sort_by: 'average',
              sort_by_second: 'best',
              trim_fastest_n: '1',
              trim_slowest_n: '1',
            }],
          }
        }

        if (sql.includes('from wca_persons')) {
          return { rows: [{ country_id: 'PL', gender: 'o', id: '2026FIXT01', name: 'Fixture Solver', sub_id: '1' }] }
        }

        if (sql.includes('from wca_ranks_single')) {
          return {
            rows: [{
              best: '1000',
              continent_id: 'south-america',
              continent_rank: '1',
              country_id: 'BR',
              country_rank: '1',
              event_id: '333',
              person_id: '2026FIXT01',
              rank_type: 'single',
              world_rank: '1',
            }, {
              best: '1200',
              continent_id: 'south-america',
              continent_rank: '1',
              country_id: 'BR',
              country_rank: '1',
              event_id: '333',
              person_id: '2026FIXT01',
              rank_type: 'average',
              world_rank: '1',
            }],
          }
        }

        if (sql.includes('from wca_results')) {
          return {
            rows: [{
              average: '1200',
              best: '1000',
              competition_id: 'FixtureOpen2026',
              event_id: '333',
              format_name: 'Average of 5',
              is_final_round: true,
              person_id: '2026FIXT01',
              pos: '1',
              regional_average_record: null,
              regional_single_record: 'NR',
              round_name: 'Final',
              solves: [1000, 1200, 1400],
            }],
          }
        }

        if (sql.includes('from wca_scrambles')) {
          return {
            rows: [{
              competition_id: 'FixtureOpen2026',
              event_id: '333',
              group_id: 'A',
              id: '1',
              is_extra: false,
              round_type_id: 'f',
              scramble: "R U R' U'",
              scramble_num: '1',
            }],
          }
        }

        return { rows: [{ cell_name: 'Final', id: 'f', is_final: true, name: 'Final' }] }
      },
    }
    const repository = new PostgresGeneralDataRepository(db)

    await expect(repository.listChampionships('dataset-1')).resolves.toEqual([{
      championshipType: 'world',
      competitionId: 'FixtureOpen2026',
      id: 1,
    }])
    await expect(repository.listChampionshipEligibleCountries('dataset-1', {
      championshipType: 'world',
      countryIso2: 'PL',
    })).resolves.toEqual([{ championshipType: 'world', eligibleCountryIso2: 'PL' }])
    const championshipEligibleCountriesCall = calls.find((call) => call.sql.includes('from wca_championship_eligible_countries e'))
    expect(championshipEligibleCountriesCall?.params).toEqual(['dataset-1', 'world', 'PL'])
    await expect(repository.listCompetitions('dataset-1')).resolves.toEqual([{
      cancelled: false,
      cellName: 'Fixture Open',
      city: 'Warsaw',
      countryId: 'PL',
      day: 30,
      endDay: 30,
      endMonth: 6,
      eventSpecs: '333 clock',
      externalWebsite: '',
      id: 'FixtureOpen2026',
      information: 'Fixture competition',
      latitude: '52123456',
      longitude: '21012345',
      month: 6,
      name: 'Fixture Open 2026',
      organisers: 'Fixture Organiser',
      venue: 'Fixture Venue',
      venueAddress: 'Fixture Address',
      venueDetails: 'Fixture Details',
      wcaDelegates: 'Fixture Delegate',
      year: 2026,
    }])
    await expect(repository.getCompetition('dataset-1', 'FixtureOpen2026')).resolves.toMatchObject({ id: 'FixtureOpen2026' })
    await expect(repository.listCompetitionsPage('dataset-1', {
      countryIso2: 'PL',
      eventId: '333',
      page: 2,
      pageSize: 10,
      year: 2026,
    })).resolves.toMatchObject({
      items: [{ id: 'FixtureOpen2026' }],
      total: 1,
    })
    const competitionCountCall = calls.find((call) => call.sql.includes('select count(*) as total') && call.sql.includes('from wca_competitions c'))
    const competitionPageCall = calls.find((call) => call.sql.includes('from wca_competitions c') && call.sql.includes('string_to_array') && call.sql.includes('limit'))
    expect(competitionCountCall?.params).toEqual(['dataset-1', 'PL', 2026, '333'])
    expect(competitionPageCall?.params).toEqual(['dataset-1', 'PL', 2026, '333', 10, 10])
    await expect(repository.listContinents('dataset-1')).resolves.toEqual([{ id: 'europe', name: 'Europe' }])
    await expect(repository.listCountries('dataset-1')).resolves.toEqual([{ continentId: 'south-america', iso2Code: 'BR', name: 'Brazil' }])
    await expect(repository.listEvents('dataset-1')).resolves.toEqual([{ format: 'time', id: '333', name: '3x3x3 Cube' }])
    await expect(repository.listFormats('dataset-1')).resolves.toEqual([{
      expectedSolveCount: 5,
      id: 'a',
      name: 'Average of 5',
      shortName: 'Ao5',
      sortBy: 'average',
      sortBySecond: 'best',
      trimFastestN: 1,
      trimSlowestN: 1,
    }])
    await expect(repository.listPersons('dataset-1')).resolves.toEqual([{
      countryId: 'PL',
      gender: 'o',
      id: '2026FIXT01',
      name: 'Fixture Solver',
      subId: 1,
    }])
    await expect(repository.getPerson('dataset-1', '2026FIXT01')).resolves.toMatchObject({ id: '2026FIXT01' })
    await expect(repository.listPersonsPage('dataset-1', {
      countryIso2: 'PL',
      page: 2,
      pageSize: 10,
      search: 'fixture',
    })).resolves.toMatchObject({
      items: [{ id: '2026FIXT01' }],
      total: 1,
    })
    const personCountCall = calls.find((call) => call.sql.includes('select count(*) as total') && call.sql.includes('from wca_persons p'))
    const personPageCall = calls.find((call) => call.sql.includes('from wca_persons p') && call.sql.includes('lower(p.name)') && call.sql.includes('limit'))
    expect(personCountCall?.params).toEqual(['dataset-1', 'PL', 'fixture'])
    expect(personPageCall?.params).toEqual(['dataset-1', 'PL', 'fixture', 10, 10])
    await expect(repository.listRankDocuments('dataset-1')).resolves.toEqual([{
      path: 'rank/world/single/333.json',
      items: [{
        best: 1000,
        continentId: 'south-america',
        continentRank: 1,
        countryId: 'BR',
        countryRank: 1,
        eventId: '333',
        personId: '2026FIXT01',
        worldRank: 1,
      }],
    }, {
      path: 'rank/world/average/333.json',
      items: [{
        best: 1200,
        continentId: 'south-america',
        continentRank: 1,
        countryId: 'BR',
        countryRank: 1,
        eventId: '333',
        personId: '2026FIXT01',
        worldRank: 1,
      }],
    }])
    await expect(repository.listRankings('dataset-1', {
      countryIso2: 'BR',
      eventId: '333',
      page: 2,
      pageSize: 10,
      region: 'country',
      type: 'single',
    })).resolves.toEqual({
      items: [{
        best: 1000,
        continentId: 'south-america',
        continentRank: 1,
        countryId: 'BR',
        countryRank: 1,
        eventId: '333',
        personId: '2026FIXT01',
        worldRank: 1,
      }],
      total: 1,
    })
    const rankCountCall = calls.find((call) => call.sql.includes('select count(*) as total') && call.sql.includes('from wca_ranks_single'))
    const rankPageCall = calls.find((call) => call.sql.includes('from wca_ranks_single r') && call.sql.includes('order by r.country_rank'))
    expect(rankCountCall?.params).toEqual(['dataset-1', '333', 'BR'])
    expect(rankPageCall?.params).toEqual(['dataset-1', '333', 'BR', 10, 10])
    await expect(repository.listResultDocuments('dataset-1')).resolves.toEqual([{
      path: 'results/FixtureOpen2026/333.json',
      items: [{
        average: 1200,
        best: 1000,
        competitionId: 'FixtureOpen2026',
        eventId: '333',
        format: 'Average of 5',
        isFinalRound: true,
        personId: '2026FIXT01',
        position: 1,
        regionalAverageRecord: null,
        regionalSingleRecord: 'NR',
        round: 'Final',
        solves: [1000, 1200, 1400, 0, 0],
      }],
    }])
    await expect(repository.listResults('dataset-1', {
      eventId: '333',
      page: 2,
      pageSize: 10,
      personId: '2026FIXT01',
    })).resolves.toEqual({
      items: [{
        average: 1200,
        best: 1000,
        competitionId: 'FixtureOpen2026',
        eventId: '333',
        format: 'Average of 5',
        isFinalRound: true,
        personId: '2026FIXT01',
        position: 1,
        regionalAverageRecord: null,
        regionalSingleRecord: 'NR',
        round: 'Final',
        solves: [1000, 1200, 1400, 0, 0],
      }],
      total: 1,
    })
    const countCall = calls.find((call) => call.sql.includes('select count(*) as total') && call.sql.includes('from wca_results'))
    const pageCall = calls.find((call) => call.sql.includes('with selected_results'))
    expect(countCall?.params).toEqual(['dataset-1', '333', '2026FIXT01'])
    expect(pageCall?.params).toEqual(['dataset-1', '333', '2026FIXT01', 10, 10])
    await expect(repository.listRoundTypes('dataset-1')).resolves.toEqual([{ cellName: 'Final', final: true, id: 'f', name: 'Final' }])
    await expect(repository.listScrambles('dataset-1', {
      competitionId: 'FixtureOpen2026',
      eventId: '333',
      groupId: 'A',
      isExtra: false,
      page: 2,
      pageSize: 10,
      roundTypeId: 'f',
    })).resolves.toEqual({
      items: [{
        competitionId: 'FixtureOpen2026',
        eventId: '333',
        groupId: 'A',
        id: 1,
        isExtra: false,
        roundTypeId: 'f',
        scramble: "R U R' U'",
        scrambleNumber: 1,
      }],
      total: 1,
    })
    const scrambleCountCall = calls.find((call) => call.sql.includes('select count(*) as total') && call.sql.includes('from wca_scrambles s'))
    const scramblePageCall = calls.find((call) => call.sql.includes('from wca_scrambles s') && call.sql.includes('order by competition_id'))
    expect(scrambleCountCall?.params).toEqual(['dataset-1', 'FixtureOpen2026', '333', 'f', 'A', false])
    expect(scramblePageCall?.params).toEqual(['dataset-1', 'FixtureOpen2026', '333', 'f', 'A', false, 10, 10])
  })
})
