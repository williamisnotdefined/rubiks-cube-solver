import type { TFunction } from 'i18next'
import type { SolveResult } from '@api/solver/types'
import { formatNumber } from '@core/format/formatNumber'

type SolveFailure = Exclude<SolveResult, { ok: true }>

export function solveErrorMessage(result: SolveFailure, t: TFunction): string {
  return t(`solve.errors.status.${result.status}`, { defaultValue: result.message })
}

export function solveErrorDetail(result: SolveFailure, t: TFunction): string | undefined {
  if (result.status === 'invalid_input') {
    const scanOrientationHint = scanInvalidInputOrientationHint(result, t)
    const inputMessage = solveErrorKindMessage(result.errorKind, t) ?? result.message

    return [inputMessage, scanOrientationHint].filter(Boolean).join(' ')
  }

  if (result.status === 'invalid_notation') {
    return solveErrorKindMessage(result.errorKind, t) ?? result.message
  }

  if (result.status === 'not_found_within_limits') {
    return t('solve.errors.detail.not_found_within_limits', {
      maxDepth: result.maxDepth,
      nodes: formatNumber(result.exploredNodes ?? 0),
      strategy: solveStrategyLabel(result.strategyId, result.strategyLabel, t),
    })
  }

  if (result.status === 'invalid_limits') {
    return solveErrorKindMessage(result.errorKind, t) ?? result.message
  }

  if (result.status === 'request_too_large') {
    return solveErrorKindMessage(result.errorKind, t) ?? result.message
  }

  if (result.status === 'unverified_solution') {
    return solveErrorKindMessage(result.errorKind, t) ?? result.message
  }

  if (result.status === 'generated_tables_unavailable') {
    return t('solve.errors.detail.generated_tables_unavailable')
  }

  if (result.status === 'generated_tables_corrupt') {
    return t('solve.errors.detail.generated_tables_corrupt')
  }

  return solveErrorKindMessage(result.errorKind, t) ?? result.message
}

export function solveStrategyLabel(
  strategyId: string,
  fallbackLabel: string,
  t: TFunction,
): string {
  return t(`solve.strategies.${strategyId}`, { defaultValue: fallbackLabel })
}

function solveErrorKindMessage(errorKind: string | undefined, t: TFunction): string | undefined {
  if (errorKind === undefined) {
    return undefined
  }

  const message = t(`solve.errors.errorKind.${errorKind}`, { defaultValue: '' })

  return message.length > 0 ? message : undefined
}

function scanInvalidInputOrientationHint(result: SolveFailure, t: TFunction): string | undefined {
  if (
    result.errorKind !== 'unknown_corner_stickers' &&
    result.errorKind !== 'unknown_edge_stickers' &&
    result.errorKind !== 'invalid_corner_sticker_order' &&
    result.errorKind !== 'invalid_corner_orientation' &&
    result.errorKind !== 'invalid_edge_orientation' &&
    result.errorKind !== 'invalid_corner_orientation_sum' &&
    result.errorKind !== 'invalid_edge_orientation_sum' &&
    result.errorKind !== 'invalid_permutation_parity'
  ) {
    return undefined
  }

  return t('solve.errors.detail.invalid_input_orientation_hint')
}
