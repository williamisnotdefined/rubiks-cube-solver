import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ScrambleViewer } from '../ScrambleViewer'

describe('ScrambleViewer', () => {
  it('renders the active event and scramble', () => {
    render(<ScrambleViewer eventLabel="3x3x3" scramble="R U R' U'" />)

    expect(screen.getByText(/3x3x3/)).toBeInTheDocument()
    expect(screen.getByText("R U R' U'")).toBeInTheDocument()
  })

  it('preserves multiline scrambles', () => {
    render(<ScrambleViewer eventLabel="3x3 MBLD" scramble={'1. R U\n2. F B'} />)

    expect(screen.getByText(/1\. R U/)).toHaveClass('whitespace-pre-wrap')
    expect(screen.getByText(/2\. F B/)).toBeInTheDocument()
  })
})
