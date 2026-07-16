import type { TFunction } from 'i18next'
import type { ScanFaceSymbol } from '@api/solver/types'
import { scanColorCode } from '../scanColorSymbols'
import { scan2StickersPerFace, type ScanFaceDraftValidation } from '../scanState'

export function scanColorLabel(t: TFunction, symbol: ScanFaceSymbol): string {
  return t(`scan.colors.${symbol}`)
}

export function scanColorInitial(t: TFunction, symbol: ScanFaceSymbol): string {
  void t
  return scanColorCode(symbol)
}

export function scanFaceLabel(
  t: TFunction,
  symbol: ScanFaceSymbol,
  stickersPerFace?: number,
): string {
  return t(`${scanFaceTranslationNamespace(stickersPerFace)}.${symbol}.label`)
}

export function scanFaceInstruction(
  t: TFunction,
  symbol: ScanFaceSymbol,
  stickersPerFace?: number,
): string {
  return t(`${scanFaceTranslationNamespace(stickersPerFace)}.${symbol}.instruction`)
}

export function scanFaceTopLabel(
  t: TFunction,
  symbol: ScanFaceSymbol,
  stickersPerFace?: number,
): string {
  return t(`${scanFaceTranslationNamespace(stickersPerFace)}.${symbol}.top`)
}

function scanFaceTranslationNamespace(stickersPerFace: number | undefined): string {
  return stickersPerFace === scan2StickersPerFace ? 'scan.faces2' : 'scan.faces'
}

export function scanFaceDraftValidationMessage(
  t: TFunction,
  validation: ScanFaceDraftValidation | undefined,
  stickersPerFace = 9,
): string | undefined {
  if (validation === undefined) {
    return undefined
  }

  if (validation.key === 'colorAppearsMoreThanCount') {
    return t('scan.validation.colorAppearsMoreThanNine', {
      color: scanColorLabel(t, validation.values.symbol),
    }).replaceAll('9', String(stickersPerFace))
  }

  if (validation.key === 'confirmAllColors') {
    return t('scan.validation.confirmAllNineColors').replaceAll('9', String(stickersPerFace))
  }

  return t(`scan.validation.${validation.key}`)
}

export function scanConfirmAllFacesMessage(t: TFunction, stickersPerFace: number): string {
  return t('scan.messages.confirmAllFaces').replaceAll('9', String(stickersPerFace))
}
