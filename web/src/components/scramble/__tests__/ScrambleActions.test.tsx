import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ScrambleActions } from '../ScrambleActions'

describe('ScrambleActions', () => {
  it('emits copy and next actions', async () => {
    const user = userEvent.setup()
    const onCopy = vi.fn()
    const onNext = vi.fn()

    render(<ScrambleActions copied={false} onCopy={onCopy} onNext={onNext} />)

    await user.click(screen.getByRole('button', { name: 'Next scramble' }))
    await user.click(screen.getByRole('button', { name: 'Copy scramble' }))

    expect(onNext).toHaveBeenCalledTimes(1)
    expect(onCopy).toHaveBeenCalledTimes(1)
  })

  it('shows the copied state', () => {
    render(<ScrambleActions copied onCopy={() => undefined} onNext={() => undefined} />)

    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })
})
