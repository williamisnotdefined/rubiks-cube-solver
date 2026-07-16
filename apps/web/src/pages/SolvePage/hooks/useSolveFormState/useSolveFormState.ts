import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  defaultNotation,
  maxMovesLimitForPuzzle,
  nodesPerMillion,
  scramblePlaceholder,
} from '../../solve/constants'
import { useSolveSettingsStore } from '../../solve/solveSettingsStore'
import {
  validateMaxNodesMillionOption,
  validateWholeNumberLimit,
  validationErrorMessage,
} from '../../solve/validation'
import { defaultPuzzleSlug } from '../useSolvePuzzleMetadata'

export function useSolveFormState() {
  const { t } = useTranslation()
  const [notation, setNotation] = useState(defaultNotation)
  const [selectedPuzzleSlug, setSelectedPuzzleSlug] = useState(defaultPuzzleSlug)
  const maxMovesInput = useSolveSettingsStore((state) => state.maxMovesInput)
  const maxNodesMillionInput = useSolveSettingsStore((state) => state.maxNodesMillionInput)
  const setMaxMovesInput = useSolveSettingsStore((state) => state.setMaxMovesInput)
  const setMaxNodesMillionInput = useSolveSettingsStore((state) => state.setMaxNodesMillionInput)
  const maxMoves = Number(maxMovesInput)
  const maxNodes = Number(maxNodesMillionInput) * nodesPerMillion
  const maxMovesLimit = maxMovesLimitForPuzzle(selectedPuzzleSlug)
  const maxMovesValidation = validateWholeNumberLimit(
    maxMovesInput,
    t('solve.form.maxMoves'),
    maxMovesLimit,
  )
  const maxNodesValidation = validateMaxNodesMillionOption(
    maxNodesMillionInput,
    t('solve.form.maxNodesMillion'),
  )
  const localValidationMessage = validationErrorMessage(t, maxMovesValidation ?? maxNodesValidation)
  const activeScramblePlaceholder =
    selectedPuzzleSlug === 'cube-2x2x2' ? 'R U F' : scramblePlaceholder

  function updateSelectedPuzzleSlug(nextPuzzleSlug: string) {
    setSelectedPuzzleSlug(nextPuzzleSlug)
    const nextMaxMovesLimit = maxMovesLimitForPuzzle(nextPuzzleSlug)
    if (Number(maxMovesInput) > nextMaxMovesLimit) {
      setMaxMovesInput(String(nextMaxMovesLimit))
    }
  }

  return {
    activeScramblePlaceholder,
    localValidationMessage,
    maxMoves,
    maxMovesInput,
    maxMovesInvalid: maxMovesValidation !== undefined,
    maxMovesLimit,
    maxNodes,
    maxNodesMillionInput,
    maxNodesMillionInvalid: maxNodesValidation !== undefined,
    notation,
    selectedPuzzleSlug,
    setMaxMovesInput,
    setMaxNodesMillionInput,
    setNotation,
    updateSelectedPuzzleSlug,
  }
}
