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
      className='group grid overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm outline-none transition-all hover:bg-accent hover:text-accent-foreground hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50'
      href={site.url}
      rel='noreferrer'
      target='_blank'
    >
      <div className='flex items-start gap-3 border-b p-4'>
        <div className='grid size-14 shrink-0 place-items-center rounded-lg border bg-background shadow-xs'>
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
          <h2 className='truncate text-base font-semibold'>{site.name}</h2>
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
