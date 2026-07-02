import cls from 'classnames'
import { useTranslation } from 'react-i18next'
import { Button } from '@components/Button'
import type { TimerPenalty } from '@core/timer/penalties'

type PenaltyControlsProps = {
  className?: string
  compact?: boolean
  disabled?: boolean
  penalty: TimerPenalty
  onPenaltyChange: (penalty: TimerPenalty) => void
}

export function PenaltyControls({
  className,
  compact = false,
  disabled = false,
  penalty,
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
        label={t('timer.penalty.plus2')}
        onClick={() => onPenaltyChange(nextTogglePenalty(penalty, 'plus2'))}
      />
      <PenaltyButton
        active={penalty === 'dnf'}
        compact={compact}
        disabled={disabled}
        label={t('timer.penalty.dnf')}
        onClick={() => onPenaltyChange(nextTogglePenalty(penalty, 'dnf'))}
      />
    </div>
  )
}

type PenaltyButtonProps = {
  active: boolean
  compact: boolean
  disabled: boolean
  label: string
  onClick: () => void
}

function PenaltyButton({
  active,
  compact,
  disabled,
  label,
  onClick,
}: PenaltyButtonProps) {
  return (
    <Button
      className={cls('w-full', {
        '!min-h-8 px-3 py-1 text-xs': compact,
        'bg-primary text-primary-foreground': active,
      })}
      aria-pressed={active}
      disabled={disabled}
      type="button"
      variant={active ? 'primary' : 'secondary'}
      onClick={onClick}
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
