import { z, type ZodIssue } from 'zod'
import { maxNodesMillionOptions } from '../constants'

export type SolveFormValues = {
  maxMovesInput: string
  maxNodesMillionInput: string
  notation: string
  selectedPuzzleSlug: string
}

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
  const result = createWholeNumberLimitSchema(limit).safeParse(input)
  return result.success ? undefined : limitIssueToError(result.error.issues[0], label, { limit })
}

export function validateMaxNodesMillionOption(
  input: string,
  label: string,
): LimitValidationError | undefined {
  const result = createMaxNodesMillionOptionSchema().safeParse(input)
  return result.success
    ? undefined
    : limitIssueToError(result.error.issues[0], label, {
        options: maxNodesMillionOptions.join(', '),
      })
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

export function createSolveFormSchema(maxMovesLimit: number) {
  return z.object({
    maxMovesInput: createWholeNumberLimitSchema(maxMovesLimit),
    maxNodesMillionInput: createMaxNodesMillionOptionSchema(),
    notation: z.string().trim().min(1, { message: 'required' }),
    selectedPuzzleSlug: z.string().trim().min(1, { message: 'required' }),
  })
}

export function solveFormValuesToSubmit(values: SolveFormValues): SolveFormSubmit {
  return {
    maxMoves: Number(values.maxMovesInput.trim()),
    maxNodesMillion: Number(values.maxNodesMillionInput.trim()),
    notation: values.notation.trim(),
    puzzleSlug: values.selectedPuzzleSlug,
  }
}

function createWholeNumberLimitSchema(limit: number) {
  return z.string().superRefine((input, ctx) => {
    const trimmed = input.trim()
    const value = Number(trimmed)

    if (trimmed.length === 0) {
      ctx.addIssue({ code: 'custom', message: 'required' })
      return
    }

    if (!Number.isInteger(value) || value < 0) {
      ctx.addIssue({ code: 'custom', message: 'wholeNumber' })
      return
    }

    if (value > limit) {
      ctx.addIssue({ code: 'custom', message: 'withinLimit' })
    }
  })
}

function createMaxNodesMillionOptionSchema() {
  return z.string().superRefine((input, ctx) => {
    const trimmed = input.trim()
    const value = Number(trimmed)

    if (trimmed.length === 0) {
      ctx.addIssue({ code: 'custom', message: 'required' })
      return
    }

    if (!Number.isInteger(value)) {
      ctx.addIssue({ code: 'custom', message: 'wholeNumber' })
      return
    }

    if (!maxNodesMillionOptions.some((option) => option === value)) {
      ctx.addIssue({ code: 'custom', message: 'oneOf' })
    }
  })
}

function limitIssueToError(
  issue: ZodIssue | undefined,
  label: string,
  context: { limit?: number; options?: string },
): LimitValidationError | undefined {
  if (issue === undefined) {
    return undefined
  }

  if (issue.message === 'required') {
    return { key: 'required', values: { label } }
  }

  if (issue.message === 'wholeNumber') {
    return { key: 'wholeNumber', values: { label } }
  }

  if (issue.message === 'withinLimit' && context.limit !== undefined) {
    return { key: 'withinLimit', values: { label, limit: context.limit } }
  }

  if (issue.message === 'oneOf' && context.options !== undefined) {
    return { key: 'oneOf', values: { label, options: context.options } }
  }

  return undefined
}
