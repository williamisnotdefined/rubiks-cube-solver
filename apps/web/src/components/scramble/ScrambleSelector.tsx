import { useTranslation } from 'react-i18next'
import { Field } from '@components/Field'
import { SelectInput } from '@components/FormControls'
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
      <SelectInput
        value={selectedEventId}
        onChange={(event) => onEventChange(event.target.value)}
      >
        {groups.map((group) => (
          <optgroup key={group} label={group}>
            {events
              .filter((event) => event.group === group)
              .map((event) => (
                <option key={event.id} value={event.id}>
                  {event.label}
                </option>
              ))}
          </optgroup>
        ))}
      </SelectInput>
    </Field>
  )
}
