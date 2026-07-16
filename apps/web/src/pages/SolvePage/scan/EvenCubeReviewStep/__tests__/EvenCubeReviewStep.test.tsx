import type { ScanFaceSymbol } from '@api/solver/types'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  createDefaultEvenCubeFaceRotations,
  createDefaultEvenCubeNetAssignments,
  type EvenCubeInvalidCorner,
  evenCubeFitSolution,
} from '../../evenCubeScan'
import { type ScanFaceDrafts, type ScanSticker, scanFaceOrder } from '../../scanState'
import { EvenCubeReviewStep } from '../EvenCubeReviewStep'

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({
    children,
    onDragEnd,
  }: {
    children: ReactNode
    onDragEnd: (event: { active: { id: string }; over: { id: string } | null }) => void
  }) => (
    <>
      <button type='button' onClick={() => onDragEnd({ active: { id: 'F' }, over: null })}>
        Drop without target
      </button>
      <button type='button' onClick={() => onDragEnd({ active: { id: 'F' }, over: { id: 'U' } })}>
        Drop Front on Up
      </button>
      {children}
    </>
  ),
  KeyboardSensor: function KeyboardSensor() {},
  PointerSensor: function PointerSensor() {},
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
  }),
  useDroppable: () => ({ isOver: false, setNodeRef: vi.fn() }),
  useSensor: () => ({}),
  useSensors: (...sensors: unknown[]) => sensors,
}))

describe('EvenCubeReviewStep', () => {
  it('selects a net face and rotates its captured face', async () => {
    const user = userEvent.setup()
    const onRotateFace = vi.fn()
    renderReview({ onRotateFace })

    const rightSlot = screen.getByRole('button', {
      name: 'Selected slot: Right side · captured face: Left side',
    })
    fireEvent.click(rightSlot)

    expect(
      screen.getByRole('button', {
        name: 'Selected slot: Right side · captured face: Left side',
        pressed: true,
      }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Rotate 90°' }))
    await user.click(screen.getByRole('button', { name: 'Rotate 180°' }))
    await user.click(screen.getByRole('button', { name: 'Rotate -90°' }))

    expect(onRotateFace.mock.calls).toEqual([
      ['L', 90],
      ['L', 180],
      ['L', 270],
    ])
  })

  it('ignores drops outside the net and swaps faces for a valid drop target', async () => {
    const user = userEvent.setup()
    const onSwapFaces = vi.fn()
    renderReview({ onSwapFaces })

    await user.click(screen.getByRole('button', { name: 'Drop without target' }))
    expect(onSwapFaces).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Drop Front on Up' }))

    expect(onSwapFaces).toHaveBeenCalledWith('F', 'U')
    expect(
      screen.getByRole('button', {
        name: 'Selected slot: Up side · captured face: Up side',
      }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it.each([
    ['none', 'Could not fit by rotating faces only. Swap positions or review stickers.'],
    ['unique', 'Fit found and applied. Review the net before solving.'],
    ['suggested', 'Found a likely fit with fewer changes. Apply it only after reviewing the net.'],
    ['ambiguous', 'More than one fit is possible. Adjust the net manually.'],
  ] as const)('reports the %s automatic-fit result', async (status, message) => {
    const user = userEvent.setup()
    const onAutoFit = vi.fn(() => status)
    renderReview({ onAutoFit })

    await user.click(screen.getByRole('button', { name: 'Try automatic fit' }))

    expect(onAutoFit).toHaveBeenCalledOnce()
    expect(screen.getByText(message)).toBeInTheDocument()
  })

  it('applies an available automatic-fit suggestion', async () => {
    const user = userEvent.setup()
    const onApplyAutoFitSuggestion = vi.fn()
    renderReview({
      autoFitSuggestion: evenCubeFitSolution(
        createDefaultEvenCubeNetAssignments(),
        createDefaultEvenCubeFaceRotations(),
      ),
      onApplyAutoFitSuggestion,
    })

    await user.click(screen.getByRole('button', { name: 'Apply suggestion' }))

    expect(onApplyAutoFitSuggestion).toHaveBeenCalledOnce()
  })

  it('allows a structurally valid net to go back or solve', async () => {
    const user = userEvent.setup()
    const onBack = vi.fn()
    const onSolve = vi.fn()
    renderReview({ onBack, onSolve })

    expect(screen.getByText(/corners are structurally valid/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Back and edit' }))
    await user.click(screen.getByRole('button', { name: 'Accept and solve' }))

    expect(onBack).toHaveBeenCalledOnce()
    expect(onSolve).toHaveBeenCalledOnce()
  })

  it('focuses an advisory invalid corner without replacing backend validation', async () => {
    const user = userEvent.setup()
    const onSolve = vi.fn()
    renderReview({ invalidCorners: [invalidCorner], onSolve })

    const invalidCornerButton = screen.getByRole('button', {
      name: /Urf .*Blue\/Red\/Orange.*Red and Orange are opposite faces/i,
    })
    await user.click(invalidCornerButton)

    expect(
      screen.getByRole('button', {
        name: 'Selected slot: Up side · captured face: Up side',
      }),
    ).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Accept and solve' }))
    expect(onSolve).toHaveBeenCalledOnce()
  })

  it('renders an incomplete sticker safely for review', () => {
    const drafts = solidDrafts()
    drafts.F = {
      ...drafts.F,
      stickers: [{ confidence: 0, source: 'empty' }, ...drafts.F.stickers.slice(1)],
    }

    renderReview({ drafts })

    expect(screen.getByText('?')).toBeInTheDocument()
  })
})

const invalidCorner: EvenCubeInvalidCorner = {
  faces: ['U', 'R', 'F'],
  position: 'Urf',
  stickers: ['B', 'R', 'L'],
  targets: [
    { index: 3, slot: 'U' },
    { index: 0, slot: 'R' },
    { index: 1, slot: 'F' },
  ],
}

function renderReview({
  autoFitSuggestion,
  drafts = solidDrafts(),
  invalidCorners = [],
  onApplyAutoFitSuggestion = vi.fn(),
  onAutoFit = vi.fn(() => 'none' as const),
  onBack = vi.fn(),
  onRotateFace = vi.fn(),
  onSolve = vi.fn(),
  onSwapFaces = vi.fn(),
}: {
  autoFitSuggestion?: ReturnType<typeof evenCubeFitSolution>
  drafts?: ScanFaceDrafts
  invalidCorners?: readonly EvenCubeInvalidCorner[]
  onApplyAutoFitSuggestion?: () => void
  onAutoFit?: () => 'ambiguous' | 'none' | 'suggested' | 'unique'
  onBack?: () => void
  onRotateFace?: (face: ScanFaceSymbol, rotation: 0 | 90 | 180 | 270) => void
  onSolve?: () => void
  onSwapFaces?: (sourceSlot: ScanFaceSymbol, targetSlot: ScanFaceSymbol) => void
} = {}) {
  render(
    <EvenCubeReviewStep
      assignments={createDefaultEvenCubeNetAssignments()}
      autoFitSuggestion={autoFitSuggestion}
      drafts={drafts}
      gridSize={2}
      invalidCorners={invalidCorners}
      rotations={createDefaultEvenCubeFaceRotations()}
      solving={false}
      stickersPerFace={4}
      onApplyAutoFitSuggestion={onApplyAutoFitSuggestion}
      onAutoFit={onAutoFit}
      onBack={onBack}
      onRotateFace={onRotateFace}
      onSolve={onSolve}
      onSwapFaces={onSwapFaces}
    />,
  )
}

function solidDrafts(): ScanFaceDrafts {
  return Object.fromEntries(
    scanFaceOrder.map(({ symbol }) => [
      symbol,
      {
        confirmed: true,
        stickers: solidStickers(symbol),
        symbol,
      },
    ]),
  ) as ScanFaceDrafts
}

function solidStickers(symbol: ScanFaceSymbol): ScanSticker[] {
  return Array.from({ length: 4 }, () => ({
    confidence: 1,
    source: 'manual',
    symbol,
  }))
}
