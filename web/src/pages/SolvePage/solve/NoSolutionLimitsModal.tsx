import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@components/Button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@components/Dialog'
import { Field } from '@components/Field'
import { TextInput } from '@components/FormControls'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/Select'
import { formatNumber } from '@core/format/formatNumber'
import {
  maxMovesLimitForPuzzle,
  maxNodesMillionOptions,
  nodesPerMillion,
} from './constants'
import type { NoSolutionLimitFailureResult } from './noSolutionLimits'
import { solveErrorDetail, solveStrategyLabel } from './solveMessages'
import { useSolveSettingsStore } from './solveSettingsStore'
import {
  validateMaxNodesMillionOption,
  validateWholeNumberLimit,
  validationErrorMessage,
} from './validation'

export type NoSolutionRetryLimits = {
  maxDepth: number
  maxNodes: number
}

type NoSolutionLimitsModalProps = {
  puzzleSlug: string
  result: NoSolutionLimitFailureResult
  solving: boolean
  onClose: () => void
  onRetry: (limits: NoSolutionRetryLimits) => void | Promise<void>
}

export function NoSolutionLimitsModal({
  puzzleSlug,
  result,
  solving,
  onClose,
  onRetry,
}: NoSolutionLimitsModalProps) {
  const { t } = useTranslation()
  const maxMovesInput = useSolveSettingsStore((state) => state.maxMovesInput)
  const maxNodesMillionInput = useSolveSettingsStore((state) => state.maxNodesMillionInput)
  const setMaxMovesInput = useSolveSettingsStore((state) => state.setMaxMovesInput)
  const setMaxNodesMillionInput = useSolveSettingsStore(
    (state) => state.setMaxNodesMillionInput,
  )
  const maxMovesLimit = maxMovesLimitForPuzzle(puzzleSlug)
  const maxMovesValidation = validateWholeNumberLimit(
    maxMovesInput,
    t('solve.form.maxMoves'),
    maxMovesLimit,
  )
  const maxNodesValidation = validateMaxNodesMillionOption(
    maxNodesMillionInput,
    t('solve.form.maxNodesMillion'),
  )
  const localValidationMessage = validationErrorMessage(
    t,
    maxMovesValidation ?? maxNodesValidation,
  )
  const retryDisabled = solving || localValidationMessage !== undefined
  const detail = solveErrorDetail(result, t)
  const attemptedNodes = result.maxNodes === undefined
    ? t('solve.details.maxNodesUnlimited')
    : formatNumber(result.maxNodes)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (retryDisabled) {
      return
    }

    void onRetry({
      maxDepth: Number(maxMovesInput.trim()),
      maxNodes: Number(maxNodesMillionInput.trim()) * nodesPerMillion,
    })
  }

  return (
    <Dialog open onOpenChange={(open) => {
      if (!open) {
        onClose()
      }
    }}>
      <DialogContent
        className="left-1/2 top-1/2 max-h-[calc(100vh-3rem)] w-[calc(100vw-1.5rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-auto border border-app-border bg-app-surface p-4 text-left text-app-text shadow-2xl sm:w-[calc(100vw-3rem)] sm:p-6"
        overlayClassName="bg-app-bg/85 backdrop-blur-sm"
        overlayLabel={t('solve.noSolution.dismiss')}
      >
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <DialogTitle asChild>
              <h2 className="text-lg font-extrabold uppercase tracking-[0.16em]">
                {t('solve.noSolution.title')}
              </h2>
            </DialogTitle>
            <DialogDescription asChild>
              <p className="text-sm font-semibold leading-relaxed text-app-muted">
                {t('solve.noSolution.description')}
              </p>
            </DialogDescription>
          </div>

          <div className="grid gap-2 border border-app-border bg-app-surface-raised p-3 text-sm">
            <p className="font-extrabold uppercase tracking-[0.16em] text-app-muted">
              {t('solve.noSolution.previousAttempt')}
            </p>
            <p className="font-semibold text-app-text">
              {t('solve.noSolution.attempted', {
                maxDepth: result.maxDepth,
                maxNodes: attemptedNodes,
                strategy: solveStrategyLabel(result.strategyId, result.strategyLabel, t),
              })}
            </p>
            {detail === undefined ? null : (
              <p className="font-semibold text-app-muted">{detail}</p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('solve.form.maxMoves')}>
              <TextInput
                aria-invalid={maxMovesValidation !== undefined || undefined}
                className="text-center"
                inputMode="numeric"
                max={maxMovesLimit}
                min="0"
                step="1"
                type="number"
                value={maxMovesInput}
                onChange={(event) => setMaxMovesInput(event.target.value)}
              />
            </Field>
            <Field label={t('solve.form.maxNodesMillion')}>
              <Select
                value={maxNodesMillionInput}
                onValueChange={setMaxNodesMillionInput}
              >
                <SelectTrigger
                  aria-invalid={maxNodesValidation !== undefined || undefined}
                  aria-label={t('solve.form.maxNodesMillion')}
                  className="text-center"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {maxNodesMillionOptions.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {localValidationMessage === undefined ? null : (
            <p className="text-sm font-semibold text-app-text" role="alert">
              {localValidationMessage}
            </p>
          )}

          <div className="grid gap-2 sm:grid-cols-[auto_auto] sm:justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t('common.close')}
            </Button>
            <Button type="submit" disabled={retryDisabled}>
              {solving ? t('common.loading') : t('solve.noSolution.retry')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
