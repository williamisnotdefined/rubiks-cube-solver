import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TimerDisplay } from '../TimerDisplay'

describe('TimerDisplay', () => {
  it('renders formatted time as a timer', () => {
    render(<TimerDisplay elapsedMs={12_345} status='idle' />)

    expect(screen.getByRole('timer')).toHaveTextContent('12.34')
  })

  it('can render milliseconds', () => {
    render(<TimerDisplay elapsedMs={12_345} showMilliseconds status='running' />)

    expect(screen.getByRole('timer')).toHaveTextContent('12.345')
  })
})
