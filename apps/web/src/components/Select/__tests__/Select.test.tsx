import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../Select'

describe('Select', () => {
  it('selects an item through the accessible combobox', async () => {
    const user = userEvent.setup()
    render(<SelectHarness />)

    await user.click(screen.getByRole('combobox', { name: 'Max nodes' }))
    await user.click(screen.getByRole('option', { name: '15' }))

    expect(screen.getByRole('combobox', { name: 'Max nodes' })).toHaveTextContent('15')
  })

  it('renders the selected value when the trigger has no children', () => {
    render(
      <Select defaultValue='15'>
        <SelectTrigger aria-label='Max nodes' />
        <SelectContent>
          <SelectItem value='10'>10</SelectItem>
          <SelectItem value='15'>15</SelectItem>
        </SelectContent>
      </Select>,
    )

    expect(screen.getByRole('combobox', { name: 'Max nodes' })).toHaveTextContent('15')
  })
})

function SelectHarness() {
  const [value, setValue] = useState('10')

  return (
    <Select value={value} onValueChange={setValue}>
      <SelectTrigger aria-label='Max nodes'>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='10'>10</SelectItem>
        <SelectItem value='15'>15</SelectItem>
      </SelectContent>
    </Select>
  )
}
