import { useRef, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@components/Button'
import { useMagnetic } from '@src/motion/useMagnetic'
import { Field } from '@components/Field'
import { TextInput } from '@components/FormControls'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/Select'
import type { PuzzleDefinition } from '@api/solver/types'
import { maxNodesMillionOptions } from '../constants'
import type { SolveFormSubmit } from '../validation'

export type SolveFormProps = {
  notation: string
  puzzleOptions: readonly PuzzleDefinition[]
  selectedPuzzleSlug: string
  maxMovesInput: string
  maxMovesInvalid: boolean
  maxMovesLimit: number
  maxNodesMillionInput: string
  maxNodesMillionInvalid: boolean
  buttonLoading: boolean
  disabled: boolean
  scanAction: ReactNode
  scramblePlaceholder: string
  onNotationChange: (notation: string) => void
  onPuzzleChange: (puzzleSlug: string) => void
  onMaxMovesChange: (maxMoves: string) => void
  onMaxNodesMillionChange: (maxNodesMillion: string) => void
  onSubmit: (values: SolveFormSubmit) => void
}

export function SolveForm({
  notation,
  puzzleOptions,
  selectedPuzzleSlug,
  maxMovesInput,
  maxMovesInvalid,
  maxMovesLimit,
  maxNodesMillionInput,
  maxNodesMillionInvalid,
  buttonLoading,
  disabled,
  scanAction,
  scramblePlaceholder,
  onNotationChange,
  onPuzzleChange,
  onMaxMovesChange,
  onMaxNodesMillionChange,
  onSubmit,
}: SolveFormProps) {
  const { t } = useTranslation()
  const submitRef = useRef<HTMLDivElement>(null)
  useMagnetic(submitRef)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (disabled) {
      return
    }

    onSubmit({
      maxMoves: Number(maxMovesInput.trim()),
      maxNodesMillion: Number(maxNodesMillionInput.trim()),
      notation: notation.trim(),
      puzzleSlug: selectedPuzzleSlug,
    })
  }

  return (
    <section
      className='solve-form w-full border-2 border-foreground bg-card p-5 text-card-foreground shadow-[6px_6px_0_var(--foreground)]'
      data-route-reveal='true'
      data-testid='solve-form'
    >
      <div className='mb-4 flex items-center justify-between border-b-2 border-foreground pb-2'>
        <span className='label-mono'>01 / INPUT</span>
        <span className='label-mono opacity-50'>{selectedPuzzleSlug.toUpperCase()}</span>
      </div>
      <form aria-label={t('solve.form.formLabel')} className='grid gap-5' onSubmit={handleSubmit}>
        <div className='grid gap-3 sm:grid-cols-[minmax(0,14rem)]' data-testid='puzzle-row'>
          <Field className='field-puzzle' controlId='solve-puzzle' label={t('solve.form.puzzle')}>
            <Select value={selectedPuzzleSlug} onValueChange={onPuzzleChange}>
              <SelectTrigger className='puzzle-input' id='solve-puzzle'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {puzzleOptions.map((puzzle) => (
                  <SelectItem
                    disabled={isPuzzleOptionDisabled(puzzle)}
                    key={puzzle.slug}
                    value={puzzle.slug}
                  >
                    {puzzle.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div data-testid='scramble-row'>
          <Field
            className='field-primary'
            controlId='solve-scramble'
            label={t('solve.form.scramble')}
          >
            <div className='grid grid-cols-[minmax(0,1fr)_auto] gap-2'>
              <TextInput
                autoComplete='off'
                className='primary-input font-mono tracking-[0.04em]'
                id='solve-scramble'
                placeholder={scramblePlaceholder}
                spellCheck={false}
                value={notation}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  onNotationChange(event.target.value)
                }}
              />
              {scanAction}
            </div>
          </Field>
        </div>
        <div
          className='grid gap-3 sm:grid-cols-2 sm:items-end'
          data-testid='limits-row'
        >
          <Field
            className='field-depth'
            controlId='solve-max-moves'
            label={t('solve.form.maxMoves')}
          >
            <TextInput
              aria-invalid={maxMovesInvalid || undefined}
              className='depth-input text-center'
              inputMode='numeric'
              id='solve-max-moves'
              max={maxMovesLimit}
              min='0'
              step='1'
              type='number'
              value={maxMovesInput}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                onMaxMovesChange(event.target.value)
              }}
            />
          </Field>
          <Field
            className='field-nodes'
            controlId='solve-max-nodes'
            label={t('solve.form.maxNodesMillion')}
          >
            <Select value={maxNodesMillionInput} onValueChange={onMaxNodesMillionChange}>
              <SelectTrigger
                aria-invalid={maxNodesMillionInvalid || undefined}
                className='nodes-input text-center'
                id='solve-max-nodes'
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {maxNodesMillionOptions.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className='sm:col-span-2' ref={submitRef}>
            <Button
              aria-label={buttonLoading ? t('common.loading') : undefined}
              className='h-12 w-full font-mono text-xs uppercase tracking-[0.22em]'
              disabled={disabled}
              type='submit'
            >
              {buttonLoading ? t('common.loading') : t('solve.form.solve')}
              <span aria-hidden='true'>→</span>
            </Button>
          </div>
        </div>
      </form>
    </section>
  )
}

function isPuzzleOptionDisabled(puzzle: PuzzleDefinition): boolean {
  return (
    puzzle.status === 'planned' || puzzle.status === 'disabled' || puzzle.strategyIds.length === 0
  )
}
