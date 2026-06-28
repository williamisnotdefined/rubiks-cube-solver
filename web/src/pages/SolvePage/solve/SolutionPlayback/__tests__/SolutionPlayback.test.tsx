import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SolutionPlayback } from '../SolutionPlayback'

describe('SolutionPlayback', () => {
  it('renders nothing without moves', () => {
    const { container } = render(<SolutionPlayback moves={[]} step={0} onStepChange={vi.fn()} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('navigates solution steps', async () => {
    const user = userEvent.setup()
    const onStepChange = vi.fn()
    render(<SolutionPlayback moves={["U'", "R'"]} step={1} onStepChange={onStepChange} />)

    expect(screen.getByText("Move 1: U'")).toBeInTheDocument()
    expect(screen.getByText('1 / 2')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Previous move' }))
    await user.click(screen.getByRole('button', { name: 'Next move' }))
    fireEvent.change(screen.getByLabelText('Solution step'), { target: { value: '2' } })

    expect(onStepChange).toHaveBeenNthCalledWith(1, 0)
    expect(onStepChange).toHaveBeenNthCalledWith(2, 2)
    expect(onStepChange).toHaveBeenNthCalledWith(3, 2)
  })

  it('labels the zero step as the scramble', () => {
    render(<SolutionPlayback moves={["U'"]} step={0} onStepChange={vi.fn()} />)

    expect(screen.getByText('Scramble')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous move' })).toBeDisabled()
  })

  it('marks final step as solved', () => {
    render(<SolutionPlayback moves={["U'"]} step={1} onStepChange={vi.fn()} />)

    expect(screen.getByText('1 / 1 solved')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next move' })).toBeDisabled()
  })
})
