import { maxNodesMillionOptions } from '../constants'

export type SolveFormSubmit = {
  maxMoves: number
  maxNodesMillion: number
  notation: string
  puzzleSlug: string
}

export type LimitValidationError =
  | { key: 'required'; values: { label: string } }
  | { key: 'wholeNumber'; values: { label: string } }
  | { key: 'withinLimit'; values: { label: string; limit: number } }
  | { key: 'oneOf'; values: { label: string; options: string } }

export function validateWholeNumberLimit(
  input: string,
  label: string,
  limit: number,
): LimitValidationError | undefined {
  const trimmed = input.trim()
  const value = Number(trimmed)

  if (trimmed.length === 0) {
    return { key: 'required', values: { label } }
  }

  if (!Number.isInteger(value) || value < 0) {
    return { key: 'wholeNumber', values: { label } }
  }

  if (value > limit) {
    return { key: 'withinLimit', values: { label, limit } }
  }

  return undefined
}

export function validateMaxNodesMillionOption(
  input: string,
  label: string,
): LimitValidationError | undefined {
  const trimmed = input.trim()
  const value = Number(trimmed)

  if (trimmed.length === 0) {
    return { key: 'required', values: { label } }
  }

  if (!Number.isInteger(value)) {
    return { key: 'wholeNumber', values: { label } }
  }

  if (!maxNodesMillionOptions.some((option) => option === value)) {
    return {
      key: 'oneOf',
      values: { label, options: maxNodesMillionOptions.join(', ') },
    }
  }

  return undefined
}

export function validationErrorMessage(
  t: (key: string, values?: Record<string, string | number>) => string,
  error: LimitValidationError | undefined,
): string | undefined {
  if (error === undefined) {
    return undefined
  }

  return t(`solve.validation.${error.key}`, error.values)
}
