import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PenaltyControls } from '../PenaltyControls'

describe('PenaltyControls', () => {
  it('renders active penalty and emits penalty changes', async () => {
    const user = userEvent.setup()
    const onPenaltyChange = vi.fn()

    render(<PenaltyControls penalty="plus2" onPenaltyChange={onPenaltyChange} />)

    expect(screen.getByRole('button', { name: '+2' })).toHaveClass('bg-[#f7f7f7]')

    await user.click(screen.getByRole('button', { name: 'OK' }))
    await user.click(screen.getByRole('button', { name: 'DNF' }))

    expect(onPenaltyChange).toHaveBeenCalledWith('ok')
    expect(onPenaltyChange).toHaveBeenCalledWith('dnf')
  })

  it('disables all penalty buttons', async () => {
    const user = userEvent.setup()
    const onPenaltyChange = vi.fn()

    render(<PenaltyControls disabled penalty="ok" onPenaltyChange={onPenaltyChange} />)

    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled()
    }
    await user.click(screen.getByRole('button', { name: '+2' }))
    expect(onPenaltyChange).not.toHaveBeenCalled()
  })
})
