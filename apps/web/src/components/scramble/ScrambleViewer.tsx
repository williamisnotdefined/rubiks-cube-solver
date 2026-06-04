import { useTranslation } from 'react-i18next'

type ScrambleViewerProps = {
  eventLabel: string
  scramble: string
}

export function ScrambleViewer({ eventLabel, scramble }: ScrambleViewerProps) {
  const { t } = useTranslation()

  return (
    <section className="grid gap-3 border border-app-border bg-app-surface p-4 text-center">
      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-app-muted">
        {t('timer.scramble.title')} / {eventLabel}
      </p>
      <p className="mx-auto max-w-3xl whitespace-pre-wrap font-mono text-xl font-black leading-relaxed tracking-[0.08em] text-app-text sm:text-2xl">
        {scramble}
      </p>
    </section>
  )
}
