import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SessionSummary } from '../SessionSummary'

describe('SessionSummary', () => {
  it('renders the event, session name, and solve count', () => {
    render(<SessionSummary eventLabel="3x3x3" sessionName="Main session" solveCount={12} />)

    expect(screen.getByText('3x3x3')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Main session' })).toBeInTheDocument()
    expect(screen.getByText('12 solves')).toBeInTheDocument()
  })
})
