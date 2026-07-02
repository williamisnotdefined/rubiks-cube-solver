import cls from 'classnames'
import { Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useTranslation } from 'react-i18next'
import { Button } from '@components/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@components/Table'
import { formatTimerTime } from '@core/timer/formatTimerTime'
import type { TimerPenalty } from '@core/timer/penalties'

const virtualTableEstimatedRowHeight = 56
const virtualTableFallbackHeight = 640
const virtualTableFallbackRowCount = 24
const virtualTableInitialRect = { height: virtualTableFallbackHeight, width: 0 }

type VirtualSolveRow = {
  end: number
  index: number
  start: number
}

export type SolveTableRow = {
  finalTimeMs: number | null
  id: string
  index: number
  penalty: TimerPenalty
  rawTimeMs: number
  scramble: string
}

type SolveTableProps = {
  className?: string
  rows: readonly SolveTableRow[]
  showMilliseconds?: boolean
  onDeleteSolve?: (solveId: string) => void
}

const solveTableCoreRowModel = getCoreRowModel<SolveTableRow>()

export function SolveTable(props: SolveTableProps) {
  if (props.rows.length === 0) {
    return <EmptySolveTable className={props.className} />
  }

  if (props.rows.length <= virtualTableFallbackRowCount) {
    return <PlainSolveTable {...props} />
  }

  return <VirtualizedSolveTable {...props} />
}

function EmptySolveTable({ className }: Pick<SolveTableProps, 'className'>) {
  const { t } = useTranslation()

  return (
    <section className={cls('flex h-full min-h-0 items-center justify-center p-4 text-center text-foreground', className)} aria-label={t('timer.solves.label')}>
      <p className="text-sm font-medium text-muted-foreground">
        {t('timer.solves.empty')}
      </p>
    </section>
  )
}

function PlainSolveTable({
  className,
  rows,
  showMilliseconds = false,
  onDeleteSolve,
}: SolveTableProps) {
  const { t } = useTranslation()

  return (
    <section className={cls('h-full min-h-0 w-full overflow-auto text-foreground', className)} aria-label={t('timer.solves.label')}>
      <Table className="min-w-[32rem]">
        <TableHeader className="sticky top-0 bg-card">
          <TableRow>
            <TableHead className="w-10 px-2 py-3">
              <span className="sr-only">{t('timer.solves.actions')}</span>
            </TableHead>
            <TableHead className="px-4 py-3">#</TableHead>
            <TableHead className="px-4 py-3">{t('timer.solves.time')}</TableHead>
            <TableHead className="px-4 py-3">{t('timer.solves.penalty')}</TableHead>
            <TableHead className="px-4 py-3">{t('timer.solves.scramble')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="px-2 py-3">
                <DeleteSolveButton
                  disabled={onDeleteSolve === undefined}
                  solveId={row.id}
                  onDeleteSolve={onDeleteSolve}
                />
              </TableCell>
              <TableCell className="px-4 py-3 font-mono text-muted-foreground">{row.index}</TableCell>
              <TableCell className="px-4 py-3 font-mono text-lg font-bold">
                {formatTimerTime(row.finalTimeMs, { showMilliseconds })}
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                {t(`timer.penalty.${row.penalty}`)}
              </TableCell>
              <TableCell className="max-w-md truncate px-4 py-3 font-mono text-xs text-muted-foreground">
                {row.scramble}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  )
}

function VirtualizedSolveTable({
  className,
  rows,
  showMilliseconds = false,
  onDeleteSolve,
}: SolveTableProps) {
  const { t } = useTranslation()
  const [scrollParentElement, setScrollParentElement] = useState<HTMLElement | null>(null)
  const data = useMemo(() => [...rows], [rows])
  const columns = useMemo<ColumnDef<SolveTableRow>[]>(() => [
    {
      cell: ({ row }) => (
        <DeleteSolveButton
          disabled={onDeleteSolve === undefined}
          solveId={row.original.id}
          onDeleteSolve={onDeleteSolve}
        />
      ),
      header: () => <span className="sr-only">{t('timer.solves.actions')}</span>,
      id: 'actions',
    },
    {
      accessorKey: 'index',
      cell: ({ row }) => (
        <span className="font-mono text-muted-foreground">{row.original.index}</span>
      ),
      header: '#',
    },
    {
      accessorKey: 'finalTimeMs',
      cell: ({ row }) => (
        <span className="font-mono text-lg font-bold text-foreground">
          {formatTimerTime(row.original.finalTimeMs, { showMilliseconds })}
        </span>
      ),
      header: t('timer.solves.time'),
    },
    {
      accessorKey: 'penalty',
      cell: ({ row }) => t(`timer.penalty.${row.original.penalty}`),
      header: t('timer.solves.penalty'),
    },
    {
      accessorKey: 'scramble',
      cell: ({ row }) => row.original.scramble,
      header: t('timer.solves.scramble'),
    },
  ], [onDeleteSolve, showMilliseconds, t])
  const table = useReactTable({
    autoResetPageIndex: false,
    columns,
    data,
    getCoreRowModel: solveTableCoreRowModel,
    getRowId: (row) => row.id,
  })
  const tableRows = table.getRowModel().rows
  const rowVirtualizer = useVirtualizer({
    count: tableRows.length,
    estimateSize: () => virtualTableEstimatedRowHeight,
    getScrollElement: () => scrollParentElement,
    initialRect: virtualTableInitialRect,
    observeElementRect: observeVirtualTableElementRect,
    overscan: 8,
  })
  const virtualRows = rowVirtualizer.getVirtualItems()
  const visibleVirtualRows: VirtualSolveRow[] = virtualRows.length > 0
    ? virtualRows
    : tableRows.slice(0, virtualTableFallbackRowCount).map((_, index) => ({
        end: (index + 1) * virtualTableEstimatedRowHeight,
        index,
        start: index * virtualTableEstimatedRowHeight,
      }))
  const totalSize = rowVirtualizer.getTotalSize() || tableRows.length * virtualTableEstimatedRowHeight
  const topPaddingHeight = visibleVirtualRows[0]?.start ?? 0
  const bottomPaddingHeight = visibleVirtualRows.length === 0
    ? 0
    : totalSize - visibleVirtualRows[visibleVirtualRows.length - 1]!.end

  return (
    <section ref={setScrollParentElement} className={cls('h-full min-h-0 w-full overflow-auto text-foreground', className)} aria-label={t('timer.solves.label')}>
      <table className="w-full min-w-[32rem] caption-bottom text-left text-sm">
        <thead className="sticky top-0 border-b bg-card text-sm font-medium text-muted-foreground">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th className="px-4 py-3" key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {topPaddingHeight > 0 ? (
            <tr aria-hidden="true">
              <td colSpan={table.getAllLeafColumns().length} style={{ height: topPaddingHeight }} />
            </tr>
          ) : null}
          {visibleVirtualRows.map((virtualRow) => {
            const row = tableRows[virtualRow.index]!

            return (
              <tr key={row.id} className="border-b transition-colors hover:bg-muted/50 last:border-b-0">
                {row.getVisibleCells().map((cell) => (
                  <td className={cellClassName(cell.column.id)} key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            )
          })}
          {bottomPaddingHeight > 0 ? (
            <tr aria-hidden="true">
              <td colSpan={table.getAllLeafColumns().length} style={{ height: bottomPaddingHeight }} />
            </tr>
          ) : null}
        </tbody>
      </table>
    </section>
  )
}

function DeleteSolveButton({
  disabled,
  solveId,
  onDeleteSolve,
}: {
  disabled: boolean
  solveId: string
  onDeleteSolve?: (solveId: string) => void
}) {
  const { t } = useTranslation()

  return (
    <Button
      aria-label={t('timer.solves.delete')}
      className="!min-h-8 min-w-8 px-2 py-1"
      disabled={disabled}
      size="sm"
      type="button"
      variant="ghost"
      onClick={(event) => {
        event.currentTarget.blur()
        onDeleteSolve?.(solveId)
      }}
    >
      <Trash2 aria-hidden="true" className="size-4" strokeWidth={2.6} />
    </Button>
  )
}

function observeVirtualTableElementRect(
  instance: { scrollElement: HTMLElement | null },
  callback: (rect: { height: number; width: number }) => void,
) {
  const element = instance.scrollElement

  if (element === null) {
    return undefined
  }

  const scrollElement = element

  function notify() {
    const rect = scrollElement.getBoundingClientRect()
    callback({
      height: rect.height || virtualTableFallbackHeight,
      width: rect.width || 0,
    })
  }

  notify()

  if (typeof ResizeObserver === 'undefined') {
    return undefined
  }

  const resizeObserver = new ResizeObserver(notify)
  resizeObserver.observe(scrollElement)

  return () => resizeObserver.disconnect()
}

function cellClassName(columnId: string): string {
  if (columnId === 'actions') {
    return 'w-10 px-2 py-3'
  }

  if (columnId === 'scramble') {
    return 'max-w-md truncate px-4 py-3 font-mono text-xs text-muted-foreground'
  }

  if (columnId === 'penalty') {
    return 'px-4 py-3 text-sm text-muted-foreground'
  }

  return 'px-4 py-3'
}
