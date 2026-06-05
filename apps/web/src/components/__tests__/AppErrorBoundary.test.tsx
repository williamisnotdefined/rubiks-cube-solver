import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppErrorBoundary } from '../AppErrorBoundary'

describe('AppErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  it('renders the app fallback when a child crashes', () => {
    render(
      <AppErrorBoundary>
        <CrashWhen shouldCrash />
      </AppErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument()
    expect(screen.getByText(/current view crashed unexpectedly/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('retries rendering from the fallback action', async () => {
    const user = userEvent.setup()
    let shouldCrash = true

    function RecoverableView() {
      if (shouldCrash) {
        throw new Error('recoverable crash')
      }

      return <p>Recovered view</p>
    }

    render(
      <AppErrorBoundary>
        <RecoverableView />
      </AppErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()

    shouldCrash = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(screen.getByText('Recovered view')).toBeInTheDocument()
  })

  it('resets the fallback when reset keys change', () => {
    let shouldCrash = true

    function RouteView() {
      if (shouldCrash) {
        throw new Error('route crash')
      }

      return <p>Recovered route</p>
    }

    const { rerender } = render(
      <AppErrorBoundary resetKeys={['/solve']}>
        <RouteView />
      </AppErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()

    shouldCrash = false
    rerender(
      <AppErrorBoundary resetKeys={['/timer']}>
        <RouteView />
      </AppErrorBoundary>,
    )

    expect(screen.getByText('Recovered route')).toBeInTheDocument()
  })
})

function CrashWhen({ shouldCrash }: { shouldCrash: boolean }) {
  if (shouldCrash) {
    throw new Error('test crash')
  }

  return <p>Stable view</p>
}
