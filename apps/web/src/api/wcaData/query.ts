import type { CanonicalWcaWorldRecordsQuery, WcaWorldRecordsQuery } from './types'

export const wcaWorldRecordsPageSizes = [25, 50, 100] as const

export function canonicalizeWcaWorldRecordsQuery(
  query: WcaWorldRecordsQuery,
): CanonicalWcaWorldRecordsQuery {
  const canonical: CanonicalWcaWorldRecordsQuery = {
    eventId: query.eventId.trim(),
  }
  const search = query.search?.trim()

  if (query.type === 'average' || query.type === 'single') {
    canonical.type = query.type
  }
  if (search !== undefined && search.length > 0) {
    canonical.search = search
  }
  if (query.page !== undefined) {
    canonical.page = positiveInteger(query.page, 1)
  }
  if (query.pageSize !== undefined) {
    canonical.pageSize = closestPageSize(query.pageSize)
  }

  return canonical
}

function positiveInteger(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback
}

function closestPageSize(value: number): 25 | 50 | 100 {
  const normalized = Number.isFinite(value) ? value : wcaWorldRecordsPageSizes[0]

  return wcaWorldRecordsPageSizes.reduce((closest, candidate) =>
    Math.abs(candidate - normalized) < Math.abs(closest - normalized) ? candidate : closest,
  )
}
