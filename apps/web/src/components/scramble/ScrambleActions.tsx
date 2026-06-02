import { useTranslation } from 'react-i18next'
import { Button } from '@components/Button'

type ScrambleActionsProps = {
  copied: boolean
  onCopy: () => void
  onNext: () => void
}

export function ScrambleActions({ copied, onCopy, onNext }: ScrambleActionsProps) {
  const { t } = useTranslation()

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Button type="button" variant="secondary" onClick={onNext}>
        {t('timer.scramble.next')}
      </Button>
      <Button type="button" variant="secondary" onClick={onCopy}>
        {copied ? t('timer.scramble.copied') : t('timer.scramble.copy')}
      </Button>
    </div>
  )
}
