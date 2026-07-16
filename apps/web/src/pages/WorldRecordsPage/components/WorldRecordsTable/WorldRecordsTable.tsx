import { Badge } from '@components/Badge'
import { Button } from '@components/Button'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@components/Table'
import { useTranslation } from 'react-i18next'
import type { WcaWorldRecord } from '@api/wcaData'
import { formatRecordValue } from '../../worldRecordFormat'

type WorldRecordsTableProps = {
  isLoading: boolean
  records: WcaWorldRecord[]
  onSelectRecord: (record: WcaWorldRecord) => void
}

export function WorldRecordsTable({ isLoading, records, onSelectRecord }: WorldRecordsTableProps) {
  const { t } = useTranslation()
  return (
    <div className='overflow-hidden border'>
      <Table className='min-w-[50rem]'>
        <TableCaption className='sr-only'>{t('worldRecords.table.caption')}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className='w-20' scope='col'>
              {t('worldRecords.table.rank')}
            </TableHead>
            <TableHead className='w-56' scope='col'>
              {t('worldRecords.table.athlete')}
            </TableHead>
            <TableHead scope='col'>{t('worldRecords.table.result')}</TableHead>
            <TableHead scope='col'>{t('worldRecords.table.type')}</TableHead>
            <TableHead scope='col'>{t('worldRecords.table.competition')}</TableHead>
            <TableHead scope='col'>{t('worldRecords.table.scramble')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? <LoadingRows /> : null}
          {!isLoading && records.length === 0 ? (
            <TableRow>
              <TableCell className='h-28 text-center text-muted-foreground' colSpan={6}>
                {t('worldRecords.table.empty')}
              </TableCell>
            </TableRow>
          ) : null}
          {!isLoading &&
            records.map((record) => (
              <TableRow key={recordKey(record)}>
                <TableCell className='font-mono text-sm text-muted-foreground'>
                  #{record.rank.world}
                </TableCell>
                <TableCell>
                  <Button
                    className='h-auto justify-start px-0 py-0 text-start font-medium'
                    type='button'
                    variant='link'
                    onClick={() => onSelectRecord(record)}
                  >
                    <span className='grid min-w-0'>
                      <span className='truncate'>{record.athlete.name}</span>
                      <span className='text-xs font-normal text-muted-foreground'>
                        {record.athlete.id}
                      </span>
                    </span>
                  </Button>
                </TableCell>
                <TableCell className='font-mono text-base font-semibold text-primary'>
                  {formatRecordValue(record, (count) => t('worldRecords.moves', { count }))}
                </TableCell>
                <TableCell>
                  <Badge variant='outline'>{t(`worldRecords.types.${record.type}`)}</Badge>
                </TableCell>
                <TableCell>
                  {record.competition === null ? (
                    <span className='text-muted-foreground'>{t('worldRecords.unknown')}</span>
                  ) : (
                    <span className='grid min-w-0'>
                      <span className='truncate'>{record.competition.name}</span>
                      <span className='text-xs text-muted-foreground'>
                        {record.competition.date.start}
                      </span>
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <ScrambleCell record={record} />
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  )
}

function LoadingRows() {
  return Array.from({ length: 8 }, (_, index) => (
    <TableRow key={index}>
      <TableCell colSpan={6}>
        <div className='h-5 animate-pulse bg-muted' />
      </TableCell>
    </TableRow>
  ))
}

function ScrambleCell({ record }: { record: WcaWorldRecord }) {
  const { t } = useTranslation()
  if (record.scramble.status === 'unavailable') {
    return <Badge variant='secondary'>{t('worldRecords.scramble.unavailable')}</Badge>
  }

  if (record.scramble.status === 'ambiguous') {
    return (
      <Badge variant='outline'>
        {t('worldRecords.scramble.candidates', { count: record.scramble.candidates.length })}
      </Badge>
    )
  }

  const [candidate] = record.scramble.candidates

  return candidate === undefined ? (
    <Badge variant='secondary'>{t('worldRecords.scramble.unavailable')}</Badge>
  ) : (
    <code
      className='block max-w-72 truncate text-xs text-muted-foreground'
      title={candidate.scramble}
    >
      {candidate.scramble}
    </code>
  )
}

function recordKey(record: WcaWorldRecord): string {
  return `${record.event.id}:${record.type}:${record.athlete.id}:${record.result?.id ?? 'none'}:${record.value.raw}`
}
