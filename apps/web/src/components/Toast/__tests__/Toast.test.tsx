import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useToast } from '@core/toast/toastStore'
import { ToastProvider } from '../Toast'

describe('ToastProvider', () => {
  it('renders a description and dismisses the toast from its close button', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Show notice' }))

    expect(screen.getByText('Records updated')).toBeInTheDocument()
    expect(screen.getByText('The latest WCA data is ready.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close' }))

    await waitFor(() => expect(screen.queryByText('Records updated')).not.toBeInTheDocument())
  })
})

function ToastHarness() {
  const showToast = useToast()

  return (
    <button
      type='button'
      onClick={() => {
        showToast({
          description: 'The latest WCA data is ready.',
          title: 'Records updated',
          tone: 'success',
        })
      }}
    >
      Show notice
    </button>
  )
}
