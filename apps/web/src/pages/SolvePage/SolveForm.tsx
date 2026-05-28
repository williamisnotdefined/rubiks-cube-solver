import type { FormEvent } from 'react'
import { maxMovesLimit, maxNodesMillionOptions } from './constants'

type SolveFormProps = {
  notation: string
  maxMovesInput: string
  maxNodesMillionInput: string
  buttonLoading: boolean
  disabled: boolean
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
  onNotationChange,
  onMaxMovesChange,
  onMaxNodesMillionChange,
  onSubmit,
}: SolveFormProps) {
  return (
    <form className="solve-form" onSubmit={onSubmit}>
      <label className="field field-primary">
        <span className="field-label">Scramble</span>
        <input
          autoComplete="off"
          className="primary-input"
          spellCheck={false}
          value={notation}
          onChange={(event) => onNotationChange(event.target.value)}
        />
      </label>
      <label className="field field-depth">
        <span className="field-label">Max moves</span>
        <input
          className="depth-input"
          inputMode="numeric"
          max={maxMovesLimit}
          min="0"
          step="1"
          type="number"
          value={maxMovesInput}
          onChange={(event) => onMaxMovesChange(event.target.value)}
        />
      </label>
      <label className="field field-nodes">
        <span className="field-label">Max nodes (M)</span>
        <select
          className="nodes-input"
          value={maxNodesMillionInput}
          onChange={(event) => onMaxNodesMillionChange(event.target.value)}
        >
          {maxNodesMillionOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <button
        aria-label={buttonLoading ? 'Loading' : undefined}
        type="submit"
        disabled={disabled}
      >
        {buttonLoading ? <span className="button-loader" aria-hidden="true" /> : 'Solve'}
      </button>
    </form>
  )
}
