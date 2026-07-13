import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Popover, PopoverContent, PopoverTrigger } from '../Popover'

describe('Popover', () => {
  it('opens content with the default positioning options', async () => {
    const user = userEvent.setup()
    render(
      <Popover>
        <PopoverTrigger>Show details</PopoverTrigger>
        <PopoverContent>Record details</PopoverContent>
      </Popover>,
    )

    await user.click(screen.getByRole('button', { name: 'Show details' }))

    expect(await screen.findByText('Record details')).toBeVisible()
  })
})
