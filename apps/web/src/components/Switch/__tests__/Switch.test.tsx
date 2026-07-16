import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Switch } from '../Switch'

describe('Switch', () => {
  it('toggles checked state', async () => {
    const user = userEvent.setup()
    render(<SwitchHarness />)

    const control = screen.getByRole('switch', { name: 'Inspection' })
    expect(control).toHaveAttribute('aria-checked', 'false')

    await user.click(control)

    expect(control).toHaveAttribute('aria-checked', 'true')
  })
})

function SwitchHarness() {
  const [checked, setChecked] = useState(false)

  return <Switch aria-label='Inspection' checked={checked} onCheckedChange={setChecked} />
}
