import cls from 'classnames'
import { useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useTranslation } from 'react-i18next'
import { Button } from '@components/Button'
import { formatTimerTime } from '@core/timer/formatTimerTime'
import type { TimerPenalty } from '@core/timer/penalties'

const virtualTableEstimatedRowHeight = 56
const virtualTableFallbackHeight = 640
const virtualTableFallbackRowCount = 24

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

export function SolveTable({ className, rows, showMilliseconds = false, onDeleteSolve }: SolveTableProps) {
  const { t } = useTranslation()
  const [scrollParentElement, setScrollParentElement] = useState<HTMLElement | null>(null)
  const columns: ColumnDef<SolveTableRow>[] = [
    {
      accessorKey: 'index',
      cell: ({ row }) => (
        <span className="font-mono text-app-muted">{row.original.index}</span>
      ),
      header: '#',
    },
    {
      accessorKey: 'finalTimeMs',
      cell: ({ row }) => (
        <span className="font-mono text-lg font-black text-app-text">
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
    {
      cell: ({ row }) => (
        <Button
          disabled={onDeleteSolve === undefined}
          type="button"
          variant="ghost"
          onClick={() => onDeleteSolve?.(row.original.id)}
        >
          {t('timer.solves.delete')}
        </Button>
      ),
      header: t('timer.solves.actions'),
      id: 'actions',
    },
  ]
  const table = useReactTable({
    columns,
    data: [...rows],
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  })
  const tableRows = table.getRowModel().rows
  const rowVirtualizer = useVirtualizer({
    count: tableRows.length,
    estimateSize: () => virtualTableEstimatedRowHeight,
    getScrollElement: () => scrollParentElement,
    initialRect: { height: 640, width: 0 },
    observeElementRect: (instance, callback) => {
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
    },
    overscan: 8,
  })
  const virtualRows = rowVirtualizer.getVirtualItems()
  const shouldVirtualize = rows.length > virtualTableFallbackRowCount
  const visibleVirtualRows: VirtualSolveRow[] = shouldVirtualize
    ? virtualRows.length > 0
      ? virtualRows
      : tableRows.slice(0, virtualTableFallbackRowCount).map((_, index) => ({
          end: (index + 1) * virtualTableEstimatedRowHeight,
          index,
          start: index * virtualTableEstimatedRowHeight,
        }))
    : tableRows.map((_, index) => ({
        end: (index + 1) * virtualTableEstimatedRowHeight,
        index,
        start: index * virtualTableEstimatedRowHeight,
      }))
  const totalSize = shouldVirtualize
    ? rowVirtualizer.getTotalSize() || tableRows.length * virtualTableEstimatedRowHeight
    : tableRows.length * virtualTableEstimatedRowHeight
  const topPaddingHeight = shouldVirtualize ? visibleVirtualRows[0]?.start ?? 0 : 0
  const bottomPaddingHeight =
    !shouldVirtualize || visibleVirtualRows.length === 0
      ? 0
      : totalSize - visibleVirtualRows[visibleVirtualRows.length - 1]!.end

  if (rows.length === 0) {
    return (
      <section className={cls('flex h-full min-h-0 items-center justify-center border border-app-border bg-app-surface p-4 text-center', className)} aria-label={t('timer.solves.label')}>
        <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-app-muted">
          {t('timer.solves.empty')}
        </p>
      </section>
    )
  }

  return (
    <section ref={setScrollParentElement} className={cls('h-full min-h-0 w-full overflow-auto border border-app-border bg-app-surface', className)} aria-label={t('timer.solves.label')}>
      <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
        <thead className="sticky top-0 border-b border-app-border bg-app-surface text-xs font-extrabold uppercase tracking-[0.16em] text-app-muted">
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
          {shouldVirtualize ? (
            <>
              {topPaddingHeight > 0 ? (
                <tr aria-hidden="true">
                  <td colSpan={table.getAllLeafColumns().length} style={{ height: topPaddingHeight }} />
                </tr>
              ) : null}
              {visibleVirtualRows.map((virtualRow) => {
                const row = tableRows[virtualRow.index]!

                return (
                  <tr key={row.id} className="border-b border-app-border last:border-b-0">
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
            </>
          ) : rows.map((row) => (
            <tr key={row.id} className="border-b border-app-border last:border-b-0">
              <td className="px-4 py-3 font-mono text-app-muted">{row.index}</td>
              <td className="px-4 py-3 font-mono text-lg font-black text-app-text">
                {formatTimerTime(row.finalTimeMs, { showMilliseconds })}
              </td>
              <td className="px-4 py-3 text-xs font-extrabold uppercase tracking-[0.16em] text-app-muted">
                {t(`timer.penalty.${row.penalty}`)}
              </td>
              <td className="max-w-md truncate px-4 py-3 font-mono text-xs text-app-muted">
                {row.scramble}
              </td>
              <td className="px-4 py-3">
                <Button
                  disabled={onDeleteSolve === undefined}
                  type="button"
                  variant="ghost"
                  onClick={() => onDeleteSolve?.(row.id)}
                >
                  {t('timer.solves.delete')}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function cellClassName(columnId: string): string {
  if (columnId === 'scramble') {
    return 'max-w-md truncate px-4 py-3 font-mono text-xs text-app-muted'
  }

  if (columnId === 'penalty') {
    return 'px-4 py-3 text-xs font-extrabold uppercase tracking-[0.16em] text-app-muted'
  }

  return 'px-4 py-3'
}
