import cls from 'classnames'
import { Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@components/Button'
import type { TimerPenalty } from '@core/timer/penalties'

type PenaltyControlsProps = {
  className?: string
  compact?: boolean
  disabled?: boolean
  penalty: TimerPenalty
  onDeleteLatestSolve?: () => void
  onPenaltyChange: (penalty: TimerPenalty) => void
}

export function PenaltyControls({
  className,
  compact = false,
  disabled = false,
  penalty,
  onDeleteLatestSolve,
  onPenaltyChange,
}: PenaltyControlsProps) {
  const { t } = useTranslation()
  const showDeleteButton = onDeleteLatestSolve !== undefined

  return (
    <div
      className={cls(
        'grid gap-2',
        { 'gap-1': compact },
        showDeleteButton ? 'grid-cols-3' : 'grid-cols-2',
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
      {showDeleteButton ? (
        <Button
          aria-label={t('timer.solves.delete')}
          className={cls('w-full', {
            '!min-h-8 px-3 py-1 text-xs': compact,
          })}
          disabled={disabled}
          type='button'
          variant='secondary'
          onClick={(event) => {
            event.currentTarget.blur()
            onDeleteLatestSolve()
          }}
        >
          <Trash2 aria-hidden='true' className='size-4' strokeWidth={2.6} />
        </Button>
      ) : null}
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
        '!min-h-8 px-3 py-1 text-xs': compact,
        'bg-primary text-primary-foreground': active,
      })}
      aria-pressed={active}
      disabled={disabled}
      type='button'
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
