import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '../Button'

describe('Button', () => {
  it('renders native button props and variant classes', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()

    render(
      <Button className='custom-class' type='button' variant='secondary' onClick={handleClick}>
        Solve
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Solve' })
    expect(button).toHaveClass('custom-class')
    expect(button).toHaveAttribute('type', 'button')

    await user.click(button)

    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
