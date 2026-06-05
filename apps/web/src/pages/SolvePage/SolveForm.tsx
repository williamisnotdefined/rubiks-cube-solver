import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera } from 'lucide-react'
import { Button } from '@components/Button'
import { Field } from '@components/Field'
import { SelectInput, TextInput } from '@components/FormControls'
import { Loader3x3 } from '@components/Loader3x3'
import type { PuzzleDefinition } from '@api/solver/types'
import { maxNodesMillionOptions } from './constants'

type SolveFormProps = {
  notation: string
  puzzleOptions: readonly PuzzleDefinition[]
  selectedPuzzleSlug: string
  maxMovesInput: string
  maxMovesLimit: number
  maxNodesMillionInput: string
  buttonLoading: boolean
  disabled: boolean
  maxMovesInvalid?: boolean
  maxNodesInvalid?: boolean
  scanAvailable: boolean
  scramblePlaceholder: string
  onScanClick: () => void
  onNotationChange: (notation: string) => void
  onPuzzleChange: (puzzleSlug: string) => void
  onMaxMovesChange: (maxMoves: string) => void
  onMaxNodesMillionChange: (maxNodesMillion: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function SolveForm({
  notation,
  puzzleOptions,
  selectedPuzzleSlug,
  maxMovesInput,
  maxMovesLimit,
  maxNodesMillionInput,
  buttonLoading,
  disabled,
  maxMovesInvalid = false,
  maxNodesInvalid = false,
  scanAvailable,
  scramblePlaceholder,
  onScanClick,
  onNotationChange,
  onPuzzleChange,
  onMaxMovesChange,
  onMaxNodesMillionChange,
  onSubmit,
}: SolveFormProps) {
  const { t } = useTranslation()

  return (
    <form
      className="solve-form grid w-full max-w-4xl gap-3"
      data-testid="solve-form"
      onSubmit={onSubmit}
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,14rem)]" data-testid="puzzle-row">
        <Field className="field-puzzle" label={t('solve.form.puzzle')}>
          <SelectInput
            className="puzzle-input"
            value={selectedPuzzleSlug}
            onChange={(event) => onPuzzleChange(event.target.value)}
          >
            {puzzleOptions.map((puzzle) => (
              <option
                disabled={isPuzzleOptionDisabled(puzzle)}
                key={puzzle.slug}
                value={puzzle.slug}
              >
                {puzzle.label}
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>
      <div data-testid="scramble-row">
        <Field className="field-primary" label={t('solve.form.scramble')}>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <TextInput
              autoComplete="off"
              className="primary-input font-mono tracking-[0.08em]"
              placeholder={scramblePlaceholder}
              spellCheck={false}
              value={notation}
              onChange={(event) => onNotationChange(event.target.value)}
            />
            <Button
              aria-label={t('solve.form.scanCube')}
              className="aspect-square min-h-0 w-12 px-0 py-0"
              disabled={!scanAvailable}
              title={scanAvailable ? undefined : t('solve.form.scanUnavailableForPuzzle')}
              type="button"
              variant="secondary"
              onClick={onScanClick}
            >
              <Camera aria-hidden="true" />
            </Button>
          </div>
        </Field>
      </div>
      <div
        className="grid gap-3 sm:grid-cols-[minmax(0,10rem)_minmax(0,12rem)_auto] sm:items-end"
        data-testid="limits-row"
      >
        <Field className="field-depth" label={t('solve.form.maxMoves')}>
          <TextInput
            aria-invalid={maxMovesInvalid || undefined}
            className="depth-input text-center"
            inputMode="numeric"
            max={maxMovesLimit}
            min="0"
            step="1"
            type="number"
            value={maxMovesInput}
            onChange={(event) => onMaxMovesChange(event.target.value)}
          />
        </Field>
        <Field className="field-nodes" label={t('solve.form.maxNodesMillion')}>
          <SelectInput
            aria-invalid={maxNodesInvalid || undefined}
            className="nodes-input text-center"
            value={maxNodesMillionInput}
            onChange={(event) => onMaxNodesMillionChange(event.target.value)}
          >
            {maxNodesMillionOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Button
          aria-label={buttonLoading ? t('common.loading') : undefined}
          className="w-full sm:w-auto"
          type="submit"
          disabled={disabled}
        >
          {buttonLoading ? <Loader3x3 decorative className="size-8" registerDelayMs={150} /> : t('solve.form.solve')}
        </Button>
      </div>
    </form>
  )
}

function isPuzzleOptionDisabled(puzzle: PuzzleDefinition): boolean {
  return (
    puzzle.status === 'planned' ||
    puzzle.status === 'disabled' ||
    puzzle.strategyIds.length === 0
  )
}
