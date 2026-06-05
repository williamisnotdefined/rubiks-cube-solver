import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SolveTable, type SolveTableRow } from '../SolveTable'

describe('SolveTable', () => {
  it('renders an empty state', () => {
    render(<SolveTable rows={[]} />)

    expect(screen.getByText('No solves yet')).toBeInTheDocument()
  })

  it('renders solve rows and deletes by id', async () => {
    const user = userEvent.setup()
    const onDeleteSolve = vi.fn()
    render(<SolveTable rows={[row('solve-1')]} showMilliseconds onDeleteSolve={onDeleteSolve} />)

    const table = screen.getByRole('table')
    expect(within(table).getByText('1')).toBeInTheDocument()
    expect(within(table).getByText('12.345')).toBeInTheDocument()
    expect(within(table).getByText('OK')).toBeInTheDocument()
    expect(within(table).getByText('R U')).toBeInTheDocument()

    await user.click(within(table).getByRole('button', { name: 'Delete' }))
    expect(onDeleteSolve).toHaveBeenCalledWith('solve-1')
  })

  it('disables delete when no handler is provided and formats DNF', () => {
    render(<SolveTable rows={[{ ...row('solve-1'), finalTimeMs: null, penalty: 'dnf' }]} />)

    expect(screen.getAllByText('DNF')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled()
  })

  it('virtualizes large solve lists without rendering every row', () => {
    const rows = Array.from({ length: 100 }, (_, index) => (
      row(`solve-${index + 1}`, index + 1, `R U ${index + 1}`)
    ))

    render(<SolveTable rows={rows} />)

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getAllByRole('row').length).toBeLessThan(rows.length)
  })
})

function row(id: string, index = 1, scramble = 'R U'): SolveTableRow {
  return {
    finalTimeMs: 12_345,
    id,
    index,
    penalty: 'ok',
    rawTimeMs: 12_345,
    scramble,
  }
}
