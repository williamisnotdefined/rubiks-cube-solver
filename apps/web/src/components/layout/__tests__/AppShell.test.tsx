import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AppShell } from '../AppShell'
import { PageNav } from '../PageNav'

describe('AppShell', () => {
  it('renders primary navigation and page content', () => {
    render(
      <AppShell activeRoute="solve">
        <main>Solver workspace</main>
      </AppShell>,
    )

    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument()
    expect(screen.getByText('Solver workspace')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Rubik Solver' })).toHaveAttribute('href', '#/solve')
  })
})

describe('PageNav', () => {
  it('marks solve as active and timer as inactive', () => {
    render(<PageNav activeRoute="solve" />)

    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' })
    const solveLink = within(navigation).getByRole('link', { name: 'Solve' })
    const timerLink = within(navigation).getByRole('link', { name: 'Timer' })

    expect(solveLink).toHaveAttribute('href', '#/solve')
    expect(timerLink).toHaveAttribute('href', '#/timer')
    expect(solveLink).toHaveClass('bg-app-text')
    expect(timerLink).toHaveClass('bg-app-surface')
  })

  it('marks timer as active and solve as inactive', () => {
    render(<PageNav activeRoute="timer" />)

    expect(screen.getByRole('link', { name: 'Timer' })).toHaveClass('bg-app-text')
    expect(screen.getByRole('link', { name: 'Solve' })).toHaveClass('bg-app-surface')
  })
})
