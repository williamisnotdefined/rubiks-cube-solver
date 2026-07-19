import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CubingSitesPage } from '../CubingSitesPage'
import { cubingSites } from '../sites'

describe('CubingSitesPage', () => {
  it('renders the curated cubing site grid', () => {
    render(<CubingSitesPage />)

    expect(screen.getByRole('heading', { name: 'Sites' })).toBeInTheDocument()
    expect(cubingSites).toHaveLength(33)
    expect(screen.getAllByRole('link')).toHaveLength(cubingSites.length)
    expect(
      screen.getByText(
        `A curated list of ${cubingSites.length} validated cubing websites for solutions, algorithms, tools, competitions, brands, and community.`,
      ),
    ).toBeInTheDocument()
  })

  it('links site cards to external websites with local images', () => {
    render(<CubingSitesPage />)

    const jPermLink = screen.getByRole('link', { name: 'Open J Perm website' })

    expect(jPermLink).toHaveAttribute('href', 'https://jperm.net/')
    expect(jPermLink).toHaveAttribute('target', '_blank')
    expect(jPermLink).toHaveAttribute('rel', 'noreferrer')
    expect(screen.getByRole('img', { name: 'J Perm site icon' })).toHaveAttribute(
      'src',
      '/sites/j-perm.png',
    )
    expect(cubingSites.every((site) => site.imagePath.startsWith('/sites/'))).toBe(true)
  })

  it('hides a site image when it fails to load', () => {
    render(<CubingSitesPage />)
    const jPermImage = screen.getByRole('img', { name: 'J Perm site icon' })

    fireEvent.error(jPermImage)

    expect(jPermImage).not.toBeVisible()
  })
})
