import { render, screen, waitFor } from '@testing-library/react'
import { useRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Dialog, DialogContent, DialogTitle } from '../Dialog'

describe('Dialog', () => {
  it('lets the caller choose the initially focused control', async () => {
    const handleOpenAutoFocus = vi.fn()

    render(<CallerFocusedDialog onOpenAutoFocus={handleOpenAutoFocus} />)

    await waitFor(() => expect(handleOpenAutoFocus).toHaveBeenCalledOnce())
    expect(screen.getByRole('textbox', { name: 'Search records' })).toHaveFocus()
  })
})

function CallerFocusedDialog({ onOpenAutoFocus }: { onOpenAutoFocus: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <Dialog open>
      <DialogContent
        aria-describedby={undefined}
        onOpenAutoFocus={(event) => {
          onOpenAutoFocus()
          event.preventDefault()
          inputRef.current?.focus()
        }}
      >
        <DialogTitle>Records filter</DialogTitle>
        <label>
          Search records
          <input ref={inputRef} />
        </label>
      </DialogContent>
    </Dialog>
  )
}
