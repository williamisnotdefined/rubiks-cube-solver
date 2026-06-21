import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { NotationGuidePage } from '../NotationGuidePage'

describe('Notation guides', () => {
  it('renders a compact 3x3 notation reference', () => {
    renderWithRoute('/notations/3x3')

    expect(screen.getByRole('heading', { name: '3x3 notation' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Core symbols' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'How to read the moves' })).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('U D R L F B')).toBeInTheDocument()
    expect(screen.getAllByText('M').length).toBeGreaterThan(0)
    expect(screen.getAllByText('E').length).toBeGreaterThan(0)
    expect(screen.getAllByText('S').length).toBeGreaterThan(0)
    expect(screen.getByText("M is the middle slice between L/R and turns like L; M' turns like L'.")).toBeInTheDocument()
    expect(screen.getByText("Rw turns the R face and adjacent inner layer together like R; on 3x3 it equals R M'.")).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Face letters' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Wide moves' })).toBeInTheDocument()
  })

  it('renders Megaminx double turns as degrees instead of vague clicks', () => {
    renderWithRoute('/notations/megaminx')

    expect(screen.getByRole('heading', { name: 'Megaminx notation' })).toBeInTheDocument()
    expect(screen.getByText('++')).toBeInTheDocument()
    expect(screen.getByText('R++')).toBeInTheDocument()
    expect(screen.getByText('++ means a 144-degree turn in the positive direction on Megaminx notation.')).toBeInTheDocument()
    expect(screen.queryByText(/click/i)).not.toBeInTheDocument()
  })

  it('renders Square-1 notation with coordinate and slash symbols', () => {
    renderWithRoute('/notations/square-1')

    expect(screen.getByRole('heading', { name: 'Square-1 notation' })).toBeInTheDocument()
    expect(screen.getByText('(x,y)')).toBeInTheDocument()
    expect(screen.getByText('(1,-3)')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Slash turn' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Shape matters' })).toBeInTheDocument()
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
