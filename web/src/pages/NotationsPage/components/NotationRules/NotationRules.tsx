import { useTranslation } from 'react-i18next'
import type { NotationGuide } from '../../notationGuides'

type NotationRulesProps = {
  guide: NotationGuide
}

export function NotationRules({ guide }: NotationRulesProps) {
  const { t } = useTranslation()

  return (
    <section className="grid gap-3 border border-app-border bg-app-surface p-4">
      <h2 className="text-xl font-black uppercase tracking-[-0.03em] text-app-text sm:text-2xl">
        {t('notations.page.howToRead')}
      </h2>
      <ol className="grid gap-2 sm:grid-cols-2">
        {guide.sections.map((section, index) => (
          <li key={section.titleKey} className="grid gap-2 border border-app-border bg-app-control p-3">
            <span className="font-mono text-xs font-black uppercase tracking-[0.16em] text-app-muted">
              {String(index + 1).padStart(2, '0')}
            </span>
            <h3 className="text-sm font-black uppercase tracking-[0.08em] text-app-text">
              {t(section.titleKey)}
            </h3>
            <p className="text-sm font-semibold leading-6 text-app-muted">
              {t(section.bodyKey)}
            </p>
          </li>
        ))}
      </ol>
    </section>
  )
}
