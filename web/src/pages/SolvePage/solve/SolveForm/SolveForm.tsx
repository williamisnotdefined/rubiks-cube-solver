import { useMemo, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { Camera } from 'lucide-react'
import { Button } from '@components/Button'
import { Field } from '@components/Field'
import { TextInput } from '@components/FormControls'
import { Loader3x3 } from '@components/Loader3x3'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/Select'
import type { PuzzleDefinition } from '@api/solver/types'
import { maxNodesMillionOptions } from '../constants'
import {
  createSolveFormSchema,
  solveFormValuesToSubmit,
  type SolveFormSubmit,
  type SolveFormValues,
} from '../validation'

type SolveFormProps = {
  notation: string
  puzzleOptions: readonly PuzzleDefinition[]
  selectedPuzzleSlug: string
  maxMovesInput: string
  maxMovesLimit: number
  maxNodesMillionInput: string
  buttonLoading: boolean
  disabled: boolean
  scanAvailable: boolean
  scramblePlaceholder: string
  onScanClick: () => void
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
  maxMovesLimit,
  maxNodesMillionInput,
  buttonLoading,
  disabled,
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
  const schema = useMemo(() => createSolveFormSchema(maxMovesLimit), [maxMovesLimit])
  const values = useMemo<SolveFormValues>(
    () => ({
      maxMovesInput,
      maxNodesMillionInput,
      notation,
      selectedPuzzleSlug,
    }),
    [maxMovesInput, maxNodesMillionInput, notation, selectedPuzzleSlug],
  )
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<SolveFormValues>({
    mode: 'onChange',
    resolver: zodResolver(schema),
    values,
  })

  return (
    <form
      className="solve-form grid w-full max-w-4xl gap-3"
      data-testid="solve-form"
      onSubmit={handleSubmit((formValues) => onSubmit(solveFormValuesToSubmit(formValues)))}
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,14rem)]" data-testid="puzzle-row">
        <Field className="field-puzzle" label={t('solve.form.puzzle')}>
          <Controller
            control={control}
            name="selectedPuzzleSlug"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value)
                  onPuzzleChange(value)
                }}
              >
                <SelectTrigger
                  aria-label={t('solve.form.puzzle')}
                  className="puzzle-input"
                  onBlur={field.onBlur}
                >
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
            )}
          />
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
              {...register('notation', {
                onChange: (event: ChangeEvent<HTMLInputElement>) => onNotationChange(event.target.value),
              })}
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
            aria-invalid={errors.maxMovesInput !== undefined || undefined}
            className="depth-input text-center"
            inputMode="numeric"
            max={maxMovesLimit}
            min="0"
            step="1"
            type="number"
            {...register('maxMovesInput', {
              onChange: (event: ChangeEvent<HTMLInputElement>) => onMaxMovesChange(event.target.value),
            })}
          />
        </Field>
        <Field className="field-nodes" label={t('solve.form.maxNodesMillion')}>
          <Controller
            control={control}
            name="maxNodesMillionInput"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value)
                  onMaxNodesMillionChange(value)
                }}
              >
                <SelectTrigger
                  aria-invalid={errors.maxNodesMillionInput !== undefined || undefined}
                  aria-label={t('solve.form.maxNodesMillion')}
                  className="nodes-input text-center"
                  onBlur={field.onBlur}
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
            )}
          />
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
