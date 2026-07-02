import type {
  WcaChampionshipEligibleCountryRecord,
  WcaChampionshipRecord,
  WcaCompetitionRecord,
  WcaPersonRecord,
  WcaRankRecord,
  WcaResultRecord,
  WcaRoundTypeRecord,
  WcaScrambleRecord,
} from '../../domain/wca-records.js'

export type PublicChampionship = {
  championshipType: string
  competitionId: string | null
  id: number
}

export type PublicChampionshipEligibleCountry = {
  championshipType: string
  eligibleCountryIso2: string
}

export type PublicRoundType = {
  cellName: string
  id: string
  isFinal: boolean
  name: string
}

export type PublicCompetition = {
  cancelled: boolean
  city: string
  countryIso2: string | null
  date: {
    end: string
    numberOfDays: number
    start: string
  }
  delegates: PublicPersonName[]
  events: string[]
  externalWebsite: string | null
  id: string
  information: string
  name: string
  organizers: PublicPersonName[]
  venue: {
    address: string
    coordinates: {
      latitude: number | null
      longitude: number | null
    }
    details: string
    name: string
  }
}

export type PublicPerson = {
  countryIso2: string | null
  gender: string
  id: string
  name: string
}

export type PublicPersonName = {
  email: string | null
  name: string
}

export type PublicRank = {
  best: PublicResultValue
  eventId: string
  personId: string
  rank: {
    continent: number
    country: number
    selected: number
    world: number
  }
  region: 'continent' | 'country' | 'world'
  type: 'average' | 'single'
}

export type PublicResult = {
  average: PublicResultValue
  best: PublicResultValue
  competitionId: string
  eventId: string
  format: string
  personId: string
  position: number
  regionalAverageRecord: string | null
  regionalSingleRecord: string | null
  round: string
  solves: PublicResultValue[]
}

export type PublicScramble = {
  competitionId: string
  eventId: string
  groupId: string
  id: number
  isExtra: boolean
  roundTypeId: string
  scramble: string
  scrambleNumber: number
}

export type PublicResultValue = {
  raw: number
}

export function publicChampionship(championship: WcaChampionshipRecord): PublicChampionship {
  return {
    championshipType: championship.championshipType,
    competitionId: championship.competitionId,
    id: championship.id,
  }
}

export function publicChampionshipEligibleCountry(record: WcaChampionshipEligibleCountryRecord): PublicChampionshipEligibleCountry {
  return {
    championshipType: record.championshipType,
    eligibleCountryIso2: record.eligibleCountryIso2,
  }
}

export function publicCompetition(competition: WcaCompetitionRecord): PublicCompetition {
  return {
    cancelled: competition.cancelled,
    city: competition.city,
    countryIso2: competition.countryId,
    date: {
      end: dateString(competition.year, competition.endMonth, competition.endDay),
      numberOfDays: daysBetween(
        new Date(Date.UTC(competition.year, competition.month - 1, competition.day)),
        new Date(Date.UTC(competition.year, competition.endMonth - 1, competition.endDay)),
      ) + 1,
      start: dateString(competition.year, competition.month, competition.day),
    },
    delegates: peopleList(competition.wcaDelegates),
    events: eventIds(competition),
    externalWebsite: competition.externalWebsite === '' ? null : competition.externalWebsite,
    id: competition.id,
    information: competition.information,
    name: competition.name,
    organizers: peopleList(competition.organisers),
    venue: {
      address: competition.venueAddress,
      coordinates: {
        latitude: microdegrees(competition.latitude),
        longitude: microdegrees(competition.longitude),
      },
      details: competition.venueDetails,
      name: competition.venue,
    },
  }
}

export function publicPerson(person: WcaPersonRecord): PublicPerson {
  return {
    countryIso2: person.countryId,
    gender: person.gender,
    id: person.id,
    name: person.name,
  }
}

export function publicRank(rank: WcaRankRecord, type: 'average' | 'single', region: 'continent' | 'country' | 'world'): PublicRank {
  return {
    best: resultValue(rank.best),
    eventId: rank.eventId,
    personId: rank.personId,
    rank: {
      continent: rank.continentRank,
      country: rank.countryRank,
      selected: rankValue(rank, region),
      world: rank.worldRank,
    },
    region,
    type,
  }
}

export function publicRoundType(roundType: WcaRoundTypeRecord): PublicRoundType {
  return {
    cellName: roundType.cellName,
    id: roundType.id,
    isFinal: roundType.final,
    name: roundType.name,
  }
}

export function publicResult(result: WcaResultRecord): PublicResult {
  return {
    average: resultValue(result.average),
    best: resultValue(result.best),
    competitionId: result.competitionId,
    eventId: result.eventId,
    format: result.format,
    personId: result.personId,
    position: result.position,
    regionalAverageRecord: result.regionalAverageRecord,
    regionalSingleRecord: result.regionalSingleRecord,
    round: result.round,
    solves: result.solves.map(resultValue),
  }
}

export function publicScramble(scramble: WcaScrambleRecord): PublicScramble {
  return {
    competitionId: scramble.competitionId,
    eventId: scramble.eventId,
    groupId: scramble.groupId,
    id: scramble.id,
    isExtra: scramble.isExtra,
    roundTypeId: scramble.roundTypeId,
    scramble: scramble.scramble,
    scrambleNumber: scramble.scrambleNumber,
  }
}

function resultValue(raw: number): PublicResultValue {
  return { raw }
}

function eventIds(competition: WcaCompetitionRecord): string[] {
  return competition.eventSpecs.split(/\s+/).filter(Boolean)
}

function dateString(year: number, month: number, day: number): string {
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
}

function daysBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000))
}

function peopleList(value: string): PublicPersonName[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const match = /^(?<name>.*?)\s*<(?<email>[^>]+)>$/.exec(item)
      return {
        email: match?.groups?.email ?? null,
        name: match?.groups?.name?.trim() ?? item,
      }
    })
}

function microdegrees(value: string): number | null {
  if (value === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed / 1_000_000 : null
}

function rankValue(rank: WcaRankRecord, region: 'continent' | 'country' | 'world'): number {
  switch (region) {
    case 'continent':
      return rank.continentRank
    case 'country':
      return rank.countryRank
    case 'world':
      return rank.worldRank
  }
}
