import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { InspectionBar } from '../InspectionBar'

describe('InspectionBar', () => {
  it('shows inspection time and only displays non-ok penalties', () => {
    const { rerender } = render(<InspectionBar enabled={false} penalty='ok' remainingMs={12_340} />)

    expect(screen.queryByText('WCA inspection')).not.toBeInTheDocument()

    rerender(<InspectionBar enabled penalty='plus2' remainingMs={12_340} />)

    expect(screen.getByText('WCA inspection')).toBeInTheDocument()
    expect(screen.getByText('12.34')).toBeInTheDocument()
    expect(screen.getByText('+2')).toBeInTheDocument()

    rerender(<InspectionBar enabled penalty='ok' remainingMs={12_340} />)

    expect(screen.queryByText('+2')).not.toBeInTheDocument()
  })
})
