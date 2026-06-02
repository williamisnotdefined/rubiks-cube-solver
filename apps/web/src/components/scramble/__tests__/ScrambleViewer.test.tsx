import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ScrambleViewer } from '../ScrambleViewer'

describe('ScrambleViewer', () => {
  it('renders the active event and scramble', () => {
    render(<ScrambleViewer eventLabel="3x3x3" scramble="R U R' U'" />)

    expect(screen.getByText(/3x3x3/)).toBeInTheDocument()
    expect(screen.getByText("R U R' U'")).toBeInTheDocument()
  })
})
