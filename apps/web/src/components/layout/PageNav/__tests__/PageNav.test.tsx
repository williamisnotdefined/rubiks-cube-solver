import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useThemeStore } from '@core/theme/themeStore'
import i18n, { languageStorageKey } from '@src/i18n/i18n'
import { PageNav } from '../PageNav'
import { algorithmNavigationItems, notationNavigationItems } from '../navigationManifest'

afterEach(async () => {
  if (i18n.language !== 'en-US') {
    await act(() => i18n.changeLanguage('en-US'))
  }
  useThemeStore.getState().setThemePreference('system')
  window.localStorage.clear()
  delete document.documentElement.dataset.theme
  vi.restoreAllMocks()
})

describe('PageNav', () => {
  it('marks solver as active and timer as inactive', () => {
    renderWithRouter(<PageNav activeRoute='solve' />)

    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' })
    const solveLink = within(navigation).getByRole('link', { name: 'Solver' })
    const timerLink = within(navigation).getByRole('link', { name: 'Timer' })

    expect(solveLink).toHaveAttribute('href', '/solve/')
    expect(timerLink).toHaveAttribute('href', '/timer/')
    expect(solveLink).toHaveAttribute('aria-current', 'page')
    expect(timerLink).not.toHaveAttribute('aria-current')
  })

  it('opens cookie preferences from below the GitHub link', async () => {
    const user = userEvent.setup()
    const onOpenCookiePreferences = vi.fn()
    renderWithRouter(
      <PageNav activeRoute='solve' onOpenCookiePreferences={onOpenCookiePreferences} />,
    )

    const githubLink = screen.getByRole('link', { name: 'Open project on GitHub' })
    const cookieButton = screen.getByRole('button', { name: 'Cookie preferences' })

    expect(githubLink.compareDocumentPosition(cookieButton)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    await user.click(cookieButton)
    expect(onOpenCookiePreferences).toHaveBeenCalledOnce()
  })

  it('marks timer as active and solve as inactive', () => {
    renderWithRouter(<PageNav activeRoute='timer' />, '/timer/')

    expect(screen.getByRole('link', { name: 'Timer' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Solver' })).not.toHaveAttribute('aria-current')
  })

  it('marks YT Channels as active and keeps the English route', () => {
    renderWithRouter(<PageNav activeRoute='channels' />, '/channels/')

    const channelsLink = screen.getByRole('link', { name: 'YT Channels' })

    expect(channelsLink).toHaveAttribute('href', '/channels/')
    expect(channelsLink).toHaveAttribute('aria-current', 'page')
  })

  it('marks Sites as active and keeps the English route', () => {
    renderWithRouter(<PageNav activeRoute='sites' />, '/sites/')

    const sitesLink = screen.getByRole('link', { name: 'Sites' })

    expect(sitesLink).toHaveAttribute('href', '/sites/')
    expect(sitesLink).toHaveAttribute('aria-current', 'page')
  })

  it('marks Stores as active and keeps the English route', () => {
    renderWithRouter(<PageNav activeRoute='stores' />, '/stores/')

    const storesLink = screen.getByRole('link', { name: 'Stores' })

    expect(storesLink).toHaveAttribute('href', '/stores/')
    expect(storesLink).toHaveAttribute('aria-current', 'page')
  })

  it('opens the non-localized WCA Data docs in a new tab', () => {
    renderWithRouter(<PageNav activeRoute='api' />, '/api/wca-data/')

    const apiLink = screen.getByRole('link', { name: /API opens in new tab/ })

    expect(apiLink).toHaveAttribute('href', '/api/wca-data/v1/docs')
    expect(apiLink).toHaveAttribute('aria-current', 'page')
    expect(apiLink).toHaveAttribute('target', '_blank')
    expect(apiLink).toHaveAttribute('rel', 'noreferrer')
    expect(apiLink.querySelector('svg.ms-auto')).toBeInTheDocument()
  })

  it('marks world records as active', () => {
    renderWithRouter(<PageNav activeRoute='records' />, '/records/world/')

    expect(screen.getByRole('link', { name: 'World Records' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('uses the site favicon in the brand and removes the old solver subtitle', () => {
    const { container } = renderWithRouter(<PageNav activeRoute='solve' />)

    expect(container.querySelector('img[src="/favicon.svg"]')).toBeInTheDocument()
    expect(screen.getAllByText(/Speedcube/)).not.toHaveLength(0)
    expect(screen.queryByText('Rust solver')).not.toBeInTheDocument()
  })

  it('marks algorithms as active and opens method links', () => {
    renderWithRouter(<PageNav activeRoute='algorithms' />, '/algorithms/')

    const algorithmsButton = screen.getByRole('button', { name: 'Algorithms' })
    expect(algorithmsButton).toHaveAttribute('aria-current', 'page')
    expect(algorithmsButton).toHaveAttribute('aria-expanded', 'true')

    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' })

    expect(within(navigation).getByRole('link', { name: 'All algorithms' })).toHaveAttribute(
      'href',
      '/algorithms/',
    )

    for (const puzzle of algorithmNavigationItems) {
      expect(within(navigation).getByRole('link', { name: puzzle.label })).toHaveAttribute(
        'href',
        `${puzzle.path}/`,
      )
    }
  })

  it('marks the current algorithm puzzle as active on method pages', () => {
    renderWithRouter(<PageNav activeRoute='algorithms' />, '/algorithms/megaminx/pll/')

    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' })

    expect(within(navigation).getByRole('link', { name: 'Megaminx' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(navigation).getByRole('link', { name: 'All algorithms' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('marks notations as active and opens puzzle notation links', () => {
    renderWithRouter(<PageNav activeRoute='notations' />, '/notations/square-1/')

    const notationsButton = screen.getByRole('button', { name: 'Notations' })
    expect(notationsButton).toHaveAttribute('aria-current', 'page')
    expect(notationsButton).toHaveAttribute('aria-expanded', 'true')

    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' })

    for (const guide of notationNavigationItems) {
      expect(within(navigation).getByRole('link', { name: guide.label })).toHaveAttribute(
        'href',
        `${guide.path}/`,
      )
    }

    expect(within(navigation).getByRole('link', { name: 'Square-1' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('links to the project on GitHub', () => {
    renderWithRouter(<PageNav activeRoute='solve' />)

    expect(screen.getByRole('link', { name: 'Open project on GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/williamisnotdefined/rubiks-cube-solver',
    )
  })

  it('shows the Cuber Brasil logo link in Brazilian Portuguese navigation', async () => {
    const user = userEvent.setup()
    renderWithRouter(<PageNav activeRoute='solve' />, '/pt-BR/solve/')

    const desktopLink = screen.getByRole('link', { name: 'Open Cuber Brasil' })

    expect(desktopLink).toHaveAttribute('href', 'https://www.cuberbrasil.com/')
    expect(desktopLink).toHaveAttribute('target', '_blank')
    expect(desktopLink).toHaveAttribute('rel', 'noreferrer')
    expect(desktopLink.querySelector('img[src="/sites/cuber-brasil.png"]')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open menu' }))

    const drawer = await screen.findByRole('dialog', { name: 'Menu' })
    expect(within(drawer).getByRole('link', { name: 'Open Cuber Brasil' })).toBeInTheDocument()
  })

  it('lists native language names and persists navigation to the same localized page', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem(languageStorageKey, 'pt-BR')
    renderWithRouter(<PageNav activeRoute='solve' />, '/pt-BR/solve/?mode=guided#cube')

    await user.click(screen.getByRole('button', { name: 'Language' }))

    const options = await screen.findAllByRole('menuitemradio')
    expect(options).toHaveLength(10)
    expect(screen.getByRole('menuitemradio', { name: 'Português (Brasil)' })).toHaveAttribute(
      'aria-checked',
      'true',
    )

    await user.click(screen.getByRole('menuitemradio', { name: 'Español (España)' }))

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/es/solve/?mode=guided#cube')
    })
    expect(window.localStorage.getItem(languageStorageKey)).toBe('es')

    await user.click(screen.getByRole('button', { name: 'Idioma' }))
    expect(screen.getByRole('menuitemradio', { name: 'Español (España)' })).toHaveAttribute(
      'aria-checked',
      'true',
    )

    await user.click(screen.getByRole('menuitemradio', { name: 'Italiano (Italia)' }))

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/it/solve/?mode=guided#cube')
    })
    await user.click(screen.getByRole('button', { name: 'Lingua' }))
    expect(screen.getByRole('menuitemradio', { name: 'Italiano (Italia)' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  it('returns to automatic browser language detection', async () => {
    const user = userEvent.setup()
    vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(['pt-BR'])
    window.localStorage.setItem(languageStorageKey, 'es')
    renderWithRouter(<PageNav activeRoute='solve' />, '/es/solve/')

    await user.click(screen.getByRole('button', { name: 'Language' }))
    await user.click(
      await screen.findByRole('menuitemradio', { name: 'Automatic: Português (Brasil)' }),
    )

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/pt-BR/solve/')
    })
    expect(window.localStorage.getItem(languageStorageKey)).toBeNull()
  })

  it('opens and closes the mobile menu drawer', async () => {
    const user = userEvent.setup()
    renderWithRouter(<PageNav activeRoute='timer' />, '/timer/')

    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open menu' }))

    const drawer = await screen.findByRole('dialog', { name: 'Menu' })
    expect(
      within(drawer).getByRole('navigation', { name: 'Primary navigation' }),
    ).toBeInTheDocument()
    expect(within(drawer).getByRole('link', { name: 'Timer' })).toHaveAttribute(
      'aria-current',
      'page',
    )

    await user.click(within(drawer).getByRole('button', { name: 'Close menu' }))

    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument()
  })

  it('opens mobile drawer submenus in dialogs and closes after navigation', async () => {
    const user = userEvent.setup()
    renderWithRouter(<PageNav activeRoute='algorithms' />, '/algorithms/')

    await user.click(screen.getByRole('button', { name: 'Open menu' }))

    const drawer = await screen.findByRole('dialog', { name: 'Menu' })

    await user.click(within(drawer).getByRole('link', { name: '3x3' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument()
      expect(screen.getByTestId('location')).toHaveTextContent('/algorithms/3x3/')
    })
  })

  it('closes the mobile drawer after selecting a language', async () => {
    const user = userEvent.setup()
    renderWithRouter(<PageNav activeRoute='solve' />)

    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    const drawer = await screen.findByRole('dialog', { name: 'Menu' })
    await user.click(within(drawer).getByRole('button', { name: 'Language' }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Português (Brasil)' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument()
      expect(screen.getByTestId('location')).toHaveTextContent('/pt-BR/solve/')
    })
  })

  it('closes the mobile menu with Escape', async () => {
    const user = userEvent.setup()
    renderWithRouter(<PageNav activeRoute='timer' />, '/timer/')

    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    await screen.findByRole('dialog', { name: 'Menu' })
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument()
  })

  it('persists explicit theme choices and returns to system mode', async () => {
    const user = userEvent.setup()
    renderWithRouter(<PageNav activeRoute='solve' />)

    await user.click(screen.getByRole('button', { name: 'Theme' }))
    await user.click(await screen.findByRole('menuitemradio', { name: 'Light' }))

    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    expect(window.localStorage.getItem('rubiks-cube-solver-theme')).toBe('light')

    await user.click(screen.getByRole('button', { name: 'Theme' }))
    await user.click(await screen.findByRole('menuitemradio', { name: 'System' }))

    expect(document.documentElement).not.toHaveAttribute('data-theme')
    expect(window.localStorage.getItem('rubiks-cube-solver-theme')).toBeNull()
  })

  it('shows the moon icon for the dark theme', () => {
    act(() => useThemeStore.getState().setThemePreference('dark'))

    renderWithRouter(<PageNav activeRoute='solve' />)

    expect(
      screen.getByRole('button', { name: 'Theme' }).querySelector('.lucide-moon'),
    ).toBeInTheDocument()

    act(() => useThemeStore.getState().setThemePreference('system'))
  })
})

function renderWithRouter(ui: ReactNode, path = '/solve/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      {ui}
      <LocationProbe />
    </MemoryRouter>,
  )
}

function LocationProbe() {
  const location = useLocation()

  return (
    <output data-testid='location'>{`${location.pathname}${location.search}${location.hash}`}</output>
  )
}
