import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Field } from '../Field'

describe('Field', () => {
  it('associates its label, description, and error with the control', () => {
    render(
      <Field controlId='scramble' description='Use move notation' error='Required' label='Scramble'>
        <input aria-describedby='scramble-description scramble-error' aria-invalid id='scramble' />
      </Field>,
    )

    const input = screen.getByRole('textbox', { name: 'Scramble' })
    expect(input).toHaveAccessibleDescription('Use move notation Required')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Required')
  })
})
