import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import App from '../App'

describe('App initial SSG render', () => {
  it('hydrates the product route instead of a temporary SEO snapshot', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/solve/']}>
        <App initialSsg />
      </MemoryRouter>,
    )

    await screen.findByTestId('solve-form')
    expect(screen.queryByRole('heading', { name: "Online Rubik's Cube Solver" })).not.toBeInTheDocument()
    expect(screen.queryByText('Loading route')).not.toBeInTheDocument()
    expect(container.querySelector('[data-app-shell="true"]')).toHaveAttribute(
      'data-initial-route-ready',
      'true',
    )
  })

  it('keeps a client-only initial route covered until its lazy module is ready', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/notations/7x7/']}>
        <App />
      </MemoryRouter>,
    )
    const appShell = container.querySelector('[data-app-shell="true"]')

    expect(appShell).toHaveAttribute('data-initial-route-ready', 'false')
    await waitFor(() => expect(appShell).toHaveAttribute('data-initial-route-ready', 'true'))
  })
})
