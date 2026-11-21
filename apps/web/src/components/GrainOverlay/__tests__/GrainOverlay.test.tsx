import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GrainOverlay } from '../GrainOverlay'

describe('GrainOverlay', () => {
  it('renders a decorative grain layer', () => {
    render(<GrainOverlay />)

    const overlay = screen.getByTestId('grain-overlay')

    expect(overlay).toHaveAttribute('aria-hidden', 'true')
    expect(overlay).toHaveClass('grain-overlay')
  })
})
