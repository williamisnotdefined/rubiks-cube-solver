import cls from 'classnames'
import { useTranslation } from 'react-i18next'
import { Button } from '@components/Button'
import type { TimerPenalty } from '@core/timer/penalties'

type PenaltyControlsProps = {
  disabled?: boolean
  penalty: TimerPenalty
  onPenaltyChange: (penalty: TimerPenalty) => void
}

export function PenaltyControls({ disabled = false, penalty, onPenaltyChange }: PenaltyControlsProps) {
  const { t } = useTranslation()

  return (
    <div className="grid gap-2 sm:grid-cols-3" aria-label={t('timer.penalty.label')}>
      <PenaltyButton
        active={penalty === 'ok'}
        disabled={disabled}
        label={t('timer.penalty.ok')}
        onClick={() => onPenaltyChange('ok')}
      />
      <PenaltyButton
        active={penalty === 'plus2'}
        disabled={disabled}
        label={t('timer.penalty.plus2')}
        onClick={() => onPenaltyChange('plus2')}
      />
      <PenaltyButton
        active={penalty === 'dnf'}
        disabled={disabled}
        label={t('timer.penalty.dnf')}
        onClick={() => onPenaltyChange('dnf')}
      />
    </div>
  )
}

type PenaltyButtonProps = {
  active: boolean
  disabled: boolean
  label: string
  onClick: () => void
}

function PenaltyButton({ active, disabled, label, onClick }: PenaltyButtonProps) {
  return (
    <Button
      className={cls('w-full', { 'border-[#f7f7f7] bg-[#f7f7f7] text-[#080808]': active })}
      disabled={disabled}
      type="button"
      variant={active ? 'primary' : 'secondary'}
      onClick={onClick}
    >
      {label}
    </Button>
  )
}
