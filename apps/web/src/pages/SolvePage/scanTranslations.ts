import type { TFunction } from 'i18next'
import type { ScanFaceSymbol } from '@api/solver/types'
import { scanColorCode } from './scanColorSymbols'
import type { ScanFaceDraftValidation } from './scanState'

export function scanColorLabel(t: TFunction, symbol: ScanFaceSymbol): string {
  return t(`scan.colors.${symbol}`)
}

export function scanColorInitial(t: TFunction, symbol: ScanFaceSymbol): string {
  void t
  return scanColorCode(symbol)
}

export function scanFaceLabel(t: TFunction, symbol: ScanFaceSymbol): string {
  return t(`scan.faces.${symbol}.label`)
}

export function scanFaceInstruction(t: TFunction, symbol: ScanFaceSymbol): string {
  return t(`scan.faces.${symbol}.instruction`)
}

export function scanFaceTopLabel(t: TFunction, symbol: ScanFaceSymbol): string {
  return t(`scan.faces.${symbol}.top`)
}

export function scanFaceDraftValidationMessage(
  t: TFunction,
  validation: ScanFaceDraftValidation | undefined,
): string | undefined {
  if (validation === undefined) {
    return undefined
  }

  if (validation.key === 'colorAppearsMoreThanNine') {
    return t('scan.validation.colorAppearsMoreThanNine', {
      color: scanColorLabel(t, validation.values.symbol),
    })
  }

  return t(`scan.validation.${validation.key}`)
}
