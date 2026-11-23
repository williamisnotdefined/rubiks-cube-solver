import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { LandingPage } from '../LandingPage'

describe('LandingPage', () => {
  it('renders the full landing structure without the app sidebar', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <LandingPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Speedcube\.com\.br/i)
    expect(screen.getByRole('heading', { name: /Eight ways in/i })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Start Solving/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /Open timer/i }).length).toBeGreaterThan(0)
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument()
    expect(screen.getAllByText(/RUST ENGINE/i).length).toBeGreaterThan(0)
  })

  it('renders eight chapter cards at the localized root path', () => {
    render(
      <MemoryRouter initialEntries={['/pt-BR/']}>
        <LandingPage />
      </MemoryRouter>,
    )

    const chapterSection = document.getElementById('chapters')

    expect(chapterSection).not.toBeNull()
    expect(chapterSection?.querySelectorAll('a')).toHaveLength(8)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Speedcube\.com\.br/i)
  })

  it('exposes the eight chapter entry points in order', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <LandingPage />
      </MemoryRouter>,
    )

    const chapterSection = document.getElementById('chapters')
    expect(chapterSection).not.toBeNull()

    const links = within(chapterSection as HTMLElement).getAllByRole('link')

    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/solve/',
      '/timer/',
      '/algorithms/',
      '/notations/3x3/',
      '/records/world/',
      '/channels/',
      '/sites/',
      '/stores/',
    ])
  })
})
