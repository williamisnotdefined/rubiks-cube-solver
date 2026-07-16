import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Checkbox } from '../Checkbox'

describe('Checkbox', () => {
  it('toggles checked state', async () => {
    const user = userEvent.setup()
    render(<CheckboxHarness />)

    const control = screen.getByRole('checkbox', { name: 'Use inspection' })
    expect(control).toHaveAttribute('aria-checked', 'false')

    await user.click(control)

    expect(control).toHaveAttribute('aria-checked', 'true')
  })
})

function CheckboxHarness() {
  const [checked, setChecked] = useState(false)

  return (
    <Checkbox
      aria-label='Use inspection'
      checked={checked}
      onCheckedChange={(nextChecked) => setChecked(nextChecked === true)}
    />
  )
}
