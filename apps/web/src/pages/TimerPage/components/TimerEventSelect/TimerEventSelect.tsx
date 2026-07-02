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
import { focusTimerDisplayElement } from '../../hooks/useTimerFocusMode'
import { useTimerSettingsStore } from '../../timerSettingsStore'

export function TimerEventSelect() {
  const { t } = useTranslation()
  const selectedEventId = useTimerSettingsStore((state) => state.selectedEventId)
  const setSelectedEventId = useTimerSettingsStore((state) => state.setSelectedEventId)
  const groups = Array.from(new Set(scrambleEvents.map((event) => event.group)))

  function handleEventChange(eventId: string) {
    setSelectedEventId(eventId)
    window.setTimeout(focusTimerDisplayElement, 0)
  }

  return (
    <Select
      value={selectedEventId}
      onValueChange={handleEventChange}
    >
      <SelectTrigger
        aria-label={t('timer.scramble.event')}
        className="h-8 max-w-44 px-2 py-1 text-sm text-muted-foreground"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          focusTimerDisplayElement()
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
