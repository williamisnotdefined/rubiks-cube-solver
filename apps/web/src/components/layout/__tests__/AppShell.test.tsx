import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { useThemeStore } from '@core/theme/themeStore'
import { AppShell } from '../AppShell'
import { PageNav } from '../PageNav'

afterEach(() => {
  useThemeStore.getState().setThemePreference('system')
  window.localStorage.clear()
  delete document.documentElement.dataset.theme
})

describe('AppShell', () => {
  it('renders primary navigation and page content', () => {
    renderWithRouter(
      <AppShell activeRoute="solve">
        <main>Solver workspace</main>
      </AppShell>,
    )

    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument()
    expect(screen.getByText('Solver workspace')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Solver' })).toHaveAttribute('href', '/solve')
  })
})

describe('PageNav', () => {
  it('marks solver as active and timer as inactive', () => {
    renderWithRouter(<PageNav activeRoute="solve" />)

    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' })
    const solveLink = within(navigation).getByRole('link', { name: 'Solver' })
    const timerLink = within(navigation).getByRole('link', { name: 'Timer' })

    expect(solveLink).toHaveAttribute('href', '/solve')
    expect(timerLink).toHaveAttribute('href', '/timer')
    expect(solveLink).toHaveClass('bg-app-text')
    expect(timerLink).toHaveClass('bg-app-surface')
  })

  it('marks timer as active and solve as inactive', () => {
    renderWithRouter(<PageNav activeRoute="timer" />, '/timer')

    expect(screen.getByRole('link', { name: 'Timer' })).toHaveClass('bg-app-text')
    expect(screen.getByRole('link', { name: 'Solver' })).toHaveClass('bg-app-surface')
  })

  it('links to the project on GitHub', () => {
    renderWithRouter(<PageNav activeRoute="solve" />)

    expect(screen.getByRole('link', { name: 'Open project on GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/williamisnotdefined/rubiks-cube-solver',
    )
  })

  it('opens and closes the mobile menu drawer', async () => {
    const user = userEvent.setup()
    renderWithRouter(<PageNav activeRoute="timer" />, '/timer')

    expect(screen.queryAllByRole('button', { name: 'Close menu' })).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: 'Open menu' }))

    const drawer = screen.getByRole('dialog', { name: 'Menu' })
    expect(within(drawer).getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Timer' })).toHaveLength(1)

    await user.click(screen.getAllByRole('button', { name: 'Close menu' })[0])

    expect(screen.queryAllByRole('button', { name: 'Close menu' })).toHaveLength(0)
  })

  it('closes the mobile menu with Escape', async () => {
    const user = userEvent.setup()
    renderWithRouter(<PageNav activeRoute="timer" />, '/timer')

    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    await user.keyboard('{Escape}')

    expect(screen.queryAllByRole('button', { name: 'Close menu' })).toHaveLength(0)
  })

  it('persists explicit theme choices and returns to system mode', async () => {
    const user = userEvent.setup()
    renderWithRouter(<PageNav activeRoute="solve" />)

    await user.click(screen.getByRole('button', { name: 'Theme' }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Light' }))

    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    expect(window.localStorage.getItem('rubiks-cube-solver-theme')).toBe('light')

    await user.click(screen.getByRole('button', { name: 'Theme' }))
    await user.click(screen.getByRole('menuitemradio', { name: 'System' }))

    expect(document.documentElement).not.toHaveAttribute('data-theme')
    expect(window.localStorage.getItem('rubiks-cube-solver-theme')).toBeNull()
  })
})

function renderWithRouter(ui: ReactNode, path = '/solve') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      {ui}
    </MemoryRouter>,
  )
}
