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
})

function row(id: string): SolveTableRow {
  return {
    finalTimeMs: 12_345,
    id,
    index: 1,
    penalty: 'ok',
    rawTimeMs: 12_345,
    scramble: 'R U',
  }
}
