import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Field } from '../Field'

describe('Field', () => {
  it('renders a visible label with children', () => {
    render(
      <Field label="Scramble">
        <input />
      </Field>,
    )

    expect(screen.getByText('Scramble')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })
})
