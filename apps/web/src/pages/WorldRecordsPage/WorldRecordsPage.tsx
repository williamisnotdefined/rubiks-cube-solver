import { startTransition, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { useGetWcaEvents, useGetWorldRecords, type WcaWorldRecord, type WcaWorldRecordsQuery, type WcaWorldRecordType } from '@api/wcaData'
import { Button } from '@components/Button'
import { Input } from '@components/Input'
import { PageHeader } from '@components/layout/PageHeader'
import { PageScaffold } from '@components/layout/PageScaffold'
import { PageTitle } from '@components/layout/PageTitle'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/Select'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Database, RotateCcw, Search } from 'lucide-react'
import { AthleteRecordSheet } from './components/AthleteRecordSheet'
import { WorldRecordsTable } from './components/WorldRecordsTable'

const allTypesValue = 'all-types'
const defaultEventId = '333'
const pageSizeOptions = [25, 50, 100]

export function WorldRecordsPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedRecord, setSelectedRecord] = useState<WcaWorldRecord | null>(null)
  const query = worldRecordsQueryFromSearch(searchParams)
  const searchValueFromUrl = query.search ?? ''
  const [searchInput, setSearchInput] = useState(searchValueFromUrl)
  const searchInputRef = useRef(searchValueFromUrl)
  const searchInputSyncedFromUrlRef = useRef(false)
  const eventsQuery = useGetWcaEvents()
  const recordsQuery = useGetWorldRecords(query)
  const pagination = recordsQuery.data?.pagination
  const currentPage = pagination?.page ?? query.page
  const totalPages = pagination === undefined ? 1 : Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
  const pageNumbers = worldRecordsPageNumbers(currentPage, totalPages)

  useEffect(() => {
    if (searchInputRef.current === searchValueFromUrl) {
      return
    }

    searchInputSyncedFromUrlRef.current = true
    searchInputRef.current = searchValueFromUrl
    setSearchInput(searchValueFromUrl)
  }, [searchValueFromUrl])

  useEffect(() => {
    if (searchInputSyncedFromUrlRef.current) {
      searchInputSyncedFromUrlRef.current = false
      return undefined
    }

    const normalizedSearch = searchInput.trim()

    if (normalizedSearch === searchValueFromUrl) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      const nextParams = new URLSearchParams(searchParams)

      if (normalizedSearch.length === 0) {
        nextParams.delete('search')
      } else {
        nextParams.set('search', normalizedSearch)
      }

      nextParams.delete('page')
      startTransition(() => setSearchParams(nextParams))
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [searchInput, searchParams, searchValueFromUrl, setSearchParams])

  function updateFilter(key: string, value: string | null) {
    const nextParams = new URLSearchParams(searchParams)

    if (value === null || value.length === 0) {
      nextParams.delete(key)
    } else {
      nextParams.set(key, value)
    }

    nextParams.delete('page')
    startTransition(() => setSearchParams(nextParams))
  }

  function updatePage(nextPage: number) {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('page', String(nextPage))
    startTransition(() => setSearchParams(nextParams))
  }

  function resetFilters() {
    const nextParams = new URLSearchParams()
    nextParams.set('eventId', defaultEventId)
    searchInputRef.current = ''
    setSearchInput('')
    startTransition(() => setSearchParams(nextParams))
  }

  function updateSearchInput(value: string) {
    searchInputRef.current = value
    setSearchInput(value)
  }

  return (
    <PageScaffold contentClassName="max-w-7xl gap-5">
      <PageHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="grid gap-2">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Database aria-hidden="true" className="size-4" />
              Records and Data
            </p>
            <PageTitle>{t('navigation.worldRecords')}</PageTitle>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              WCA world leaderboard records enriched with athlete, competition, result attempts, and official scramble candidates.
            </p>
          </div>
          {recordsQuery.data?.meta.exportDate === undefined ? null : (
            <p className="text-xs text-muted-foreground">Dataset: {formatDatasetDate(recordsQuery.data.meta.exportDate)}</p>
          )}
        </div>
      </PageHeader>

      <section className="grid gap-3" role="search">
        <div className="grid gap-2 md:grid-cols-[minmax(12rem,1fr)_12rem_12rem_auto] md:items-center">
          <label className="grid gap-1 text-sm">
            <span className="sr-only">Search</span>
            <span className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="ps-9"
                placeholder="Athlete, WCA ID, country"
                value={searchInput}
                onChange={(event) => updateSearchInput(event.target.value)}
              />
            </span>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="sr-only">Event</span>
            <Select value={query.eventId} onValueChange={(value) => updateFilter('eventId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="3x3x3 Cube" />
              </SelectTrigger>
              <SelectContent>
                {(eventsQuery.data?.data ?? []).map((event) => (
                  <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="sr-only">Type</span>
            <Select value={query.type ?? allTypesValue} onValueChange={(value) => updateFilter('type', value === allTypesValue ? null : value)}>
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={allTypesValue}>All types</SelectItem>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="average">Average</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <Button className="gap-2" type="button" variant="outline" onClick={resetFilters}>
            <RotateCcw aria-hidden="true" className="size-4" />
            Reset
          </Button>
        </div>
      </section>

      {recordsQuery.isError ? (
        <div className="border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
          Could not load world records from the WCA Data API.
        </div>
      ) : null}

      <WorldRecordsTable
        isLoading={recordsQuery.isLoading}
        records={recordsQuery.data?.data ?? []}
        onSelectRecord={setSelectedRecord}
      />

      <div className="flex flex-col gap-3 text-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Select value={String(query.pageSize)} onValueChange={(value) => updateFilter('pageSize', value)}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>{option} rows</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground">Rows per page</span>
        </div>
        <span className="text-muted-foreground">
          Page {currentPage} of {totalPages}
        </span>
        <div className="flex flex-wrap items-center gap-2 md:justify-end" aria-label="World records pagination">
          <Button aria-label="First page" className="size-9 px-0" disabled={currentPage <= 1 || recordsQuery.isFetching} type="button" variant="outline" onClick={() => updatePage(1)}>
            <ChevronsLeft aria-hidden="true" className="size-4" />
          </Button>
          <Button aria-label="Previous page" className="size-9 px-0" disabled={currentPage <= 1 || recordsQuery.isFetching} type="button" variant="outline" onClick={() => updatePage(Math.max(1, currentPage - 1))}>
            <ChevronLeft aria-hidden="true" className="size-4" />
          </Button>
          {pageNumbers.map((pageNumber, index) => (
            pageNumber === 'ellipsis' ? (
              <span className="grid size-9 place-items-center text-sm text-muted-foreground" key={`ellipsis-${index}`}>
                ...
              </span>
            ) : (
              <Button
                aria-current={currentPage === pageNumber ? 'page' : undefined}
                aria-label={`Page ${pageNumber}`}
                className="size-9 px-0"
                disabled={recordsQuery.isFetching}
                key={pageNumber}
                type="button"
                variant={currentPage === pageNumber ? 'primary' : 'outline'}
                onClick={() => updatePage(pageNumber)}
              >
                {pageNumber}
              </Button>
            )
          ))}
          <Button aria-label="Next page" className="size-9 px-0" disabled={currentPage >= totalPages || !pagination?.hasNextPage || recordsQuery.isFetching} type="button" variant="outline" onClick={() => updatePage(Math.min(totalPages, currentPage + 1))}>
            <ChevronRight aria-hidden="true" className="size-4" />
          </Button>
          <Button aria-label="Last page" className="size-9 px-0" disabled={currentPage >= totalPages || recordsQuery.isFetching} type="button" variant="outline" onClick={() => updatePage(totalPages)}>
            <ChevronsRight aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </div>

      <AthleteRecordSheet record={selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)} />
    </PageScaffold>
  )
}

function worldRecordsQueryFromSearch(searchParams: URLSearchParams): WcaWorldRecordsQuery & { page: number; pageSize: number } {
  const query: WcaWorldRecordsQuery & { page: number; pageSize: number } = {
    eventId: defaultEventId,
    page: positiveInteger(searchParams.get('page'), 1),
    pageSize: positiveInteger(searchParams.get('pageSize'), 25),
  }
  const eventId = searchParams.get('eventId')
  const search = searchParams.get('search')
  const type = worldRecordType(searchParams.get('type'))

  if (eventId !== null && eventId.length > 0) {
    query.eventId = eventId
  }

  if (search !== null && search.length > 0) {
    query.search = search
  }

  if (type !== null) {
    query.type = type
  }

  return query
}

function positiveInteger(value: string | null, fallback: number): number {
  const parsed = Number(value)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function worldRecordType(value: string | null): WcaWorldRecordType | null {
  return value === 'single' || value === 'average' ? value : null
}

function formatDatasetDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}

function worldRecordsPageNumbers(currentPage: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, 'ellipsis', totalPages]
  }

  if (currentPage >= totalPages - 2) {
    return [1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  }

  return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages]
}
