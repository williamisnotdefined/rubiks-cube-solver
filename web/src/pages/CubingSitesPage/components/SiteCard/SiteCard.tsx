import type { SyntheticEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { CubingSite } from '../../sites'

type SiteCardProps = {
  site: CubingSite
}

export function SiteCard({ site }: SiteCardProps) {
  const { t } = useTranslation()

  return (
    <a
      aria-label={t('sites.openSite', { site: site.name })}
      className="group grid border border-app-border bg-app-surface text-app-text outline-none transition-colors hover:border-app-text hover:bg-app-surface-raised focus-visible:ring-2 focus-visible:ring-app-focus/50"
      href={site.url}
      rel="noreferrer"
      target="_blank"
    >
      <div className="flex items-start gap-3 border-b border-app-border p-3">
        <div className="grid size-14 shrink-0 place-items-center border border-app-border bg-app-control">
          <img
            alt={t('sites.imageAlt', { site: site.name })}
            className="size-10 object-contain"
            loading="lazy"
            src={site.imagePath}
            onError={handleImageError}
          />
        </div>
        <div className="grid min-w-0 gap-1">
          <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.18em] text-app-muted">
            {t(`sites.categories.${site.category}`)}
          </p>
          <h2 className="truncate text-base font-black uppercase tracking-[0.08em] text-app-text">
            {site.name}
          </h2>
        </div>
      </div>
      <div className="grid gap-2 p-3">
        <p className="truncate text-xs font-semibold text-app-muted">
          {site.host}
        </p>
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-app-muted group-hover:text-app-text">
          {t('sites.openWebsite')}
        </p>
      </div>
    </a>
  )
}

function handleImageError(event: SyntheticEvent<HTMLImageElement>) {
  event.currentTarget.hidden = true
}
