import { useId, type FormEvent } from 'react'
import type { SolveResult } from '@api/solver/types'
import { Button } from '@components/Button'
import { Field } from '@components/Field'
import { SelectInput, TextInput } from '@components/FormControls'
import { Loader3x3 } from '@components/Loader3x3'
import { maxMovesLimit, maxNodesMillionOptions } from './constants'
import { solveErrorDetail, solveErrorMessage } from './solveMessages'
import { useSolveSettingsStore } from './solveSettingsStore'
import { validateMaxNodesMillionOption, validateWholeNumberLimit } from './validation'

type SolveFailure = Exclude<SolveResult, { ok: true }>

type ScanSolveSettingsModalProps = {
  result: SolveFailure
  solving: boolean
  onClose: () => void
  onRetry: () => void | Promise<void>
}

export function ScanSolveSettingsModal({
  result,
  solving,
  onClose,
  onRetry,
}: ScanSolveSettingsModalProps) {
  const titleId = useId()
  const maxMovesInput = useSolveSettingsStore((state) => state.maxMovesInput)
  const maxNodesMillionInput = useSolveSettingsStore((state) => state.maxNodesMillionInput)
  const setMaxMovesInput = useSolveSettingsStore((state) => state.setMaxMovesInput)
  const setMaxNodesMillionInput = useSolveSettingsStore(
    (state) => state.setMaxNodesMillionInput,
  )
  const maxMovesValidation = validateWholeNumberLimit(
    maxMovesInput,
    'Max moves',
    maxMovesLimit,
  )
  const maxNodesValidation = validateMaxNodesMillionOption(maxNodesMillionInput)
  const validationMessage = maxMovesValidation ?? maxNodesValidation
  const disabled = solving || validationMessage !== undefined
  const detail = solveErrorDetail(result)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (disabled) {
      return
    }

    void onRetry()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-3 py-6 sm:px-6">
      <button
        aria-label="Dismiss solve settings"
        className="absolute inset-0 bg-[#070707]/80"
        type="button"
        onClick={onClose}
      />
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="relative grid w-full max-w-lg gap-5 border border-[#3a3a3a] bg-[#101010] p-4 text-left text-[#f7f7f7] shadow-2xl sm:p-6"
        role="dialog"
      >
        <div className="grid gap-2">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#a8a8a8]">
            Scan solve needs more budget
          </p>
          <h2 className="text-lg font-extrabold uppercase tracking-[0.16em]" id={titleId}>
            Adjust solve limits
          </h2>
          <p className="text-sm font-semibold leading-relaxed text-[#a8a8a8]">
            {solveErrorMessage(result)}. Increase the limits and retry without scanning the cube again.
          </p>
          {detail === undefined ? null : (
            <p className="text-sm font-semibold leading-relaxed text-[#a8a8a8]">{detail}</p>
          )}
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Max moves">
              <TextInput
                aria-invalid={maxMovesValidation !== undefined || undefined}
                inputMode="numeric"
                max={maxMovesLimit}
                min="0"
                step="1"
                type="number"
                value={maxMovesInput}
                onChange={(event) => setMaxMovesInput(event.target.value)}
              />
            </Field>
            <Field label="Max nodes (M)">
              <SelectInput
                aria-invalid={maxNodesValidation !== undefined || undefined}
                value={maxNodesMillionInput}
                onChange={(event) => setMaxNodesMillionInput(event.target.value)}
              >
                {maxNodesMillionOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>

          <p className="min-h-5 text-sm font-semibold text-[#a8a8a8]" aria-live="polite">
            {validationMessage ?? 'These values also update the solve controls on the page.'}
          </p>

          <div className="flex flex-wrap justify-end gap-2">
            <Button className="min-h-10 px-4 py-2" type="button" variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button aria-label={solving ? 'Loading' : undefined} className="min-h-10 px-4 py-2" type="submit" disabled={disabled}>
              {solving ? <Loader3x3 decorative className="size-8" registerDelayMs={150} /> : 'Apply and retry'}
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}
