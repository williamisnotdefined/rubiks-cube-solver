import { useEffect, useId } from 'react'
import type { GeneratedTableStatus, SolveSuccessResult } from '@api/solver/types'
import { Button } from '@components/Button'
import { formatElapsedMs } from '@core/format/formatElapsedMs'
import { formatNumber } from '@core/format/formatNumber'

type SolveDetailsModalProps = {
  result: SolveSuccessResult
  onClose: () => void
}

type DetailRow = {
  text: string
  meaning: string
}

export function SolveDetailsModal({ result, onClose }: SolveDetailsModalProps) {
  const titleId = useId()
  const movesLabel = `${result.length} moves`
  const elapsedLabel = `found in ${formatElapsedMs(result.elapsedMs)}`
  const nodesLabel = `${formatNumber(result.exploredNodes)} nodes`
  const tablesLabel = tableStatusLabel(result.generatedTableStatus)
  const replayLabel = result.replayVerified ? 'replay verified' : 'replay not verified'
  const maxNodesLabel =
    result.maxNodes === undefined ? 'no configured node cap' : `${formatNumber(result.maxNodes)} node cap`
  const detailRows = explainRows(result, {
    elapsedLabel,
    maxNodesLabel,
    movesLabel,
    nodesLabel,
    replayLabel,
    tablesLabel,
  })

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-3 py-6 sm:px-6">
      <button
        aria-label="Dismiss solver details"
        className="absolute inset-0 bg-[#070707]/85 backdrop-blur-sm"
        type="button"
        onClick={onClose}
      />
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="relative max-h-[calc(100vh-3rem)] w-full max-w-3xl overflow-auto border border-[#2b2b2b] bg-[#101010] p-4 text-left text-[#f7f7f7] shadow-2xl sm:p-6"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-1">
            <h2 className="text-lg font-extrabold uppercase tracking-[0.16em]" id={titleId}>
              Solver details
            </h2>
            <p className="text-sm font-semibold text-[#a8a8a8]">
              These metrics describe how the backend found and verified this solution.
            </p>
          </div>
          <Button className="min-h-10 px-4 py-2" type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>

        <dl className="mt-5 grid gap-2 text-sm sm:grid-cols-3">
          <div className="border border-[#2b2b2b] bg-[#171717] p-3">
            <dt className="font-extrabold uppercase tracking-[0.16em] text-[#a8a8a8]">Solution</dt>
            <dd className="mt-1 font-mono text-emerald-300">{movesLabel}</dd>
          </div>
          <div className="border border-[#2b2b2b] bg-[#171717] p-3">
            <dt className="font-extrabold uppercase tracking-[0.16em] text-[#a8a8a8]">Search</dt>
            <dd className="mt-1 font-mono text-emerald-300">{nodesLabel}</dd>
          </div>
          <div className="border border-[#2b2b2b] bg-[#171717] p-3">
            <dt className="font-extrabold uppercase tracking-[0.16em] text-[#a8a8a8]">Time</dt>
            <dd className="mt-1 font-mono text-emerald-300">{elapsedLabel}</dd>
          </div>
        </dl>

        <div className="mt-5 overflow-x-auto border border-[#2b2b2b]">
          <table className="min-w-[44rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#2b2b2b] bg-[#070707]">
                <th className="w-48 px-3 py-3 text-left font-extrabold uppercase tracking-[0.16em] text-[#a8a8a8]">
                  Text
                </th>
                <th className="px-3 py-3 text-left font-extrabold uppercase tracking-[0.16em] text-[#a8a8a8]">
                  Meaning
                </th>
              </tr>
            </thead>
            <tbody>
              {detailRows.map((row) => (
                <tr className="border-b border-[#2b2b2b] last:border-b-0" key={row.text}>
                  <td className="border-r border-[#2b2b2b] px-3 py-3 align-top font-mono text-emerald-300">
                    {row.text}
                  </td>
                  <td className="px-3 py-3 align-top leading-relaxed text-[#f7f7f7]">{row.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function explainRows(
  result: SolveSuccessResult,
  labels: {
    elapsedLabel: string
    maxNodesLabel: string
    movesLabel: string
    nodesLabel: string
    replayLabel: string
    tablesLabel: string
  },
): DetailRow[] {
  return [
    {
      text: result.strategyLabel,
      meaning: strategyMeaning(result.strategyLabel),
    },
    {
      text: labels.movesLabel,
      meaning:
        'The returned solution length. Each notation token counts as one move, including half turns such as R2 or B2.',
    },
    {
      text: labels.nodesLabel,
      meaning: `The solver explored this many internal search nodes before finding the solution. This run used ${labels.maxNodesLabel}.`,
    },
    {
      text: labels.elapsedLabel,
      meaning:
        'The backend search time for this solve. It does not include total UI time, network latency, or cube rendering time.',
    },
    {
      text: labels.tablesLabel,
      meaning: tableStatusMeaning(result.generatedTableStatus),
    },
    {
      text: labels.replayLabel,
      meaning:
        'After finding the moves, the backend replayed them on the scrambled cube and confirmed that the cube becomes solved.',
    },
  ]
}

function strategyMeaning(strategyLabel: string): string {
  if (strategyLabel.toLowerCase().includes('generated two-phase')) {
    return 'The strategy used. Generated does not mean generative AI; this is a two-phase solver backed by pre-generated pruning tables. Quality modes try shorter solution depths before falling back to the configured maximum.'
  }

  return 'The deterministic backend solver strategy used for this request. It is search logic, not generative AI.'
}

function tableStatusLabel(status: GeneratedTableStatus): string {
  switch (status) {
    case 'available':
      return 'tables available'
    case 'corrupt_or_incompatible':
      return 'tables corrupt or incompatible'
    case 'not_required':
      return 'tables not required'
    case 'unavailable':
      return 'tables unavailable'
  }
}

function tableStatusMeaning(status: GeneratedTableStatus): string {
  switch (status) {
    case 'available':
      return 'The pre-generated pruning tables required by this strategy were available. They help prune the search.'
    case 'corrupt_or_incompatible':
      return 'The required pruning tables exist but do not match the expected format or metadata, so they should be regenerated.'
    case 'not_required':
      return 'This strategy does not require generated pruning tables.'
    case 'unavailable':
      return 'The required pruning tables were not available on the API server.'
  }
}
