import cls from 'classnames'
import type { MouseEvent, PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@components/Button'
import type { TimerPenalty } from '@core/timer/penalties'

type PenaltyControlsProps = {
  className?: string
  compact?: boolean
  disabled?: boolean
  focusable?: boolean
  penalty: TimerPenalty
  onActionComplete?: () => void
  onPenaltyChange: (penalty: TimerPenalty) => void
}

export function PenaltyControls({
  className,
  compact = false,
  disabled = false,
  focusable = true,
  penalty,
  onActionComplete,
  onPenaltyChange,
}: PenaltyControlsProps) {
  const { t } = useTranslation()

  return (
    <div
      className={cls(
        'grid grid-cols-2 gap-2',
        { 'gap-1': compact },
        className,
      )}
      aria-label={t('timer.penalty.label')}
    >
      <PenaltyButton
        active={penalty === 'plus2'}
        compact={compact}
        disabled={disabled}
        focusable={focusable}
        label={t('timer.penalty.plus2')}
        onActionComplete={onActionComplete}
        onClick={() => onPenaltyChange(nextTogglePenalty(penalty, 'plus2'))}
      />
      <PenaltyButton
        active={penalty === 'dnf'}
        compact={compact}
        disabled={disabled}
        focusable={focusable}
        label={t('timer.penalty.dnf')}
        onActionComplete={onActionComplete}
        onClick={() => onPenaltyChange(nextTogglePenalty(penalty, 'dnf'))}
      />
    </div>
  )
}

type PenaltyButtonProps = {
  active: boolean
  compact: boolean
  disabled: boolean
  focusable: boolean
  label: string
  onActionComplete?: () => void
  onClick: () => void
}

function PenaltyButton({
  active,
  compact,
  disabled,
  focusable,
  label,
  onActionComplete,
  onClick,
}: PenaltyButtonProps) {
  return (
    <Button
      className={cls('w-full', {
        '!min-h-8 px-3 py-1 text-xs': compact,
        'border-app-text bg-app-text text-app-inverse': active,
      })}
      aria-pressed={active}
      disabled={disabled}
      tabIndex={focusable ? undefined : -1}
      type="button"
      variant={active ? 'primary' : 'secondary'}
      onClick={(event) => handleButtonClick(event, onClick, onActionComplete)}
      onPointerDown={focusable ? undefined : preventPointerFocus}
      onPointerUp={focusable ? undefined : stopPointerPropagation}
    >
      {label}
    </Button>
  )
}

function nextTogglePenalty(
  currentPenalty: TimerPenalty,
  toggledPenalty: Exclude<TimerPenalty, 'ok'>,
): TimerPenalty {
  return currentPenalty === toggledPenalty ? 'ok' : toggledPenalty
}

function preventPointerFocus(event: PointerEvent<HTMLButtonElement>) {
  event.stopPropagation()
  event.preventDefault()
}

function stopPointerPropagation(event: PointerEvent<HTMLButtonElement>) {
  event.stopPropagation()
}

function handleButtonClick(
  event: MouseEvent<HTMLButtonElement>,
  onClick: () => void,
  onActionComplete: (() => void) | undefined,
) {
  event.stopPropagation()
  event.currentTarget.blur()
  onClick()
  onActionComplete?.()
}
