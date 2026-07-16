import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '../Sheet'

describe('Sheet', () => {
  it.each([
    ['top', 'top-0', 'Top filters'],
    ['bottom', 'bottom-0', 'Bottom filters'],
  ] as const)('positions content on the %s edge', (side, expectedClass, title) => {
    render(
      <Sheet open>
        <SheetContent closeLabel='Close' side={side}>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>Choose record filters</SheetDescription>
        </SheetContent>
      </Sheet>,
    )

    expect(screen.getByRole('dialog', { name: title })).toHaveClass(expectedClass)
  })
})
