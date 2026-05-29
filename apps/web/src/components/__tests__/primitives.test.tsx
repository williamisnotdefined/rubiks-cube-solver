import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Field } from '../Field'
import { LoadingIndicator } from '../LoadingIndicator'

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

describe('LoadingIndicator', () => {
  it('renders an accessible loading indicator by default', () => {
    render(<LoadingIndicator />)

    expect(screen.getByLabelText('Loading')).toBeInTheDocument()
  })

  it('can be decorative inside labelled controls', () => {
    const { container } = render(<LoadingIndicator decorative />)

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  })
})
