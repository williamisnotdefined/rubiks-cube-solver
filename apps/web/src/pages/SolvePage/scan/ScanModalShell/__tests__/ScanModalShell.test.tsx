import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ScanModalShell } from '../ScanModalShell'

describe('ScanModalShell', () => {
  it('uses the close handler for overlay dismissal by default', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <ScanModalShell hasProgress={false} onClose={onClose}>
        <p>Scan progress</p>
      </ScanModalShell>,
    )

    await user.click(screen.getByLabelText('Dismiss scan cube'))

    expect(onClose).toHaveBeenCalledOnce()
  })
})
