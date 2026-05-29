import type { FormEvent } from 'react'
import { Button } from '@components/Button'
import { Field } from '@components/Field'
import { SelectInput, TextInput } from '@components/FormControls'
import { LoadingIndicator } from '@components/LoadingIndicator'
import { maxMovesLimit, maxNodesMillionOptions } from './constants'

type SolveFormProps = {
  notation: string
  maxMovesInput: string
  maxNodesMillionInput: string
  buttonLoading: boolean
  disabled: boolean
  maxMovesInvalid?: boolean
  maxNodesInvalid?: boolean
  scramblePlaceholder: string
  onNotationChange: (notation: string) => void
  onMaxMovesChange: (maxMoves: string) => void
  onMaxNodesMillionChange: (maxNodesMillion: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function SolveForm({
  notation,
  maxMovesInput,
  maxNodesMillionInput,
  buttonLoading,
  disabled,
  maxMovesInvalid = false,
  maxNodesInvalid = false,
  scramblePlaceholder,
  onNotationChange,
  onMaxMovesChange,
  onMaxNodesMillionChange,
  onSubmit,
}: SolveFormProps) {
  return (
    <form
      className="solve-form grid w-full max-w-4xl gap-3"
      data-testid="solve-form"
      onSubmit={onSubmit}
    >
      <div data-testid="scramble-row">
        <Field className="field-primary" label="Scramble">
          <TextInput
            autoComplete="off"
            className="primary-input font-mono tracking-[0.08em]"
            placeholder={scramblePlaceholder}
            spellCheck={false}
            value={notation}
            onChange={(event) => onNotationChange(event.target.value)}
          />
        </Field>
      </div>
      <div
        className="grid gap-3 sm:grid-cols-[minmax(0,10rem)_minmax(0,12rem)_auto] sm:items-end"
        data-testid="limits-row"
      >
        <Field className="field-depth" label="Max moves">
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
        <Field className="field-nodes" label="Max nodes (M)">
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
          aria-label={buttonLoading ? 'Loading' : undefined}
          className="w-full sm:w-auto"
          type="submit"
          disabled={disabled}
        >
          {buttonLoading ? <LoadingIndicator decorative className="size-4" /> : 'Solve'}
        </Button>
      </div>
    </form>
  )
}
