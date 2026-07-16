import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AppShell } from '../AppShell'

describe('AppShell', () => {
  it('renders primary navigation and page content', () => {
    renderWithRouter(
      <AppShell activeRoute='solve'>
        <main>Solver workspace</main>
      </AppShell>,
    )

    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument()
    expect(screen.getByText('Solver workspace')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Solver' })).toHaveAttribute('href', '/solve/')
  })
})

function renderWithRouter(ui: ReactNode, path = '/solve/') {
  return render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>)
}
