import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@components/Button'
import { PageDescription } from '@components/layout/PageDescription'
import { PageHeader } from '@components/layout/PageHeader'
import { PageScaffold } from '@components/layout/PageScaffold'
import { PageTitle } from '@components/layout/PageTitle'
import { CountryFlag } from './components/CountryFlag'
import { StoreGrid } from './components/StoreGrid'
import { cubingStores, storeCountryCodes } from './stores'

export function StoresPage() {
  const { t } = useTranslation()
  const [countryFilter, setCountryFilter] = useState<(typeof storeCountryCodes)[number] | null>(
    null,
  )
  const stores = cubingStores.filter(
    (store) => countryFilter === null || store.countryCode === countryFilter,
  )

  function toggleCountryFilter(countryCode: (typeof storeCountryCodes)[number]) {
    setCountryFilter((currentFilter) => (currentFilter === countryCode ? null : countryCode))
  }

  return (
    <PageScaffold contentClassName='max-w-7xl gap-5'>
      <PageHeader>
        <PageTitle>{t('stores.title')}</PageTitle>
        <PageDescription>{t('stores.description', { count: cubingStores.length })}</PageDescription>
      </PageHeader>
      <fieldset aria-label={t('stores.filterCountries')} className='flex flex-wrap gap-2'>
        <Button
          aria-label={t('stores.showAllCountries')}
          aria-pressed={countryFilter === null}
          size='sm'
          type='button'
          variant={countryFilter === null ? 'primary' : 'outline'}
          onClick={() => setCountryFilter(null)}
        >
          {t('stores.allCountries')}
        </Button>
        {storeCountryCodes.map((countryCode) => {
          const country = t(`stores.countries.${countryCode}`)
          const isActive = countryFilter === countryCode

          return (
            <Button
              aria-label={t('stores.showCountry', { country })}
              aria-pressed={isActive}
              className='size-8 p-0 sm:size-9'
              key={countryCode}
              size='icon'
              type='button'
              variant={isActive ? 'primary' : 'outline'}
              onClick={() => toggleCountryFilter(countryCode)}
            >
              <CountryFlag countryCode={countryCode} className='h-4 w-6 shadow-xs' />
              <span className='sr-only'>{country}</span>
            </Button>
          )
        })}
      </fieldset>
      <StoreGrid stores={stores} />
    </PageScaffold>
  )
}
