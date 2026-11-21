import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import { CommandPalette } from '../CommandPalette'

describe('CommandPalette', () => {
  it('opens with the keyboard shortcut and navigates to a selected route', async () => {
    renderPalette()

    fireEvent.keyDown(window, { ctrlKey: true, key: 'k' })

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText('Jump to a page…'), {
      target: { value: 'timer' },
    })
    fireEvent.click(await screen.findByRole('option', { name: /timer/i }))

    expect(screen.getByTestId('location')).toHaveTextContent('/timer/')
  })

  it('opens from the global command event', async () => {
    renderPalette()

    fireEvent(window, new Event('speedcube:command-palette'))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Jump to a page…')).toBeInTheDocument()
  })
})

function renderPalette() {
  return render(
    <MemoryRouter initialEntries={['/solve/']}>
      <CommandPalette />
      <LocationProbe />
    </MemoryRouter>,
  )
}

function LocationProbe() {
  const location = useLocation()

  return <p data-testid='location'>{location.pathname}</p>
}
