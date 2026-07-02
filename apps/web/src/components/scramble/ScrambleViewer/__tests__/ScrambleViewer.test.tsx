import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ScrambleViewer } from '../ScrambleViewer'

describe('ScrambleViewer', () => {
  it('renders the active event and scramble', () => {
    render(<ScrambleViewer eventLabel="3x3x3" scramble="R U R' U'" />)

    expect(screen.getByText(/3x3x3/)).toBeInTheDocument()
    expect(screen.getByText("R U R' U'")).toBeInTheDocument()
  })

  it('preserves multiline scrambles', () => {
    render(<ScrambleViewer eventLabel="3x3 MBLD" scramble={'1. R U\n2. F B'} />)

    const scramble = screen.getByText(/1\. R U/)

    expect(scramble).toHaveClass('whitespace-pre-wrap')
    expect(scramble).not.toHaveClass('overflow-auto')
    expect(scramble).not.toHaveClass('max-h-16')
    expect(screen.getByText(/2\. F B/)).toBeInTheDocument()
  })

  it('renders scramble controls inside the viewer', async () => {
    const user = userEvent.setup()
    const onCopy = vi.fn()
    const onNext = vi.fn()
    const onPrevious = vi.fn()

    render(
      <ScrambleViewer
        canGoPrevious
        eventLabel="3x3x3"
        scramble="R U R' U'"
        onCopy={onCopy}
        onNext={onNext}
        onPrevious={onPrevious}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Previous scramble' }))
    await user.click(screen.getByRole('button', { name: 'Next scramble' }))
    await user.click(screen.getByRole('button', { name: 'Copy scramble' }))

    expect(onPrevious).toHaveBeenCalledTimes(1)
    expect(onNext).toHaveBeenCalledTimes(1)
    expect(onCopy).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Copy scramble')).not.toBeInTheDocument()
  })

  it('marks the copied action through its accessible label', () => {
    render(
      <ScrambleViewer
        copied
        eventLabel="3x3x3"
        scramble="R U R' U'"
        onCopy={() => undefined}
      />,
    )

    expect(screen.getByRole('button', { name: 'Copied' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Copy scramble' })).not.toBeInTheDocument()
  })
})
