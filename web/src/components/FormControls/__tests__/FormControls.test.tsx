import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TextInput } from '../FormControls'

describe('FormControls', () => {
  it('passes native props to text inputs', () => {
    render(<TextInput aria-label="Scramble" aria-invalid placeholder="R U" />)

    const input = screen.getByLabelText('Scramble')
    expect(input).toHaveAttribute('placeholder', 'R U')
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })
})
