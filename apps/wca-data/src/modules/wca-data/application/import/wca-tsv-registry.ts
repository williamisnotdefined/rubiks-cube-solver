export type WcaTsvFileKey =
  | 'championships'
  | 'competitions'
  | 'continents'
  | 'countries'
  | 'events'
  | 'formats'
  | 'persons'
  | 'ranksAverage'
  | 'ranksSingle'
  | 'resultAttempts'
  | 'results'
  | 'roundTypes'
  | 'scrambles'

export type WcaTsvColumn = {
  aliases?: readonly string[]
  name: string
  optional?: boolean
}

export type WcaTsvFileDefinition = {
  columns: readonly WcaTsvColumn[]
  fileNameAliases: readonly string[]
  fileName: string
  key: WcaTsvFileKey
  stagingColumns: readonly string[]
  stagingTable: string
}

const v2FileNameAliasesByKey: Record<WcaTsvFileKey, readonly string[]> = {
  championships: ['WCA_export_championships.tsv'],
  competitions: ['WCA_export_competitions.tsv'],
  continents: ['WCA_export_continents.tsv'],
  countries: ['WCA_export_countries.tsv'],
  events: ['WCA_export_events.tsv'],
  formats: ['WCA_export_formats.tsv'],
  persons: ['WCA_export_persons.tsv'],
  ranksAverage: ['WCA_export_ranks_average.tsv'],
  ranksSingle: ['WCA_export_ranks_single.tsv'],
  resultAttempts: ['WCA_export_result_attempts.tsv'],
  results: ['WCA_export_results.tsv'],
  roundTypes: ['WCA_export_round_types.tsv'],
  scrambles: ['WCA_export_scrambles.tsv'],
}

export const wcaTsvFileDefinitions = [
  define('continents', 'WCA_export_Continents.tsv', 'wca_staging_continents', ['id', 'name'], [
    { name: 'id' },
    { name: 'name' },
  ]),
  define('countries', 'WCA_export_Countries.tsv', 'wca_staging_countries', ['id', 'name', 'continent_id', 'iso2'], [
    { name: 'id' },
    { name: 'name' },
    { aliases: ['continentId'], name: 'continent_id' },
    { aliases: ['iso2Code'], name: 'iso2', optional: true },
  ]),
  define('events', 'WCA_export_Events.tsv', 'wca_staging_events', ['id', 'name', 'rank', 'format'], [
    { name: 'id' },
    { name: 'name' },
    { name: 'rank' },
    { name: 'format' },
  ]),
  define('competitions', 'WCA_export_Competitions.tsv', 'wca_staging_competitions', [
    'id',
    'name',
    'city',
    'country_id',
    'information',
    'year',
    'month',
    'day',
    'end_month',
    'end_day',
    'event_specs',
    'wca_delegates',
    'organisers',
    'venue',
    'venue_address',
    'venue_details',
    'external_website',
    'cell_name',
    'latitude',
    'longitude',
    'cancelled',
  ], [
    { name: 'id' },
    { name: 'name' },
    { aliases: ['cityName', 'city_name'], name: 'city' },
    { aliases: ['countryId'], name: 'country_id' },
    { name: 'information' },
    { name: 'year' },
    { name: 'month' },
    { name: 'day' },
    { aliases: ['endMonth'], name: 'end_month' },
    { aliases: ['endDay'], name: 'end_day' },
    { aliases: ['eventSpecs'], name: 'event_specs' },
    { aliases: ['delegates', 'wcaDelegate', 'wcaDelegates'], name: 'wca_delegates' },
    { aliases: ['organizer', 'organizers', 'organisers'], name: 'organisers' },
    { name: 'venue' },
    { aliases: ['venueAddress'], name: 'venue_address' },
    { aliases: ['venueDetails'], name: 'venue_details' },
    { aliases: ['externalWebsite'], name: 'external_website' },
    { aliases: ['cellName'], name: 'cell_name' },
    { aliases: ['latitude_microdegrees'], name: 'latitude' },
    { aliases: ['longitude_microdegrees'], name: 'longitude' },
    { name: 'cancelled' },
  ]),
  define('persons', 'WCA_export_Persons.tsv', 'wca_staging_persons', ['id', 'sub_id', 'name', 'country_id', 'gender'], [
    { aliases: ['wca_id'], name: 'id' },
    { aliases: ['subid', 'subId'], name: 'sub_id' },
    { name: 'name' },
    { aliases: ['countryId'], name: 'country_id' },
    { name: 'gender' },
  ]),
  define('results', 'WCA_export_Results.tsv', 'wca_staging_results', [
    'id',
    'competition_id',
    'event_id',
    'round_type_id',
    'pos',
    'best',
    'average',
    'person_name',
    'person_id',
    'person_country_id',
    'format_id',
    'regional_single_record',
    'regional_average_record',
  ], [
    { name: 'id' },
    { aliases: ['competitionId'], name: 'competition_id' },
    { aliases: ['eventId'], name: 'event_id' },
    { aliases: ['roundTypeId'], name: 'round_type_id' },
    { name: 'pos' },
    { name: 'best' },
    { name: 'average' },
    { aliases: ['personName'], name: 'person_name' },
    { aliases: ['personId'], name: 'person_id' },
    { aliases: ['personCountryId'], name: 'person_country_id' },
    { aliases: ['formatId'], name: 'format_id' },
    { aliases: ['regionalSingleRecord'], name: 'regional_single_record' },
    { aliases: ['regionalAverageRecord'], name: 'regional_average_record' },
  ]),
  define('resultAttempts', 'WCA_export_ResultAttempts.tsv', 'wca_staging_result_attempts', ['result_id', 'attempt_number', 'result'], [
    { aliases: ['resultId'], name: 'result_id' },
    { aliases: ['attemptNumber'], name: 'attempt_number' },
    { aliases: ['value'], name: 'result' },
  ]),
  define('ranksSingle', 'WCA_export_RanksSingle.tsv', 'wca_staging_ranks_single', [
    'person_id',
    'event_id',
    'best',
    'world_rank',
    'continent_rank',
    'country_rank',
  ], rankColumns()),
  define('ranksAverage', 'WCA_export_RanksAverage.tsv', 'wca_staging_ranks_average', [
    'person_id',
    'event_id',
    'best',
    'world_rank',
    'continent_rank',
    'country_rank',
  ], rankColumns()),
  define('roundTypes', 'WCA_export_RoundTypes.tsv', 'wca_staging_round_types', ['id', 'rank', 'name', 'cell_name', 'final'], [
    { name: 'id' },
    { name: 'rank' },
    { name: 'name' },
    { aliases: ['cellName'], name: 'cell_name' },
    { name: 'final' },
  ]),
  define('formats', 'WCA_export_Formats.tsv', 'wca_staging_formats', [
    'id',
    'sort_by',
    'sort_by_second',
    'expected_solve_count',
    'trim_fastest_n',
    'trim_slowest_n',
    'name',
    'short_name',
  ], [
    { name: 'id' },
    { aliases: ['sortBy'], name: 'sort_by' },
    { aliases: ['sortBySecond'], name: 'sort_by_second' },
    { aliases: ['expectedSolveCount'], name: 'expected_solve_count' },
    { aliases: ['trimFastestN'], name: 'trim_fastest_n' },
    { aliases: ['trimSlowestN'], name: 'trim_slowest_n' },
    { name: 'name' },
    { aliases: ['shortName'], name: 'short_name', optional: true },
  ]),
  define('championships', 'WCA_export_Championships.tsv', 'wca_staging_championships', ['id', 'competition_id', 'championship_type'], [
    { name: 'id' },
    { aliases: ['competitionId'], name: 'competition_id' },
    { aliases: ['championshipType'], name: 'championship_type' },
  ]),
  define('scrambles', 'WCA_export_Scrambles.tsv', 'wca_staging_scrambles', [
    'id',
    'competition_id',
    'event_id',
    'round_type_id',
    'group_id',
    'is_extra',
    'scramble_num',
    'scramble',
  ], [
    { aliases: ['scramble_id'], name: 'id' },
    { aliases: ['competitionId'], name: 'competition_id' },
    { aliases: ['eventId'], name: 'event_id' },
    { aliases: ['roundTypeId'], name: 'round_type_id' },
    { aliases: ['groupId'], name: 'group_id' },
    { aliases: ['isExtra'], name: 'is_extra' },
    { aliases: ['scrambleNum'], name: 'scramble_num' },
    { name: 'scramble' },
  ]),
] as const satisfies readonly WcaTsvFileDefinition[]

export function getWcaTsvDefinitionByFileName(fileName: string): WcaTsvFileDefinition | null {
  return wcaTsvFileDefinitions.find((definition) => definition.fileName === fileName || definition.fileNameAliases.includes(fileName)) ?? null
}

function define(
  key: WcaTsvFileKey,
  fileName: string,
  stagingTable: string,
  stagingColumns: readonly string[],
  columns: readonly WcaTsvColumn[],
): WcaTsvFileDefinition {
  return { columns, fileName, fileNameAliases: v2FileNameAliasesByKey[key], key, stagingColumns, stagingTable }
}

function rankColumns(): readonly WcaTsvColumn[] {
  return [
    { aliases: ['personId'], name: 'person_id' },
    { aliases: ['eventId'], name: 'event_id' },
    { name: 'best' },
    { aliases: ['worldRank'], name: 'world_rank' },
    { aliases: ['continentRank'], name: 'continent_rank' },
    { aliases: ['countryRank'], name: 'country_rank' },
  ]
}
