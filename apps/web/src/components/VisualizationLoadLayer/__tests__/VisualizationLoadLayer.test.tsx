import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { VisualizationLoadLayer } from '../VisualizationLoadLayer'

describe('VisualizationLoadLayer', () => {
  const props = {
    label: 'Prepare 3D cube',
    loadingLabel: 'Loading 3D cube',
    loadRequested: false,
    onLoadRequest: vi.fn(),
  }

  it('shows a loader before the renderer is requested', async () => {
    const user = userEvent.setup()
    const onLoadRequest = vi.fn()
    render(<VisualizationLoadLayer {...props} onLoadRequest={onLoadRequest} />)

    expect(screen.getByRole('button', { name: 'Prepare 3D cube' })).toContainHTML('animate-spin')

    await user.click(screen.getByRole('button', { name: 'Prepare 3D cube' }))

    expect(onLoadRequest).toHaveBeenCalledOnce()
  })

  it('announces loading while the renderer loads', () => {
    render(<VisualizationLoadLayer {...props} loadRequested />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading 3D cube')
  })

  it('offers retry when renderer registration fails', async () => {
    const user = userEvent.setup()
    const onLoadRequest = vi.fn()
    render(
      <VisualizationLoadLayer
        {...props}
        error
        errorLabel='Visualization failed'
        onLoadRequest={onLoadRequest}
        retryLabel='Retry'
      />,
    )

    await user.click(screen.getByRole('button', { name: /Visualization failed/i }))

    expect(onLoadRequest).toHaveBeenCalledOnce()
  })
})
