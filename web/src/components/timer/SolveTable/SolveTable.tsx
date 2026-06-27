import cls from 'classnames'
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
  focusableActions?: boolean
  rows: readonly SolveTableRow[]
  showMilliseconds?: boolean
  onActionComplete?: () => void
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
    <section className={cls('flex h-full min-h-0 items-center justify-center border border-app-border bg-app-surface p-4 text-center', className)} aria-label={t('timer.solves.label')}>
      <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-app-muted">
        {t('timer.solves.empty')}
      </p>
    </section>
  )
}

function PlainSolveTable({
  className,
  focusableActions = true,
  rows,
  showMilliseconds = false,
  onActionComplete,
  onDeleteSolve,
}: SolveTableProps) {
  const { t } = useTranslation()

  return (
    <section className={cls('h-full min-h-0 w-full overflow-auto border border-app-border bg-app-surface', className)} aria-label={t('timer.solves.label')}>
      <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
        <thead className="sticky top-0 border-b border-app-border bg-app-surface text-xs font-extrabold uppercase tracking-[0.16em] text-app-muted">
          <tr>
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">{t('timer.solves.time')}</th>
            <th className="px-4 py-3">{t('timer.solves.penalty')}</th>
            <th className="px-4 py-3">{t('timer.solves.scramble')}</th>
            <th className="px-4 py-3">{t('timer.solves.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
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
                <DeleteSolveButton
                  disabled={onDeleteSolve === undefined}
                  focusable={focusableActions}
                  solveId={row.id}
                  onActionComplete={onActionComplete}
                  onDeleteSolve={onDeleteSolve}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function VirtualizedSolveTable({
  className,
  focusableActions = true,
  rows,
  showMilliseconds = false,
  onActionComplete,
  onDeleteSolve,
}: SolveTableProps) {
  const { t } = useTranslation()
  const [scrollParentElement, setScrollParentElement] = useState<HTMLElement | null>(null)
  const data = useMemo(() => [...rows], [rows])
  const columns = useMemo<ColumnDef<SolveTableRow>[]>(() => [
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
        <DeleteSolveButton
          disabled={onDeleteSolve === undefined}
          focusable={focusableActions}
          solveId={row.original.id}
          onActionComplete={onActionComplete}
          onDeleteSolve={onDeleteSolve}
        />
      ),
      header: t('timer.solves.actions'),
      id: 'actions',
    },
  ], [focusableActions, onActionComplete, onDeleteSolve, showMilliseconds, t])
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
        </tbody>
      </table>
    </section>
  )
}

function DeleteSolveButton({
  disabled,
  focusable,
  solveId,
  onActionComplete,
  onDeleteSolve,
}: {
  disabled: boolean
  focusable: boolean
  solveId: string
  onActionComplete?: () => void
  onDeleteSolve?: (solveId: string) => void
}) {
  const { t } = useTranslation()

  return (
    <Button
      disabled={disabled}
      tabIndex={focusable ? undefined : -1}
      type="button"
      variant="ghost"
      onClick={(event) => {
        event.currentTarget.blur()
        onDeleteSolve?.(solveId)
        onActionComplete?.()
      }}
      onPointerDown={focusable ? undefined : (event) => event.preventDefault()}
    >
      {t('timer.solves.delete')}
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
  if (columnId === 'scramble') {
    return 'max-w-md truncate px-4 py-3 font-mono text-xs text-app-muted'
  }

  if (columnId === 'penalty') {
    return 'px-4 py-3 text-xs font-extrabold uppercase tracking-[0.16em] text-app-muted'
  }

  return 'px-4 py-3'
}
