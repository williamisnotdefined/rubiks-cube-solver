import { ApiResponseValidationError } from '@api/client'
import type {
  ApiSolveResponse,
  HealthResponse,
  PuzzleDefinition,
  PuzzleStrategyOption,
  SolverStrategyOption,
} from './types'

const puzzleStatuses = ['stable', 'experimental', 'planned', 'disabled'] as const
const inputKinds = ['notation', 'facelets3x3', 'scan2x2', 'scan3x3'] as const
const visualizationKinds = ['cube3-facelets-v1', 'cube2-facelets-v1', 'none'] as const
const generatedTableStatuses = [
  'not_required',
  'not_applicable',
  'available',
  'unavailable',
  'corrupt_or_incompatible',
] as const

export function parseHealthResponse(value: unknown): HealthResponse {
  if (
    !isRecord(value) ||
    typeof value.ok !== 'boolean' ||
    typeof value.generatedTwoPhaseReady !== 'boolean' ||
    !isOptionalBoolean(value.visionOk) ||
    !isOptionalBoolean(value.visionTileDetectorAvailable) ||
    !isOptionalString(value.visionTileDetectorReason)
  ) {
    throw new ApiResponseValidationError('health')
  }

  return value as HealthResponse
}

export function parsePuzzleDefinitions(value: unknown): PuzzleDefinition[] {
  if (!Array.isArray(value) || !value.every(isPuzzleDefinition)) {
    throw new ApiResponseValidationError('puzzles')
  }

  return value
}

export function parseSolverStrategies(value: unknown): SolverStrategyOption[] {
  if (!Array.isArray(value) || !value.every(isSolverStrategy)) {
    throw new ApiResponseValidationError('strategies')
  }

  return value
}

export function parsePuzzleStrategies(value: unknown): PuzzleStrategyOption[] {
  if (!Array.isArray(value) || !value.every(isPuzzleStrategy)) {
    throw new ApiResponseValidationError('puzzle strategies')
  }

  return value
}

export function parseApiSolveResponse(value: unknown): ApiSolveResponse {
  if (!isApiSolveResponse(value)) {
    throw new ApiResponseValidationError('solve')
  }

  return value
}

export function isApiSolveResponse(value: unknown): value is ApiSolveResponse {
  if (
    !isRecord(value) ||
    typeof value.ok !== 'boolean' ||
    typeof value.status !== 'string' ||
    (value.ok && value.status !== 'success') ||
    typeof value.strategyId !== 'string' ||
    typeof value.strategyLabel !== 'string' ||
    typeof value.solverMode !== 'string' ||
    !isOneOf(value.generatedTableStatus, generatedTableStatuses) ||
    !isFiniteNumber(value.maxDepth) ||
    !isOptionalNullableFiniteNumber(value.maxNodes) ||
    !Array.isArray(value.moves) ||
    !value.moves.every((move) => typeof move === 'string') ||
    !isOptionalNullableFiniteNumber(value.length) ||
    !isOptionalNullableFiniteNumber(value.exploredNodes) ||
    !isOptionalNullableFiniteNumber(value.elapsedMs) ||
    !isOptionalNullableBoolean(value.replayVerified) ||
    !isOptionalString(value.puzzleId) ||
    !isOptionalString(value.puzzleSlug) ||
    (value.metric !== undefined && value.metric !== 'htm') ||
    !isOptionalVisualState(value.visualState) ||
    !isOptionalNullableString(value.errorKind) ||
    !isOptionalNullableString(value.message)
  ) {
    return false
  }

  return true
}

function isPuzzleDefinition(value: unknown): value is PuzzleDefinition {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.slug === 'string' &&
    typeof value.label === 'string' &&
    typeof value.family === 'string' &&
    isOneOf(value.status, puzzleStatuses) &&
    value.defaultMetric === 'htm' &&
    isArrayOf(value.supportedInputs, inputKinds) &&
    isArrayOf(value.supportedVisualizations, visualizationKinds) &&
    Array.isArray(value.strategyIds) &&
    value.strategyIds.every((id) => typeof id === 'string') &&
    typeof value.scannerSupported === 'boolean'
  )
}

function isSolverStrategy(value: unknown): value is SolverStrategyOption {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.label === 'string' &&
    typeof value.solverMode === 'string' &&
    typeof value.statusText === 'string'
  )
}

function isPuzzleStrategy(value: unknown): value is PuzzleStrategyOption {
  return (
    isRecord(value) &&
    typeof value.puzzleId === 'string' &&
    value.defaultMetric === 'htm' &&
    isArrayOf(value.supportedMetrics, ['htm'] as const) &&
    isArrayOf(value.supportedInputs, inputKinds) &&
    isSolverStrategy(value)
  )
}

function isOptionalVisualState(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    typeof value === 'string' ||
    (isRecord(value) && isOneOf(value.kind, visualizationKinds) && typeof value.value === 'string')
  )
}

function isOptionalBoolean(value: unknown): boolean {
  return value === undefined || typeof value === 'boolean'
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string'
}

function isOptionalNullableFiniteNumber(value: unknown): boolean {
  return value === undefined || value === null || isFiniteNumber(value)
}

function isOptionalNullableBoolean(value: unknown): boolean {
  return value === undefined || value === null || typeof value === 'boolean'
}

function isOptionalNullableString(value: unknown): boolean {
  return value === undefined || value === null || typeof value === 'string'
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isArrayOf<TValue extends string>(
  value: unknown,
  allowed: readonly TValue[],
): value is TValue[] {
  return Array.isArray(value) && value.every((item) => isOneOf(item, allowed))
}

function isOneOf<TValue extends string>(
  value: unknown,
  allowed: readonly TValue[],
): value is TValue {
  return typeof value === 'string' && allowed.includes(value as TValue)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
