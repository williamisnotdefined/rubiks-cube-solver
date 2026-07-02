import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ScrambleEvent } from '@core/scramble/types'
import { ScrambleSelector } from '../ScrambleSelector'

const events: ScrambleEvent[] = [
  scrambleEvent({ group: 'WCA', id: '333', label: '3x3x3' }),
  scrambleEvent({ group: 'WCA', id: '222', label: '2x2x2', puzzleSlug: 'cube-2x2x2' }),
  scrambleEvent({ group: 'Training', id: '333-mbld', label: '3x3 MBLD' }),
]

function scrambleEvent(event: Pick<ScrambleEvent, 'group' | 'id' | 'label'> & Partial<ScrambleEvent>): ScrambleEvent {
  return {
    defaultLength: 20,
    generator: 'threeByThreeRandomMove',
    puzzle: 'Cube',
    puzzleSlug: 'cube-3x3x3',
    quality: 'wcaLike',
    ...event,
  }
}

describe('ScrambleSelector', () => {
  it('groups events and emits selection changes', async () => {
    const user = userEvent.setup()
    const onEventChange = vi.fn()

    render(
      <ScrambleSelector
        events={events}
        selectedEventId="333"
        onEventChange={onEventChange}
      />,
    )

    await user.click(screen.getByRole('combobox', { name: 'Event' }))

    expect(screen.getByText('WCA')).toBeInTheDocument()
    expect(screen.getByText('Training')).toBeInTheDocument()

    await user.click(screen.getByRole('option', { name: '3x3 MBLD' }))

    expect(onEventChange).toHaveBeenCalledWith('333-mbld')
  })
})
