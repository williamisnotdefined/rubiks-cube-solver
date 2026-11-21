import type { SyntheticEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@components/Badge'
import type { CubingSite } from '../../sites'

type SiteCardProps = {
  site: CubingSite
}

export function SiteCard({ site }: SiteCardProps) {
  const { t } = useTranslation()

  return (
    <a
      aria-label={t('sites.openSite', { site: site.name })}
      className='group grid overflow-hidden border-2 border-foreground bg-card text-card-foreground shadow-[4px_4px_0_var(--foreground)] outline-none transition-[transform,box-shadow,background-color] hover:-translate-y-0.5 hover:bg-cube-yellow hover:shadow-[6px_6px_0_var(--foreground)] focus-visible:ring-[3px] focus-visible:ring-ring/50'
      href={site.url}
      rel='noreferrer'
      target='_blank'
    >
      <div className='flex items-start gap-3 border-b-2 border-foreground p-4'>
        <div className='grid size-14 shrink-0 place-items-center border-2 border-foreground bg-background'>
          <img
            alt={t('sites.imageAlt', { site: site.name })}
            className='size-10 object-contain'
            loading='lazy'
            src={site.imagePath}
            onError={handleImageError}
          />
        </div>
        <div className='grid min-w-0 gap-1'>
          <Badge className='w-fit' variant='secondary'>
            {t(`sites.categories.${site.category}`)}
          </Badge>
          <h2 className='truncate font-display text-lg font-extrabold uppercase tracking-tight'>{site.name}</h2>
        </div>
      </div>
      <div className='grid gap-2 p-4'>
        <p className='truncate text-sm text-muted-foreground'>{site.host}</p>
        <p className='text-sm text-muted-foreground group-hover:text-accent-foreground'>
          {t('sites.openWebsite')}
        </p>
      </div>
    </a>
  )
}

function handleImageError(event: SyntheticEvent<HTMLImageElement>) {
  event.currentTarget.hidden = true
}
