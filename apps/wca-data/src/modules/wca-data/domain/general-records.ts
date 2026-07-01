export type WcaContinentRecord = {
  id: string
  name: string
}

export type WcaChampionshipRecord = {
  championshipType: string
  competitionId: string | null
  id: number
}

export type WcaCompetitionRecord = {
  cancelled: boolean
  cellName: string
  city: string
  countryId: string | null
  day: number
  endDay: number
  endMonth: number
  eventSpecs: string
  externalWebsite: string
  id: string
  information: string
  latitude: string
  longitude: string
  month: number
  name: string
  organisers: string
  venue: string
  venueAddress: string
  venueDetails: string
  wcaDelegates: string
  year: number
}

export type WcaCountryRecord = {
  continentId: string | null
  iso2Code: string
  name: string
}

export type WcaEventRecord = {
  format: 'multi' | 'number' | 'time'
  id: string
  name: string
}

export type WcaFormatRecord = {
  expectedSolveCount: number
  id: string
  name: string
  shortName: string
  sortBy: string
  sortBySecond: string
  trimFastestN: number
  trimSlowestN: number
}

export type WcaPersonRecord = {
  countryId: string | null
  gender: string
  id: string
  name: string
  subId: number
}

export type WcaResultDocument = {
  items: WcaResultRecord[]
  path: string
}

export type WcaResultRecord = {
  average: number
  best: number
  competitionId: string
  eventId: string
  format: string
  isFinalRound: boolean
  personId: string
  position: number
  regionalAverageRecord: string | null
  regionalSingleRecord: string | null
  round: string
  solves: number[]
}

export type WcaRankDocument = {
  items: WcaRankRecord[]
  path: string
}

export type WcaRankRecord = {
  best: number
  continentId: string | null
  continentRank: number
  countryId: string | null
  countryRank: number
  eventId: string
  personId: string
  worldRank: number
}

export type WcaRoundTypeRecord = {
  cellName: string
  final: boolean
  id: string
  name: string
}

export type WcaScrambleRecord = {
  competitionId: string
  eventId: string
  groupId: string
  id: number
  isExtra: boolean
  roundTypeId: string
  scramble: string
  scrambleNumber: number
}
