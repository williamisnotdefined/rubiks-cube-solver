import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'
import { Button } from '@components/Button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@components/Dialog'
import { localeFromPathname } from '@src/seo/routes'
import {
  loadGoogleTagManager,
  saveAnalyticsConsent,
  storedAnalyticsConsent,
  trackPageView,
  type AnalyticsConsent as AnalyticsConsentValue,
} from './analytics'

type AnalyticsConsentProps = {
  onPreferencesOpenChange: (open: boolean) => void
  preferencesOpen: boolean
}

export function AnalyticsConsent({
  onPreferencesOpenChange,
  preferencesOpen,
}: AnalyticsConsentProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const [consent, setConsent] = useState<AnalyticsConsentValue | undefined>(undefined)
  const lastTrackedPathRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setConsent(storedAnalyticsConsent())
    })

    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    if (consent === 'granted') {
      loadGoogleTagManager()
    }
  }, [consent])

  useEffect(() => {
    const path = location.pathname
    if (consent !== 'granted' || lastTrackedPathRef.current === path) {
      return
    }

    trackPageView({ locale: localeFromPathname(location.pathname), path })
    lastTrackedPathRef.current = path
  }, [consent, location.pathname])

  function updateConsent(nextConsent: AnalyticsConsentValue) {
    saveAnalyticsConsent(nextConsent)
    setConsent(nextConsent)
    onPreferencesOpenChange(false)
  }

  if (consent === undefined) {
    return (
      <section
        aria-labelledby='analytics-consent-title'
        className='fixed inset-x-0 bottom-0 z-[70] border-t-2 border-foreground bg-card px-4 py-3 text-card-foreground'
      >
        <div className='mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between'>
          <div className='grid gap-1 md:flex md:items-baseline md:gap-3'>
            <h2
              className='font-display text-sm font-extrabold uppercase tracking-tight'
              id='analytics-consent-title'
            >
              {t('analytics.consent.title')}
            </h2>
            <p className='max-w-2xl text-xs leading-5 text-muted-foreground'>
              {t('analytics.consent.body')}
            </p>
          </div>
          <div className='flex shrink-0 flex-wrap gap-2'>
            <Button
              size='sm'
              type='button'
              variant='outline'
              onClick={() => updateConsent('denied')}
            >
              {t('analytics.consent.reject')}
            </Button>
            <Button size='sm' type='button' onClick={() => updateConsent('granted')}>
              {t('analytics.consent.accept')}
            </Button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <Dialog open={preferencesOpen} onOpenChange={onPreferencesOpenChange}>
      <DialogContent
        aria-describedby='analytics-preferences-description'
        className='left-1/2 top-1/2 grid w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 gap-4 bg-background p-6 shadow-lg'
      >
        <div className='grid gap-1.5'>
          <DialogTitle>{t('analytics.consent.preferencesTitle')}</DialogTitle>
          <DialogDescription id='analytics-preferences-description'>
            {t('analytics.consent.preferencesBody')}
          </DialogDescription>
        </div>
        <div className='flex flex-wrap justify-end gap-2'>
          <Button type='button' variant='outline' onClick={() => updateConsent('denied')}>
            {t('analytics.consent.reject')}
          </Button>
          <Button type='button' onClick={() => updateConsent('granted')}>
            {t('analytics.consent.accept')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
