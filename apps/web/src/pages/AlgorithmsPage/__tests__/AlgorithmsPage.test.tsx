import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AlgorithmSetPage } from '../AlgorithmSetPage'
import { AlgorithmsIndexPage } from '../AlgorithmsIndexPage'
import { AlgorithmsPuzzlePage } from '../AlgorithmsPuzzlePage'

describe('Algorithms pages', () => {
  it('renders the static puzzle index', () => {
    render(
      <MemoryRouter>
        <AlgorithmsIndexPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Algorithms' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '3x3' })).toHaveAttribute('href', '/algoritmos/3x3')
    expect(screen.getByRole('link', { name: '2x2' })).toHaveAttribute('href', '/algoritmos/2x2')
    expect(screen.getByRole('link', { name: '4x4' })).toHaveAttribute('href', '/algoritmos/4x4')
    expect(screen.getByRole('link', { name: '5x5' })).toHaveAttribute('href', '/algoritmos/5x5')
    expect(screen.getByRole('link', { name: '6x6' })).toHaveAttribute('href', '/algoritmos/6x6')
    expect(screen.getByRole('link', { name: 'Square-1' })).toHaveAttribute('href', '/algoritmos/sq1')
    expect(screen.getByRole('link', { name: 'Pyraminx' })).toHaveAttribute('href', '/algoritmos/pyraminx')
    expect(screen.getByRole('link', { name: 'Megaminx' })).toHaveAttribute('href', '/algoritmos/megaminx')
  })

  it('renders algorithm sets for a puzzle route', () => {
    renderWithRoute('/algoritmos/2x2', <Route path="/algoritmos/:puzzleId" element={<AlgorithmsPuzzlePage />} />)

    expect(screen.getByRole('heading', { name: '2x2' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '2x2 OLL' })).toHaveAttribute('href', '/algoritmos/2x2/oll')
    expect(screen.getByRole('link', { name: '2x2 CLL' })).toHaveAttribute('href', '/algoritmos/2x2/cll')
    expect(screen.getByRole('link', { name: '2x2 EG-1' })).toHaveAttribute('href', '/algoritmos/2x2/eg-1')
    expect(screen.getByRole('link', { name: '2x2 EG-2' })).toHaveAttribute('href', '/algoritmos/2x2/eg-2')
  })

  it('renders an OLL algorithm sheet with local case images', () => {
    renderWithRoute('/algoritmos/3x3/oll', <Route path="/algoritmos/:puzzleId/:methodId" element={<AlgorithmSetPage />} />)

    expect(screen.getByRole('heading', { name: '3x3 OLL' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Case' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '3x3 OLL 29' })).toHaveAttribute('src', '/algorithms/3x3/oll/oll-29.png')
    expect(screen.getByText("R U R' U' R U' R' F' U' F R U R'")).toBeInTheDocument()
  })

  it('renders another imported algorithm sheet', () => {
    renderWithRoute('/algoritmos/4x4/pll', <Route path="/algoritmos/:puzzleId/:methodId" element={<AlgorithmSetPage />} />)

    expect(screen.getByRole('heading', { name: '4x4 PLL' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'JPerm 4x4 PLL' })).toHaveAttribute('href', 'https://jperm.net/algs/4x4/pll')
  })

  it('renders a SpeedCubeDB algorithm sheet with local case images', () => {
    renderWithRoute('/algoritmos/3x3/f2l', <Route path="/algoritmos/:puzzleId/:methodId" element={<AlgorithmSetPage />} />)

    expect(screen.getByRole('heading', { name: '3x3 F2L' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'SpeedCubeDB F2L' })).toHaveAttribute('href', 'https://speedcubedb.com/a/3x3/F2L')
    expect(screen.getByRole('img', { name: '3x3 F2L F2L 1' })).toHaveAttribute('src', '/algorithms/3x3/f2l/f2l-f2l-1.svg')
    expect(screen.getByText("U R U' R'")).toBeInTheDocument()
  })
})

function renderWithRoute(path: string, route: ReactElement) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>{route}</Routes>
    </MemoryRouter>,
  )
}
