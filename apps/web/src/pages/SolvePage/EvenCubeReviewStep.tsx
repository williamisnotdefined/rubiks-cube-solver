import cls from 'classnames'
import { RotateCcw, RotateCw } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import type { ScanFaceSymbol } from '@api/solver/types'
import { Button } from '@components/Button'
import { Loader3x3 } from '@components/Loader3x3'
import {
  displayIndexToPayloadIndex,
  rotateEvenCubeStickers,
  type EvenCubeFaceRotation,
  type EvenCubeFaceRotations,
  type EvenCubeFitSolution,
  type EvenCubeInvalidCorner,
  type EvenCubeNetAssignments,
} from './evenCubeScan'
import { scanSymbolDetails, type ScanFaceDrafts, type ScanSticker } from './scanState'
import { scanColorInitial, scanColorLabel, scanFaceLabel } from './scanTranslations'

type EvenCubeReviewStepProps = {
  drafts: ScanFaceDrafts
  assignments: EvenCubeNetAssignments
  gridSize: number
  invalidCorners: readonly EvenCubeInvalidCorner[]
  rotations: EvenCubeFaceRotations
  stickersPerFace: number
  solving: boolean
  onBack: () => void
  onRotateFace: (face: ScanFaceSymbol, rotation: EvenCubeFaceRotation) => void
  onSolve: () => void
  onSwapFaces: (sourceSlot: ScanFaceSymbol, targetSlot: ScanFaceSymbol) => void
  onAutoFit: () => 'ambiguous' | 'none' | 'suggested' | 'unique'
  onApplyAutoFitSuggestion: () => void
  autoFitSuggestion: EvenCubeFitSolution | undefined
}

const netFaces: readonly { className: string; symbol: ScanFaceSymbol }[] = [
  { className: 'col-start-2 row-start-1', symbol: 'U' },
  { className: 'col-start-1 row-start-2', symbol: 'L' },
  { className: 'col-start-2 row-start-2', symbol: 'F' },
  { className: 'col-start-3 row-start-2', symbol: 'R' },
  { className: 'col-start-4 row-start-2', symbol: 'B' },
  { className: 'col-start-2 row-start-3', symbol: 'D' },
]

const rotationButtons: readonly { labelKey: string; rotation: EvenCubeFaceRotation }[] = [
  { labelKey: 'scan.evenReview.rotate90', rotation: 90 },
  { labelKey: 'scan.evenReview.rotate180', rotation: 180 },
  { labelKey: 'scan.evenReview.rotate270', rotation: 270 },
]

export function EvenCubeReviewStep({
  drafts,
  assignments,
  gridSize,
  invalidCorners,
  rotations,
  stickersPerFace,
  solving,
  onBack,
  onRotateFace,
  onSolve,
  onSwapFaces,
  onAutoFit,
  onApplyAutoFitSuggestion,
  autoFitSuggestion,
}: EvenCubeReviewStepProps) {
  const { t } = useTranslation()
  const instructionsId = useId()
  const [selectedSlot, setSelectedSlot] = useState<ScanFaceSymbol>('F')
  const [autoFitStatus, setAutoFitStatus] = useState<'ambiguous' | 'none' | 'suggested' | 'unique' | undefined>()
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor))
  const hasInvalidCorners = invalidCorners.length > 0
  const selectedCapturedFace = assignments[selectedSlot]
  const invalidStickerTargets = useMemo(
    () => new Set(invalidCorners.flatMap((corner) => corner.targets.map((target) => invalidTargetKey(target.slot, target.index)))),
    [invalidCorners],
  )
  const invalidSlots = useMemo(
    () => new Set(invalidCorners.flatMap((corner) => corner.targets.map((target) => target.slot))),
    [invalidCorners],
  )

  function handleDragEnd(event: DragEndEvent) {
    const sourceSlot = event.active.id as ScanFaceSymbol
    const targetSlot = event.over?.id as ScanFaceSymbol | undefined
    if (targetSlot === undefined) {
      return
    }

    onSwapFaces(sourceSlot, targetSlot)
    setSelectedSlot(targetSlot)
  }

  function handleAutoFit() {
    setAutoFitStatus(onAutoFit())
  }

  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
      <div className="grid gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-app-muted">
            {t('scan.evenReview.kicker')}
          </p>
          <h3 className="mt-1 text-xl font-extrabold">{t('scan.evenReview.title')}</h3>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-app-muted">
            {t('scan.evenReview.description')}
          </p>
          <p className="mt-1 text-xs font-extrabold uppercase tracking-[0.14em] text-app-muted" id={instructionsId}>
            {t('scan.evenReview.dragInstructions')}
          </p>
        </div>

        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div
            aria-describedby={instructionsId}
            className="grid grid-cols-4 grid-rows-3 gap-2 overflow-auto border border-app-border bg-app-surface-raised p-3"
          >
            {netFaces.map(({ className, symbol }) => (
              <KociembaNetSlot
                assignment={assignments[symbol]}
                className={className}
                drafts={drafts}
                gridSize={gridSize}
                isSelected={selectedSlot === symbol}
                isInvalid={invalidSlots.has(symbol)}
                invalidStickerTargets={invalidStickerTargets}
                key={symbol}
                rotation={rotations[assignments[symbol]] ?? 0}
                slot={symbol}
                stickersPerFace={stickersPerFace}
                onSelect={setSelectedSlot}
              />
            ))}
          </div>
        </DndContext>
      </div>

      <div className="grid content-start gap-4">
        <div className="grid gap-2 border border-app-border bg-app-surface-raised p-3">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-app-muted">
            {t('scan.evenReview.selectedFace', {
              face: scanFaceLabel(t, selectedSlot, 4),
              capturedFace: scanFaceLabel(t, selectedCapturedFace, 4),
            })}
          </span>
          <div className="grid grid-cols-3 gap-2">
            {rotationButtons.map(({ labelKey, rotation }) => (
              <Button
                className="min-h-10 flex-col px-3 py-2 text-xs"
                key={rotation}
                type="button"
                variant="secondary"
                onClick={() => onRotateFace(selectedCapturedFace, rotation)}
              >
                <RotationGlyph rotation={rotation} />
                <span>{t(labelKey)}</span>
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-2 border border-app-border bg-app-surface-raised p-3 text-sm font-semibold text-app-muted">
          <Button className="min-h-10 px-4 py-2" type="button" variant="secondary" onClick={handleAutoFit}>
            {t('scan.evenReview.autoFit')}
          </Button>
          {autoFitStatus === undefined ? null : (
            <p aria-live="polite">{t(`scan.evenReview.autoFit${autoFitStatus}`)}</p>
          )}
          {autoFitSuggestion === undefined ? null : (
            <Button className="min-h-10 px-4 py-2" type="button" variant="secondary" onClick={onApplyAutoFitSuggestion}>
              {t('scan.evenReview.applySuggestion')}
            </Button>
          )}
        </div>

        {hasInvalidCorners ? (
          <div className="grid gap-2 border border-red-300/80 bg-app-surface-raised p-3 text-sm font-semibold text-app-text">
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-red-200">
              {t('scan.evenReview.invalidTitle')}
            </span>
            <p className="text-app-muted">{t('scan.evenReview.invalidDescription')}</p>
            <ul className="grid gap-1 text-app-muted">
              {invalidCorners.map((corner) => (
                <li key={corner.position}>
                  <button
                    className="text-left underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-focus/50"
                    type="button"
                    onClick={() => setSelectedSlot(corner.targets[0].slot)}
                  >
                    {invalidCornerMessage(t, corner)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="border border-emerald-300/80 bg-app-surface-raised p-3 text-sm font-semibold text-app-muted">
            {t('scan.evenReview.validMessage')}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button className="min-h-10 px-4 py-2" type="button" variant="secondary" onClick={onBack}>
            {t('scan.evenReview.back')}
          </Button>
          <Button
            className="min-h-10 px-4 py-2"
            disabled={hasInvalidCorners || solving}
            aria-label={solving ? t('common.loading') : undefined}
            type="button"
            onClick={onSolve}
          >
            {solving ? <Loader3x3 decorative className="size-8" registerDelayMs={150} /> : t('scan.evenReview.solve')}
          </Button>
        </div>
      </div>
    </div>
  )
}

type KociembaNetSlotProps = {
  assignment: ScanFaceSymbol
  className: string
  drafts: ScanFaceDrafts
  gridSize: number
  isSelected: boolean
  invalidStickerTargets: ReadonlySet<string>
  isInvalid: boolean
  rotation: EvenCubeFaceRotation
  slot: ScanFaceSymbol
  stickersPerFace: number
  onSelect: (slot: ScanFaceSymbol) => void
}

function KociembaNetSlot({
  assignment,
  className,
  drafts,
  gridSize,
  isSelected,
  invalidStickerTargets,
  isInvalid,
  rotation,
  slot,
  stickersPerFace,
  onSelect,
}: KociembaNetSlotProps) {
  const { t } = useTranslation()
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id: slot })
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    transform,
  } = useDraggable({ id: slot })
  const style = transform === null ? undefined : {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  }

  return (
    <div className={cls('min-w-24', className)} ref={setDroppableRef}>
      <button
        {...listeners}
        {...attributes}
        aria-label={t('scan.evenReview.selectedFace', {
          face: scanFaceLabel(t, slot, 4),
          capturedFace: scanFaceLabel(t, assignment, 4),
        })}
        aria-pressed={isSelected}
        className={cls(
          'grid w-full border bg-app-surface p-2 text-xs font-extrabold uppercase tracking-[0.12em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-app-focus/50',
          isInvalid ? 'border-red-300 text-app-text' : isSelected ? 'border-app-text text-app-text' : 'border-app-border text-app-muted',
          isOver ? 'ring-2 ring-app-focus/70' : undefined,
        )}
        ref={setDraggableRef}
        style={style}
        type="button"
        onClick={() => onSelect(slot)}
      >
        <StickerGrid
          gridSize={gridSize}
          invalidIndexes={invalidDisplayIndexes(slot, invalidStickerTargets, stickersPerFace)}
          stickers={rotateEvenCubeStickers(drafts[assignment].stickers, rotation)}
        />
      </button>
    </div>
  )
}

function RotationGlyph({ rotation }: { rotation: EvenCubeFaceRotation }) {
  if (rotation === 180) {
    return <RotateCcw aria-hidden="true" className="size-5" strokeWidth={2} />
  }

  if (rotation === 270) {
    return <RotateCcw aria-hidden="true" className="size-5" strokeWidth={2} />
  }

  return <RotateCw aria-hidden="true" className="size-5" strokeWidth={2} />
}

function invalidCornerMessage(t: ReturnType<typeof useTranslation>['t'], corner: EvenCubeInvalidCorner): string {
  const faceLabels = corner.faces.map((face) => scanFaceLabel(t, face, 4)).join('/')
  const colorLabels = corner.stickers.map((symbol) => scanColorLabel(t, symbol)).join('/')
  const opposite = oppositeStickerPair(corner.stickers)
  const oppositeMessage = opposite === undefined
    ? ''
    : ` ${t('scan.evenReview.oppositePair', {
      first: scanColorLabel(t, opposite[0]),
      second: scanColorLabel(t, opposite[1]),
    })}`

  return `${corner.position} (${faceLabels}): ${colorLabels}.${oppositeMessage}`
}

function oppositeStickerPair(
  stickers: readonly ScanFaceSymbol[],
): readonly [ScanFaceSymbol, ScanFaceSymbol] | undefined {
  const pairs: readonly (readonly [ScanFaceSymbol, ScanFaceSymbol])[] = [['U', 'D'], ['R', 'L'], ['F', 'B']]
  return pairs.find(([first, second]) => stickers.includes(first) && stickers.includes(second))
}

function StickerGrid({
  gridSize,
  invalidIndexes,
  stickers,
}: {
  gridSize: number
  invalidIndexes: ReadonlySet<number>
  stickers: readonly ScanSticker[]
}) {
  const { t } = useTranslation()

  return (
    <span className="grid aspect-square gap-1" style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}>
      {stickers.map((sticker, index) => {
        const details = sticker.symbol === undefined ? undefined : scanSymbolDetails[sticker.symbol]

        return (
          <span
            className={cls(
              'grid min-h-8 place-items-center border text-xs font-extrabold',
              invalidIndexes.has(index) ? 'border-red-300 ring-2 ring-red-300/80' : 'border-app-border',
            )}
            key={index}
            style={details === undefined ? undefined : { backgroundColor: details.background, color: details.foreground }}
          >
            {sticker.symbol === undefined ? '?' : scanColorInitial(t, sticker.symbol)}
          </span>
        )
      })}
    </span>
  )
}

function invalidDisplayIndexes(
  slot: ScanFaceSymbol,
  invalidStickerTargets: ReadonlySet<string>,
  stickersPerFace: number,
): ReadonlySet<number> {
  const indexes = new Set<number>()
  for (let index = 0; index < stickersPerFace; index += 1) {
    if (invalidStickerTargets.has(invalidTargetKey(slot, displayIndexToPayloadIndex(slot, index)))) {
      indexes.add(index)
    }
  }

  return indexes
}

function invalidTargetKey(slot: ScanFaceSymbol, index: number): string {
  return `${slot}:${index}`
}
