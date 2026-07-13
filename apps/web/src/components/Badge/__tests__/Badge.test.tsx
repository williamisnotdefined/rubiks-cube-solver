import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Badge } from '../Badge'

describe('Badge', () => {
  it('passes badge behavior to its child element', () => {
    render(
      <Badge asChild>
        <a href='/records/world'>World records</a>
      </Badge>,
    )

    const link = screen.getByRole('link', { name: 'World records' })
    expect(link).toHaveAttribute('data-slot', 'badge')
    expect(link).toHaveAttribute('href', '/records/world')
  })
})
