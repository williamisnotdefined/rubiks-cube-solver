import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { NotationGuidePage } from '../NotationGuidePage'

describe('Notation guides', () => {
  it('renders a 3x3 notation tutorial with local image assets', () => {
    renderWithRoute('/notations/3x3')

    expect(screen.getByRole('heading', { name: '3x3 notation' })).toBeInTheDocument()
    expect(screen.getByText('Core symbols')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Generated 3x3 cube diagram' })).toHaveAttribute('src', '/notations/3x3.svg')
    expect(screen.queryByText('Source:')).not.toBeInTheDocument()
    expect(screen.getByText('U D R L F B')).toBeInTheDocument()
    expect(screen.getByText('Rw')).toBeInTheDocument()
  })

  it('renders Square-1 notation with coordinate and slash symbols', () => {
    renderWithRoute('/notations/square-1')

    expect(screen.getByRole('heading', { name: 'Square-1 notation' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Solved Square-1 puzzle' })).toHaveAttribute('src', '/notations/square-1.jpg')
    expect(screen.getByRole('link', { name: 'Wikimedia Commons' })).toHaveAttribute('href', 'https://commons.wikimedia.org/wiki/File:Square-1_solved.jpg')
    expect(screen.getByText('(x,y)')).toBeInTheDocument()
    expect(screen.getByText('(1,-3)')).toBeInTheDocument()
    expect(screen.getByText('Slash turn')).toBeInTheDocument()
  })

  it('redirects unknown notation routes to the 3x3 guide', () => {
    renderWithRoute('/notations/unknown')

    expect(screen.getByRole('heading', { name: '3x3 notation' })).toBeInTheDocument()
  })
})

function renderWithRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/notations/:puzzleId" element={<NotationGuidePage />} />
      </Routes>
    </MemoryRouter>,
  )
}
