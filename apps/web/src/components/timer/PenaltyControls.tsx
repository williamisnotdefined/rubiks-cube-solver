import cls from 'classnames'
import { useTranslation } from 'react-i18next'
import { Button } from '@components/Button'
import type { TimerPenalty } from '@core/timer/penalties'

type PenaltyControlsProps = {
  compact?: boolean
  disabled?: boolean
  penalty: TimerPenalty
  onPenaltyChange: (penalty: TimerPenalty) => void
}

export function PenaltyControls({ compact = false, disabled = false, penalty, onPenaltyChange }: PenaltyControlsProps) {
  const { t } = useTranslation()

  return (
    <div
      className={cls('grid gap-2', {
        'grid-cols-3 gap-1': compact,
        'sm:grid-cols-3': !compact,
      })}
      aria-label={t('timer.penalty.label')}
    >
      <PenaltyButton
        active={penalty === 'ok'}
        compact={compact}
        disabled={disabled}
        label={t('timer.penalty.ok')}
        onClick={() => onPenaltyChange('ok')}
      />
      <PenaltyButton
        active={penalty === 'plus2'}
        compact={compact}
        disabled={disabled}
        label={t('timer.penalty.plus2')}
        onClick={() => onPenaltyChange('plus2')}
      />
      <PenaltyButton
        active={penalty === 'dnf'}
        compact={compact}
        disabled={disabled}
        label={t('timer.penalty.dnf')}
        onClick={() => onPenaltyChange('dnf')}
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

function PenaltyButton({ active, compact, disabled, label, onClick }: PenaltyButtonProps) {
  return (
    <Button
      className={cls('w-full', {
        '!min-h-9 px-3 py-2 text-xs': compact,
        'border-app-text bg-app-text text-app-inverse': active,
      })}
      disabled={disabled}
      type="button"
      variant={active ? 'primary' : 'secondary'}
      onClick={onClick}
    >
      {label}
    </Button>
  )
}
