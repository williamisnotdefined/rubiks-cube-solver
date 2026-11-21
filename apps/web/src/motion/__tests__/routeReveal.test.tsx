import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RouteRevealProvider } from '../RouteRevealProvider'
import { useRouteTitleReveal } from '../routeReveal'

function RevealProbe() {
  return <span>{useRouteTitleReveal() ? 'revealing' : 'waiting'}</span>
}

describe('route title reveal', () => {
  it('waits during cover/waiting and latches once the reveal starts', () => {
    const { rerender } = render(
      <RouteRevealProvider phase='covering'>
        <RevealProbe />
      </RouteRevealProvider>,
    )

    expect(screen.getByText('waiting')).toBeInTheDocument()

    rerender(
      <RouteRevealProvider phase='waiting'>
        <RevealProbe />
      </RouteRevealProvider>,
    )
    expect(screen.getByText('waiting')).toBeInTheDocument()

    rerender(
      <RouteRevealProvider phase='revealing'>
        <RevealProbe />
      </RouteRevealProvider>,
    )
    expect(screen.getByText('revealing')).toBeInTheDocument()

    rerender(
      <RouteRevealProvider phase='idle'>
        <RevealProbe />
      </RouteRevealProvider>,
    )
    expect(screen.getByText('revealing')).toBeInTheDocument()
  })
})
