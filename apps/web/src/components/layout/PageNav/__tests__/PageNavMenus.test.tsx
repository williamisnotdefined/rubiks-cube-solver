import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useThemeStore } from '@core/theme/themeStore'
import { algorithmPuzzles, setsForPuzzle } from '@pages/AlgorithmsPage/sets/algorithmSetMetadata'
import { notationPuzzleGroups } from '@pages/NotationsPage/notationGuides'
import {
  AlgorithmsMenuDialog,
  MobileNavDialog,
  NotationsMenuDialog,
  ThemeMenuDialog,
} from '../PageNavMenus'

afterEach(() => {
  act(() => useThemeStore.getState().setThemePreference('system'))
})

describe('PageNavMenus', () => {
  it('renders and dismisses the mobile navigation dialog', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()

    render(
      <MobileNavDialog open onOpenChange={onOpenChange}>
        <a href="/solve/">Solver</a>
      </MobileNavDialog>,
    )

    expect(screen.getByRole('dialog', { name: 'Menu' })).toHaveTextContent('Solver')
    await user.click(screen.getByRole('button', { name: 'Close menu' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('renders localized notation links and notifies its owner after navigation', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()

    renderMenu(
      <NotationsMenuDialog
        locale="pt-BR"
        open
        onNavigate={onNavigate}
        onOpenChange={vi.fn()}
      />,
    )

    for (const group of notationPuzzleGroups) {
      for (const guide of group.puzzles) {
        expect(screen.getByRole('link', { name: guide.puzzle })).toHaveAttribute(
          'href',
          `/pt-BR${guide.path}/`,
        )
      }
    }

    await user.click(screen.getByRole('link', { name: notationPuzzleGroups[0].puzzles[0].puzzle }))
    expect(onNavigate).toHaveBeenCalledOnce()
  })

  it('renders localized algorithm-set links and delegates dialog dismissal', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    const onOpenChange = vi.fn()

    renderMenu(
      <AlgorithmsMenuDialog
        locale="es"
        open
        onNavigate={onNavigate}
        onOpenChange={onOpenChange}
      />,
    )

    for (const puzzle of algorithmPuzzles) {
      for (const set of setsForPuzzle(puzzle.id)) {
        expect(screen.getByRole('link', { name: set.title })).toHaveAttribute(
          'href',
          `/es${set.path}/`,
        )
      }
    }

    await user.click(screen.getByRole('link', { name: setsForPuzzle(algorithmPuzzles[0].id)[0].title }))
    expect(onNavigate).toHaveBeenCalledOnce()

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('selects each theme preference and closes the theme dialog', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const { unmount } = render(<ThemeMenuDialog open onOpenChange={onOpenChange} />)

    expect(screen.getByRole('menuitemradio', { name: 'System' })).toHaveAttribute('aria-checked', 'true')

    await user.click(screen.getByRole('menuitemradio', { name: 'Light' }))
    expect(useThemeStore.getState().theme).toBe('light')
    expect(onOpenChange).toHaveBeenLastCalledWith(false)

    unmount()
    onOpenChange.mockClear()
    render(<ThemeMenuDialog open onOpenChange={onOpenChange} />)
    await user.click(screen.getByRole('menuitemradio', { name: 'Dark' }))

    expect(useThemeStore.getState().theme).toBe('dark')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

function renderMenu(children: ReactNode) {
  return render(<MemoryRouter>{children}</MemoryRouter>)
}
