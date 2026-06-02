import { useTranslation } from 'react-i18next'

type ScrambleViewerProps = {
  eventLabel: string
  scramble: string
}

export function ScrambleViewer({ eventLabel, scramble }: ScrambleViewerProps) {
  const { t } = useTranslation()

  return (
    <section className="grid gap-3 border border-[#2b2b2b] bg-[#101010] p-4 text-center">
      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#a8a8a8]">
        {t('timer.scramble.title')} / {eventLabel}
      </p>
      <p className="mx-auto max-w-3xl font-mono text-xl font-black leading-relaxed tracking-[0.08em] text-[#f7f7f7] sm:text-2xl">
        {scramble}
      </p>
    </section>
  )
}
