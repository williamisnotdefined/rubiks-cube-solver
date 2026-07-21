import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@components/Select'
import { scrambleEvents } from '@core/scramble/catalog'
import { clearTimerPageFocus } from '../../clearTimerPageFocus'
import { useTimerSettingsStore } from '../../timerSettingsStore'

type TimerEventSelectProps = {
  disabled?: boolean
}

export function TimerEventSelect({ disabled = false }: TimerEventSelectProps) {
  const { t } = useTranslation()
  const selectedEventId = useTimerSettingsStore((state) => state.selectedEventId)
  const setSelectedEventId = useTimerSettingsStore((state) => state.setSelectedEventId)
  const groups = Array.from(new Set(scrambleEvents.map((event) => event.group)))

  function handleEventChange(eventId: string) {
    if (disabled) {
      return
    }

    setSelectedEventId(eventId)
  }

  return (
    <Select value={selectedEventId} onValueChange={handleEventChange} disabled={disabled}>
      <SelectTrigger
        aria-label={t('timer.scramble.event')}
        className='h-8 max-w-44 px-2 py-1 text-sm text-muted-foreground'
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          clearTimerPageFocus()
        }}
      >
        {groups.map((group) => (
          <SelectGroup key={group}>
            <SelectLabel>{group}</SelectLabel>
            {scrambleEvents
              .filter((event) => event.group === group)
              .map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.label}
                </SelectItem>
              ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}
