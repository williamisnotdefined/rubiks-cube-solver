import { maxNodesMillionOptions } from './constants'

export function validateWholeNumberLimit(
  input: string,
  label: string,
  limit: number,
): string | undefined {
  const trimmed = input.trim()
  const value = Number(trimmed)

  if (trimmed.length === 0) {
    return `${label} is required`
  }

  if (!Number.isInteger(value) || value < 0) {
    return `${label} must be a whole number`
  }

  if (value > limit) {
    return `${label} must be ${limit} or less`
  }

  return undefined
}

export function validateMaxNodesMillionOption(input: string): string | undefined {
  const trimmed = input.trim()
  const value = Number(trimmed)

  if (trimmed.length === 0) {
    return 'Max nodes (M) is required'
  }

  if (!Number.isInteger(value)) {
    return 'Max nodes (M) must be a whole number'
  }

  if (!maxNodesMillionOptions.some((option) => option === value)) {
    return `Max nodes (M) must be one of ${maxNodesMillionOptions.join(', ')}`
  }

  return undefined
}
