import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { useThemeStore } from '@core/theme/themeStore'
import { algorithmPuzzles } from '@pages/AlgorithmsPage/sets/algorithmSetMetadata'
import { notationGuides } from '@pages/NotationsPage/notationGuides'
import { PageNav } from '../PageNav'

afterEach(() => {
  useThemeStore.getState().setThemePreference('system')
  window.localStorage.clear()
  delete document.documentElement.dataset.theme
})

describe('PageNav', () => {
  it('marks solver as active and timer as inactive', () => {
    renderWithRouter(<PageNav activeRoute="solve" />)

    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' })
    const solveLink = within(navigation).getByRole('link', { name: 'Solver' })
    const timerLink = within(navigation).getByRole('link', { name: 'Timer' })

    expect(solveLink).toHaveAttribute('href', '/solve/')
    expect(timerLink).toHaveAttribute('href', '/timer/')
    expect(solveLink).toHaveAttribute('aria-current', 'page')
    expect(timerLink).not.toHaveAttribute('aria-current')
  })

  it('marks timer as active and solve as inactive', () => {
    renderWithRouter(<PageNav activeRoute="timer" />, '/timer/')

    expect(screen.getByRole('link', { name: 'Timer' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Solver' })).not.toHaveAttribute('aria-current')
  })

  it('marks YT Channels as active and keeps the English route', () => {
    renderWithRouter(<PageNav activeRoute="channels" />, '/channels/')

    const channelsLink = screen.getByRole('link', { name: 'YT Channels' })

    expect(channelsLink).toHaveAttribute('href', '/channels/')
    expect(channelsLink).toHaveAttribute('aria-current', 'page')
  })

  it('marks Sites as active and keeps the English route', () => {
    renderWithRouter(<PageNav activeRoute="sites" />, '/sites/')

    const sitesLink = screen.getByRole('link', { name: 'Sites' })

    expect(sitesLink).toHaveAttribute('href', '/sites/')
    expect(sitesLink).toHaveAttribute('aria-current', 'page')
  })

  it('marks API as active and keeps the English route', () => {
    renderWithRouter(<PageNav activeRoute="api" />, '/api/wca-data/')

    const apiLink = screen.getByRole('link', { name: 'API' })

    expect(apiLink).toHaveAttribute('href', '/api/wca-data/')
    expect(apiLink).toHaveAttribute('aria-current', 'page')
  })

  it('uses the site favicon in the brand and removes the old solver subtitle', () => {
    const { container } = renderWithRouter(<PageNav activeRoute="solve" />)

    expect(container.querySelector('img[src="/favicon.svg"]')).toBeInTheDocument()
    expect(screen.getAllByText(/Speedcube/)).not.toHaveLength(0)
    expect(screen.queryByText('Rust solver')).not.toBeInTheDocument()
  })

  it('marks algorithms as active and opens method links', () => {
    renderWithRouter(<PageNav activeRoute="algorithms" />, '/algoritmos/')

    const algorithmsButton = screen.getByRole('button', { name: 'Algorithms' })
    expect(algorithmsButton).toHaveAttribute('aria-current', 'page')
    expect(algorithmsButton).toHaveAttribute('aria-expanded', 'true')

    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' })

    expect(within(navigation).getByRole('link', { name: 'All algorithms' })).toHaveAttribute('href', '/algoritmos/')

    for (const puzzle of algorithmPuzzles) {
      expect(within(navigation).getByRole('link', { name: puzzle.title })).toHaveAttribute('href', `${puzzle.path}/`)
    }
  })

  it('marks the current algorithm puzzle as active on method pages', () => {
    renderWithRouter(<PageNav activeRoute="algorithms" />, '/algoritmos/megaminx/pll/')

    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' })

    expect(within(navigation).getByRole('link', { name: 'Megaminx' })).toHaveAttribute('aria-current', 'page')
    expect(within(navigation).getByRole('link', { name: 'All algorithms' })).not.toHaveAttribute('aria-current')
  })

  it('marks notations as active and opens puzzle notation links', () => {
    renderWithRouter(<PageNav activeRoute="notations" />, '/notations/square-1/')

    const notationsButton = screen.getByRole('button', { name: 'Notations' })
    expect(notationsButton).toHaveAttribute('aria-current', 'page')
    expect(notationsButton).toHaveAttribute('aria-expanded', 'true')

    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' })

    for (const guide of notationGuides) {
      expect(within(navigation).getByRole('link', { name: guide.puzzle })).toHaveAttribute('href', `${guide.path}/`)
    }

    expect(within(navigation).getByRole('link', { name: 'Square-1' })).toHaveAttribute('aria-current', 'page')
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
    renderWithRouter(<PageNav activeRoute="timer" />, '/timer/')

    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open menu' }))

    const drawer = await screen.findByRole('dialog', { name: 'Menu' })
    expect(within(drawer).getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument()
    expect(within(drawer).getByRole('link', { name: 'Timer' })).toHaveAttribute('aria-current', 'page')

    await user.click(within(drawer).getByRole('button', { name: 'Close' }))

    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument()
  })

  it('opens mobile drawer submenus in dialogs and closes after navigation', async () => {
    const user = userEvent.setup()
    renderWithRouter(<PageNav activeRoute="algorithms" />, '/algoritmos/')

    await user.click(screen.getByRole('button', { name: 'Open menu' }))

    const drawer = await screen.findByRole('dialog', { name: 'Menu' })

    await user.click(within(drawer).getByRole('link', { name: '3x3' }))

    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument()
  })

  it('closes the mobile menu with Escape', async () => {
    const user = userEvent.setup()
    renderWithRouter(<PageNav activeRoute="timer" />, '/timer/')

    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    await screen.findByRole('dialog', { name: 'Menu' })
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument()
  })

  it('persists explicit theme choices and returns to system mode', async () => {
    const user = userEvent.setup()
    renderWithRouter(<PageNav activeRoute="solve" />)

    await user.click(screen.getByRole('button', { name: 'Theme' }))
    await user.click(await screen.findByRole('menuitemradio', { name: 'Light' }))

    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    expect(window.localStorage.getItem('rubiks-cube-solver-theme')).toBe('light')

    await user.click(screen.getByRole('button', { name: 'Theme' }))
    await user.click(await screen.findByRole('menuitemradio', { name: 'System' }))

    expect(document.documentElement).not.toHaveAttribute('data-theme')
    expect(window.localStorage.getItem('rubiks-cube-solver-theme')).toBeNull()
  })
})

function renderWithRouter(ui: ReactNode, path = '/solve/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      {ui}
    </MemoryRouter>,
  )
}
