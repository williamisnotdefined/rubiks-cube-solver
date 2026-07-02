import type { WcaDataListInput, WcaDataListResponse, WcaDataMeta } from '../wca-data-public.types.js'

const defaultPage = 1
const defaultPageSize = 50
const maxPageSize = 100

export function listResponse<TItem>(
  data: TItem[],
  pagination: { page: number; pageSize: number; total: number },
  meta: WcaDataMeta,
): WcaDataListResponse<TItem> {
  return {
    data,
    meta,
    pagination: {
      ...pagination,
      hasNextPage: pagination.page * pagination.pageSize < pagination.total,
    },
  }
}

export function pageResponse<TItem>(items: TItem[], input: WcaDataListInput, meta: WcaDataMeta): WcaDataListResponse<TItem> {
  const page = normalizedPage(input.page)
  const pageSize = normalizedPageSize(input.pageSize)
  const start = (page - 1) * pageSize
  const data = items.slice(start, start + pageSize)

  return {
    data,
    meta,
    pagination: {
      hasNextPage: start + pageSize < items.length,
      page,
      pageSize,
      total: items.length,
    },
  }
}

export function normalizedPage(value: number | undefined): number {
  return value === undefined || value < 1 ? defaultPage : Math.floor(value)
}

export function normalizedPageSize(value: number | undefined): number {
  if (value === undefined || value < 1) {
    return defaultPageSize
  }

  return Math.min(Math.floor(value), maxPageSize)
}
