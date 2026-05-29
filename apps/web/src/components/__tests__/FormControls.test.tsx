import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SelectInput, TextInput } from '../FormControls'

describe('FormControls', () => {
  it('passes native props to text inputs', () => {
    render(<TextInput aria-label="Scramble" aria-invalid placeholder="R U" />)

    const input = screen.getByLabelText('Scramble')
    expect(input).toHaveAttribute('placeholder', 'R U')
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('passes native props to select inputs', () => {
    render(
      <SelectInput aria-label="Max nodes" defaultValue="10">
        <option value="10">10</option>
      </SelectInput>,
    )

    expect(screen.getByLabelText('Max nodes')).toHaveValue('10')
  })
})
