import type { SyntheticEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@src/lib/utils'
import type { CubingStore } from '../../stores'
import { CountryFlag } from '../CountryFlag'

type StoreCardProps = {
  store: CubingStore
}

export function StoreCard({ store }: StoreCardProps) {
  const { t } = useTranslation()
  const country = t(`stores.countries.${store.countryCode}`)

  return (
    <a
      aria-label={t('stores.openStore', { store: store.name })}
      className='group grid overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm outline-none transition-all hover:bg-accent hover:text-accent-foreground hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50'
      href={store.url}
      rel='noreferrer'
      target='_blank'
    >
      <div className='flex items-start gap-3 border-b p-4'>
        <div className='grid size-14 shrink-0 place-items-center rounded-lg border bg-background shadow-xs'>
          {store.imagePath === undefined ? (
            <CountryFlag countryCode={store.countryCode} className='h-7 w-10 shadow-xs' />
          ) : (
            <img
              alt={t('stores.imageAlt', { store: store.name })}
              className={cn('h-10 max-w-full w-auto object-contain', store.imageClassName)}
              loading='lazy'
              src={store.imagePath}
              onError={handleImageError}
            />
          )}
        </div>
        <div className='grid min-w-0 gap-1'>
          <div className='flex items-center gap-2 text-sm text-muted-foreground'>
            <CountryFlag countryCode={store.countryCode} className='h-3 w-5 shadow-xs' />
            <span>{country}</span>
          </div>
          <h2 className='truncate text-base font-semibold'>{store.name}</h2>
        </div>
      </div>
      <div className='grid gap-2 p-4'>
        <p className='truncate text-sm text-muted-foreground'>{store.host}</p>
        <p className='text-sm text-muted-foreground group-hover:text-accent-foreground'>
          {t('stores.openWebsite')}
        </p>
      </div>
    </a>
  )
}

function handleImageError(event: SyntheticEvent<HTMLImageElement>) {
  event.currentTarget.hidden = true
}
