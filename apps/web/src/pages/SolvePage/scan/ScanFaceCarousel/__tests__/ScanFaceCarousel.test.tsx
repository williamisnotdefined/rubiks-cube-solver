import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ScanFaceCarousel } from '../ScanFaceCarousel'

const emblaMocks = vi.hoisted(() => ({
  off: vi.fn(),
  on: vi.fn(),
  scrollTo: vi.fn(),
  selectedScrollSnap: vi.fn(),
}))

vi.mock('embla-carousel-react', () => ({
  default: () => [vi.fn(), emblaMocks],
}))

describe('ScanFaceCarousel', () => {
  beforeEach(() => {
    emblaMocks.off.mockClear()
    emblaMocks.on.mockClear()
    emblaMocks.scrollTo.mockClear()
    emblaMocks.selectedScrollSnap.mockReset()
  })

  it('shows all status labels and navigates with buttons', async () => {
    const user = userEvent.setup()
    const onFaceIndexChange = vi.fn()
    render(
      <ScanFaceCarousel
        currentFaceIndex={1}
        faceStatuses={['confirmed', 'draft', 'invalid', 'needsReview', 'pending', 'pending']}
        onFaceIndexChange={onFaceIndexChange}
      >
        <p>active face content</p>
      </ScanFaceCarousel>,
    )

    expect(screen.getByRole('button', { name: /Go to Green face, confirmed/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Go to Red face, draft/ })).toHaveAttribute(
      'aria-current',
      'step',
    )
    expect(screen.getByRole('button', { name: /Go to Blue face, invalid/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Go to Orange face, review/ })).toBeInTheDocument()
    expect(screen.getByText('active face content')).toBeInTheDocument()
    expect(emblaMocks.scrollTo).toHaveBeenCalledWith(1)

    await user.click(screen.getByRole('button', { name: 'Previous' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: /Go to Blue face, invalid/ }))

    expect(onFaceIndexChange).toHaveBeenCalledWith(0)
    expect(onFaceIndexChange).toHaveBeenCalledWith(2)
  })

  it('uses positional face labels for 2x2 scans', () => {
    render(
      <ScanFaceCarousel
        currentFaceIndex={0}
        faceStatuses={['pending', 'pending', 'pending', 'pending', 'pending', 'pending']}
        stickersPerFace={4}
        onFaceIndexChange={vi.fn()}
      >
        <p>active face content</p>
      </ScanFaceCarousel>,
    )

    expect(screen.getByRole('button', { name: /Go to Front side, pending/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Go to Right side, pending/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Go to Back side, pending/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Go to Left side, pending/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Go to Up side, pending/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Go to Down side, pending/ })).toBeInTheDocument()
  })

  it('forwards Embla selection changes and unregisters the handler', () => {
    const onFaceIndexChange = vi.fn()
    const { unmount } = render(
      <ScanFaceCarousel
        currentFaceIndex={0}
        faceStatuses={[]}
        onFaceIndexChange={onFaceIndexChange}
      >
        <p>active face content</p>
      </ScanFaceCarousel>,
    )
    const selectHandler = emblaMocks.on.mock.calls.find(([event]) => event === 'select')?.[1]
    expect(selectHandler).toBeTypeOf('function')

    emblaMocks.selectedScrollSnap.mockReturnValue(3)
    selectHandler?.()

    emblaMocks.selectedScrollSnap.mockReturnValue(0)
    selectHandler?.()

    expect(onFaceIndexChange).toHaveBeenCalledTimes(1)
    expect(onFaceIndexChange).toHaveBeenCalledWith(3)

    unmount()

    expect(emblaMocks.off).toHaveBeenCalledWith('select', selectHandler)
  })
})
