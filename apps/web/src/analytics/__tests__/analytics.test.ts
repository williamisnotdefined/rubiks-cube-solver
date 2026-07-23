import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  analyticsConsentStorageKey,
  saveAnalyticsConsent,
  trackPageView,
  trackSolverResult,
} from '../analytics'

describe('analytics', () => {
  beforeEach(() => {
    document.head.querySelectorAll('script[data-speedcube-gtm="true"]').forEach((script) => {
      script.remove()
    })
    delete window.dataLayer
    delete window.gtag
  })

  afterEach(() => {
    document.head.querySelectorAll('script[data-speedcube-gtm="true"]').forEach((script) => {
      script.remove()
    })
    delete window.dataLayer
    delete window.gtag
  })

  it('does not create a data layer or load GTM before consent', () => {
    trackSolverResult({ puzzleSlug: '3x3', source: 'notation', status: 'success' })

    expect(window.dataLayer).toBeUndefined()
    expect(document.querySelector('[data-speedcube-gtm="true"]')).toBeNull()
  })

  it('loads the GTM container once and sends only approved event fields after consent', () => {
    saveAnalyticsConsent('granted')
    trackPageView({ locale: 'pt-BR', path: '/pt-BR/solve/?source=test#result' })
    trackSolverResult({ puzzleSlug: '3x3', source: 'notation', status: 'success' })
    saveAnalyticsConsent('granted')

    expect(window.localStorage.getItem(analyticsConsentStorageKey)).toBe('granted')
    expect(document.querySelectorAll('[data-speedcube-gtm="true"]')).toHaveLength(1)
    expect(window.dataLayer).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ event: 'gtm.js' }),
        {
          analytics_event_name: 'page_view',
          event: 'analytics_event',
          page_locale: 'pt-BR',
          page_location: `${window.location.origin}/pt-BR/solve/`,
          page_path: '/pt-BR/solve/',
          page_title: document.title,
        },
        {
          analytics_event_name: 'solver_result',
          event: 'analytics_event',
          puzzle_slug: '3x3',
          solve_source: 'notation',
          solve_status: 'success',
        },
      ]),
    )
  })

  it('stops future events when consent is revoked', () => {
    saveAnalyticsConsent('granted')
    // biome-ignore lint/suspicious/noDocumentCookie: Seed a first-party GA cookie for revocation coverage.
    document.cookie = '_ga=test; Path=/'
    saveAnalyticsConsent('denied')
    const eventCountAfterRevocation = window.dataLayer?.length ?? 0
    trackSolverResult({ puzzleSlug: '3x3', source: 'scan', status: 'success' })

    expect(window.localStorage.getItem(analyticsConsentStorageKey)).toBe('denied')
    expect(window.dataLayer).toHaveLength(eventCountAfterRevocation)
    expect(document.cookie).not.toContain('_ga=')
  })

  it('restores GTM consent when a visitor accepts analytics again', () => {
    saveAnalyticsConsent('granted')
    saveAnalyticsConsent('denied')
    saveAnalyticsConsent('granted')

    expect(window.dataLayer).toEqual(
      expect.arrayContaining([
        ['consent', 'update', { analytics_storage: 'denied' }],
        ['consent', 'update', { analytics_storage: 'granted' }],
      ]),
    )
  })
})
