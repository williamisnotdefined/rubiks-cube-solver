import { useTranslation } from 'react-i18next'
import { Field } from '@components/Field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@components/Select'
import type { ScrambleEvent } from '@core/scramble/types'

type ScrambleSelectorProps = {
  events: readonly ScrambleEvent[]
  selectedEventId: string
  onEventChange: (eventId: string) => void
}

export function ScrambleSelector({ events, selectedEventId, onEventChange }: ScrambleSelectorProps) {
  const { t } = useTranslation()
  const groups = Array.from(new Set(events.map((event) => event.group)))

  return (
    <Field label={t('timer.scramble.event')}>
      <Select
        value={selectedEventId}
        onValueChange={onEventChange}
      >
        <SelectTrigger aria-label={t('timer.scramble.event')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {groups.map((group) => (
            <SelectGroup key={group}>
              <SelectLabel>{group}</SelectLabel>
              {events
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
    </Field>
  )
}
