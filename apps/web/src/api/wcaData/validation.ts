import { ApiResponseValidationError } from '@api/client'
import type {
  WcaDataItemResponse,
  WcaDataListResponse,
  WcaEvent,
  WcaPersonProfile,
  WcaWorldRecord,
} from './types'

const eventFormats = ['multi', 'number', 'time'] as const
const recordTypes = ['average', 'single'] as const
const scrambleStatuses = ['ambiguous', 'exact', 'unavailable'] as const

export function parseWcaEventsResponse(value: unknown): WcaDataListResponse<WcaEvent> {
  if (!isListResponseOf(value, isWcaEvent)) {
    throw new ApiResponseValidationError('WCA events')
  }

  return value
}

export function parseWcaWorldRecordsResponse(value: unknown): WcaDataListResponse<WcaWorldRecord> {
  if (!isListResponseOf(value, isWcaWorldRecord)) {
    throw new ApiResponseValidationError('WCA world records')
  }

  return value
}

export function parseWcaPersonProfileResponse(
  value: unknown,
): WcaDataItemResponse<WcaPersonProfile> {
  if (!isItemResponseOf(value, isWcaPersonProfile)) {
    throw new ApiResponseValidationError('WCA person profile')
  }

  return value
}

function isListResponseOf<TItem>(
  value: unknown,
  isItem: (item: unknown) => item is TItem,
): value is WcaDataListResponse<TItem> {
  return isListResponse(value) && value.data.every(isItem)
}

function isItemResponseOf<TItem>(
  value: unknown,
  isItem: (item: unknown) => item is TItem,
): value is WcaDataItemResponse<TItem> {
  return isRecord(value) && isMeta(value.meta) && isItem(value.data)
}

function isListResponse(value: unknown): value is {
  data: unknown[]
  meta: WcaDataListResponse<unknown>['meta']
  pagination: WcaDataListResponse<unknown>['pagination']
} {
  return (
    isRecord(value) &&
    Array.isArray(value.data) &&
    isMeta(value.meta) &&
    isRecord(value.pagination) &&
    typeof value.pagination.hasNextPage === 'boolean' &&
    isFiniteNumber(value.pagination.page) &&
    isFiniteNumber(value.pagination.pageSize) &&
    isFiniteNumber(value.pagination.total)
  )
}

function isMeta(value: unknown): value is WcaDataListResponse<unknown>['meta'] {
  return (
    isRecord(value) &&
    typeof value.datasetId === 'string' &&
    isIsoDateString(value.exportDate) &&
    typeof value.exportVersion === 'string' &&
    value.source === 'World Cube Association Results Export'
  )
}

function isWcaEvent(value: unknown): value is WcaEvent {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    isOneOf(value.format, eventFormats)
  )
}

function isWcaWorldRecord(value: unknown): value is WcaWorldRecord {
  return (
    isRecord(value) &&
    isOneOf(value.type, recordTypes) &&
    isResultValue(value.value) &&
    isAthlete(value.athlete) &&
    isWcaEvent(value.event) &&
    isRank(value.rank) &&
    (value.competition === null || isCompetition(value.competition)) &&
    (value.result === null || isResult(value.result)) &&
    isScramble(value.scramble)
  )
}

function isWcaPersonProfile(value: unknown): value is WcaPersonProfile {
  return (
    isRecord(value) &&
    isNullableHttpUrl(value.avatarThumbUrl) &&
    isNullableHttpUrl(value.avatarUrl) &&
    isNullableFiniteNumber(value.competitionCount) &&
    isNullableString(value.countryIso2) &&
    isNullableString(value.countryName) &&
    typeof value.gender === 'string' &&
    typeof value.id === 'string' &&
    (value.medals === null || isMedals(value.medals)) &&
    typeof value.name === 'string' &&
    (value.records === null || isRecordCounts(value.records)) &&
    isNullableFiniteNumber(value.totalSolves) &&
    isHttpUrl(value.wcaUrl)
  )
}

function isAthlete(value: unknown): boolean {
  return (
    isRecord(value) &&
    isNullableHttpUrl(value.avatarUrl) &&
    isNullableString(value.countryIso2) &&
    isNullableString(value.countryName) &&
    typeof value.gender === 'string' &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    isHttpUrl(value.wcaUrl)
  )
}

function isRank(value: unknown): boolean {
  return (
    isRecord(value) &&
    isFiniteNumber(value.continent) &&
    isFiniteNumber(value.country) &&
    isFiniteNumber(value.world)
  )
}

function isCompetition(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.date)) {
    return false
  }

  const start = value.date.start
  const end = value.date.end

  return (
    typeof value.city === 'string' &&
    isNullableString(value.countryIso2) &&
    isIsoCalendarDate(end) &&
    isFiniteNumber(value.date.numberOfDays) &&
    isIsoCalendarDate(start) &&
    start <= end &&
    typeof value.id === 'string' &&
    typeof value.name === 'string'
  )
}

function isResult(value: unknown): boolean {
  return (
    isRecord(value) &&
    Array.isArray(value.attemptNumbers) &&
    value.attemptNumbers.every(isFiniteNumber) &&
    isResultValue(value.average) &&
    isResultValue(value.best) &&
    typeof value.format === 'string' &&
    isFiniteNumber(value.id) &&
    isFiniteNumber(value.position) &&
    isNullableString(value.regionalAverageRecord) &&
    isNullableString(value.regionalSingleRecord) &&
    typeof value.round === 'string' &&
    typeof value.roundTypeId === 'string' &&
    Array.isArray(value.solves) &&
    value.solves.every(isResultValue)
  )
}

function isResultValue(value: unknown): boolean {
  return isRecord(value) && isFiniteNumber(value.raw)
}

function isScramble(value: unknown): boolean {
  return (
    isRecord(value) &&
    isOneOf(value.status, scrambleStatuses) &&
    Array.isArray(value.candidates) &&
    value.candidates.every(isScrambleCandidate)
  )
}

function isScrambleCandidate(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.competitionId === 'string' &&
    typeof value.eventId === 'string' &&
    typeof value.groupId === 'string' &&
    isFiniteNumber(value.id) &&
    typeof value.isExtra === 'boolean' &&
    typeof value.roundTypeId === 'string' &&
    typeof value.scramble === 'string' &&
    isFiniteNumber(value.scrambleNumber)
  )
}

function isMedals(value: unknown): boolean {
  return (
    isRecord(value) &&
    isFiniteNumber(value.bronze) &&
    isFiniteNumber(value.gold) &&
    isFiniteNumber(value.silver) &&
    isFiniteNumber(value.total)
  )
}

function isRecordCounts(value: unknown): boolean {
  return (
    isRecord(value) &&
    isFiniteNumber(value.continental) &&
    isFiniteNumber(value.national) &&
    isFiniteNumber(value.total) &&
    isFiniteNumber(value.world)
  )
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isNullableHttpUrl(value: unknown): value is string | null {
  return value === null || isHttpUrl(value)
}

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value !== value.trim()) {
    return false
  }

  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function isIsoDateString(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false
  }

  const match =
    /^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?)?$/.exec(
      value,
    )

  return (
    match !== null &&
    isValidCalendarDate(match[1], match[2], match[3]) &&
    !Number.isNaN(Date.parse(value))
  )
}

function isIsoCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return match !== null && isValidCalendarDate(match[1], match[2], match[3])
}

function isValidCalendarDate(yearValue: string, monthValue: string, dayValue: string): boolean {
  const year = Number(yearValue)
  const month = Number(monthValue)
  const day = Number(dayValue)
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth[month - 1]
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isOneOf<TValue extends string>(
  value: unknown,
  allowed: readonly TValue[],
): value is TValue {
  return typeof value === 'string' && allowed.includes(value as TValue)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
