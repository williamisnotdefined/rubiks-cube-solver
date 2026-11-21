import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { ChapterBar } from '../ChapterBar'

describe('ChapterBar', () => {
  it('renders the current chapter number, code and label', () => {
    render(
      <MemoryRouter initialEntries={['/timer/']}>
        <ChapterBar />
      </MemoryRouter>,
    )

    expect(screen.getByText('02 / TIME')).toBeInTheDocument()
    expect(screen.getByText('Timer')).toBeInTheDocument()
  })

  it('can hide the number and override the label', () => {
    render(
      <MemoryRouter initialEntries={['/records/world/']}>
        <ChapterBar label='Custom label' showNumber={false} />
      </MemoryRouter>,
    )

    expect(screen.getByText('RECS')).toBeInTheDocument()
    expect(screen.getByText('Custom label')).toBeInTheDocument()
    expect(screen.queryByText('05 / RECS')).not.toBeInTheDocument()
  })
})
