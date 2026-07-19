import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { StoresPage } from '../StoresPage'
import { cubingStores } from '../stores'

describe('StoresPage', () => {
  it('renders the curated store directory in a single grid', () => {
    render(<StoresPage />)

    expect(screen.getByRole('heading', { name: 'Stores' })).toBeInTheDocument()
    expect(cubingStores).toHaveLength(10)
    expect(cubingStores[0]?.id).toBe('cuber-brasil')
    expect(screen.getAllByRole('link')).toHaveLength(cubingStores.length)
    expect(screen.getByRole('group', { name: 'Filter stores by country' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show stores from China' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByText(/A curated list of 10 independent online stores/)).toBeInTheDocument()
  })

  it('filters the grid with country flag toggles', async () => {
    const user = userEvent.setup()
    render(<StoresPage />)

    const chinaFilter = screen.getByRole('button', { name: 'Show stores from China' })

    await user.click(chinaFilter)

    expect(chinaFilter).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByRole('link')).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'Open Cubezz store' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Open Cuber Brasil store' })).not.toBeInTheDocument()

    await user.click(chinaFilter)

    expect(screen.getAllByRole('link')).toHaveLength(cubingStores.length)
    expect(screen.getByRole('button', { name: 'Show stores from all countries' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('links stores directly with local images when available', () => {
    render(<StoresPage />)

    const cuberBrasilLink = screen.getByRole('link', { name: 'Open Cuber Brasil store' })

    expect(cuberBrasilLink).toHaveAttribute('href', 'https://www.cuberbrasil.com/')
    expect(cuberBrasilLink).toHaveAttribute('target', '_blank')
    expect(cuberBrasilLink).toHaveAttribute('rel', 'noreferrer')
    expect(screen.getByRole('img', { name: 'Cuber Brasil logo' })).toHaveAttribute(
      'src',
      '/sites/cuber-brasil.png',
    )
    expect(screen.getByRole('img', { name: 'Cuber Brasil logo' })).toHaveClass('w-auto')
    expect(screen.getByRole('img', { name: 'The Cubicle logo' })).toHaveAttribute(
      'src',
      '/sites/the-cubicle.png',
    )
  })

  it('hides a store image when it fails to load', () => {
    render(<StoresPage />)
    const cubicleImage = screen.getByRole('img', { name: 'The Cubicle logo' })

    fireEvent.error(cubicleImage)

    expect(cubicleImage).not.toBeVisible()
  })
})
