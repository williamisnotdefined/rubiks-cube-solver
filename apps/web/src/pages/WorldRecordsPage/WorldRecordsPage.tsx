import {
  canonicalizeWcaWorldRecordsQuery,
  useGetWcaEvents,
  useGetWorldRecords,
  type WcaWorldRecord,
  type WcaWorldRecordsQuery,
  type WcaWorldRecordType,
  wcaWorldRecordsPageSizes,
} from '@api/wcaData'
import { Button } from '@components/Button'
import { Field } from '@components/Field'
import { Input } from '@components/Input'
import { PageDescription } from '@components/layout/PageDescription'
import { PageHeader } from '@components/layout/PageHeader'
import { PageScaffold } from '@components/layout/PageScaffold'
import { PageTitle } from '@components/layout/PageTitle'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/Select'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Database,
  RotateCcw,
  Search,
} from 'lucide-react'
import { startTransition, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { AthleteRecordSheet } from './components/AthleteRecordSheet'
import { WorldRecordsTable } from './components/WorldRecordsTable'

const allTypesValue = 'all-types'
const defaultEventId = '333'
export function WorldRecordsPage() {
  const { i18n, t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedRecord, setSelectedRecord] = useState<WcaWorldRecord | null>(null)
  const query = worldRecordsQueryFromSearch(searchParams)
  const recordsQueryKey = JSON.stringify([
    query.eventId,
    query.page,
    query.pageSize,
    query.search,
    query.type,
  ])
  const [selectedRecordQueryKey, setSelectedRecordQueryKey] = useState(recordsQueryKey)
  const searchValueFromUrl = query.search ?? ''
  const [searchInput, setSearchInput] = useState(searchValueFromUrl)
  const searchInputRef = useRef(searchValueFromUrl)
  const searchInputSyncedFromUrlRef = useRef(false)
  const eventsQuery = useGetWcaEvents()
  const recordsQuery = useGetWorldRecords(query)
  const pagination = recordsQuery.data?.pagination
  const currentPage = pagination?.page ?? query.page
  const totalPages =
    pagination === undefined ? 1 : Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
  const pageNumbers = worldRecordsPageNumbers(currentPage, totalPages)

  if (selectedRecordQueryKey !== recordsQueryKey) {
    setSelectedRecordQueryKey(recordsQueryKey)
    setSelectedRecord(null)
  }

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
    <PageScaffold contentClassName='max-w-7xl gap-5'>
      <PageHeader>
        <div className='flex flex-col gap-3 md:flex-row md:items-end md:justify-between'>
          <div className='grid gap-2'>
            <p className='flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground'>
              <Database aria-hidden='true' className='size-4' />
              {t('worldRecords.kicker')}
            </p>
            <PageTitle>{t('navigation.worldRecords')}</PageTitle>
            <PageDescription>{t('worldRecords.description')}</PageDescription>
          </div>
          {recordsQuery.data?.meta.exportDate === undefined ? null : (
            <p className='text-xs text-muted-foreground'>
              {t('worldRecords.dataset', {
                date: formatDatasetDate(recordsQuery.data.meta.exportDate, i18n.resolvedLanguage),
              })}
            </p>
          )}
        </div>
      </PageHeader>

      <section className='grid gap-3' role='search'>
        <div className='grid gap-2 md:grid-cols-[minmax(12rem,1fr)_12rem_12rem_auto] md:items-center'>
          <Field
            className='gap-1'
            controlId='records-search'
            label={t('worldRecords.filters.search')}
            labelClassName='sr-only'
          >
            <span className='relative'>
              <Search
                aria-hidden='true'
                className='pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground'
              />
              <Input
                className='ps-9'
                id='records-search'
                placeholder={t('worldRecords.filters.searchPlaceholder')}
                value={searchInput}
                onChange={(event) => updateSearchInput(event.target.value)}
              />
            </span>
          </Field>
          <Field
            className='gap-1'
            controlId='records-event'
            label={t('worldRecords.filters.event')}
            labelClassName='sr-only'
          >
            <Select value={query.eventId} onValueChange={(value) => updateFilter('eventId', value)}>
              <SelectTrigger id='records-event'>
                <SelectValue placeholder='3x3x3 Cube' />
              </SelectTrigger>
              <SelectContent>
                {(eventsQuery.data?.data ?? []).map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field
            className='gap-1'
            controlId='records-type'
            label={t('worldRecords.filters.type')}
            labelClassName='sr-only'
          >
            <Select
              value={query.type ?? allTypesValue}
              onValueChange={(value) =>
                updateFilter('type', value === allTypesValue ? null : value)
              }
            >
              <SelectTrigger id='records-type'>
                <SelectValue placeholder={t('worldRecords.types.all')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={allTypesValue}>{t('worldRecords.types.all')}</SelectItem>
                <SelectItem value='single'>{t('worldRecords.types.single')}</SelectItem>
                <SelectItem value='average'>{t('worldRecords.types.average')}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Button className='gap-2' type='button' variant='outline' onClick={resetFilters}>
            <RotateCcw aria-hidden='true' className='size-4' />
            {t('worldRecords.filters.reset')}
          </Button>
        </div>
      </section>

      {recordsQuery.isError ? (
        <div
          className='border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive'
          role='alert'
        >
          {t('worldRecords.loadError')}
        </div>
      ) : null}

      <WorldRecordsTable
        isLoading={recordsQuery.isLoading}
        records={recordsQuery.data?.data ?? []}
        onSelectRecord={setSelectedRecord}
      />

      <div className='flex flex-col gap-3 text-sm md:flex-row md:items-center md:justify-between'>
        <div className='flex items-center gap-3'>
          <Select
            value={String(query.pageSize)}
            onValueChange={(value) => updateFilter('pageSize', value)}
          >
            <SelectTrigger className='w-28'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {wcaWorldRecordsPageSizes.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {t('worldRecords.pagination.rowsOption', { count: option })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className='text-muted-foreground'>{t('worldRecords.pagination.rowsPerPage')}</span>
        </div>
        <span className='text-muted-foreground'>
          {t('worldRecords.pagination.pageOf', { current: currentPage, total: totalPages })}
        </span>
        <nav
          className='flex flex-wrap items-center gap-2 md:justify-end'
          aria-label={t('worldRecords.pagination.label')}
        >
          <Button
            aria-label={t('worldRecords.pagination.first')}
            className='size-11 px-0 md:size-9'
            disabled={currentPage <= 1 || recordsQuery.isFetching}
            type='button'
            variant='outline'
            onClick={() => updatePage(1)}
          >
            <ChevronsLeft aria-hidden='true' className='size-4' />
          </Button>
          <Button
            aria-label={t('worldRecords.pagination.previous')}
            className='size-11 px-0 md:size-9'
            disabled={currentPage <= 1 || recordsQuery.isFetching}
            type='button'
            variant='outline'
            onClick={() => updatePage(Math.max(1, currentPage - 1))}
          >
            <ChevronLeft aria-hidden='true' className='size-4' />
          </Button>
          {pageNumbers.map((pageNumber, index) =>
            pageNumber === 'ellipsis' ? (
              <span
                className='grid size-9 place-items-center text-sm text-muted-foreground'
                key={`ellipsis-${index}`}
              >
                ...
              </span>
            ) : (
              <Button
                aria-current={currentPage === pageNumber ? 'page' : undefined}
                aria-label={t('worldRecords.pagination.page', { page: pageNumber })}
                className='size-11 px-0 md:size-9'
                disabled={recordsQuery.isFetching}
                key={pageNumber}
                type='button'
                variant={currentPage === pageNumber ? 'primary' : 'outline'}
                onClick={() => updatePage(pageNumber)}
              >
                {pageNumber}
              </Button>
            ),
          )}
          <Button
            aria-label={t('worldRecords.pagination.next')}
            className='size-11 px-0 md:size-9'
            disabled={
              currentPage >= totalPages || !pagination?.hasNextPage || recordsQuery.isFetching
            }
            type='button'
            variant='outline'
            onClick={() => updatePage(Math.min(totalPages, currentPage + 1))}
          >
            <ChevronRight aria-hidden='true' className='size-4' />
          </Button>
          <Button
            aria-label={t('worldRecords.pagination.last')}
            className='size-11 px-0 md:size-9'
            disabled={currentPage >= totalPages || recordsQuery.isFetching}
            type='button'
            variant='outline'
            onClick={() => updatePage(totalPages)}
          >
            <ChevronsRight aria-hidden='true' className='size-4' />
          </Button>
        </nav>
      </div>

      <AthleteRecordSheet
        record={selectedRecord}
        onOpenChange={(open) => !open && setSelectedRecord(null)}
      />
    </PageScaffold>
  )
}

function worldRecordsQueryFromSearch(
  searchParams: URLSearchParams,
): WcaWorldRecordsQuery & { page: number; pageSize: number } {
  const query: WcaWorldRecordsQuery = {
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

  const canonical = canonicalizeWcaWorldRecordsQuery(query)

  return {
    ...canonical,
    page: canonical.page ?? 1,
    pageSize: canonical.pageSize ?? 25,
  }
}

function positiveInteger(value: string | null, fallback: number): number {
  const parsed = Number(value)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function worldRecordType(value: string | null): WcaWorldRecordType | null {
  return value === 'single' || value === 'average' ? value : null
}

function formatDatasetDate(value: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value))
}

function worldRecordsPageNumbers(
  currentPage: number,
  totalPages: number,
): Array<number | 'ellipsis'> {
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
