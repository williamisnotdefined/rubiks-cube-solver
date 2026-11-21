import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageTitle } from '../PageTitle'

describe('PageTitle', () => {
  it('renders a splittable h1 for the shared title animation', () => {
    render(<PageTitle>Algorithms</PageTitle>)

    const title = screen.getByRole('heading', { level: 1, name: 'Algorithms' })

    expect(title).toHaveAttribute('data-split', 'true')
  })
})
