import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { MemoryRouter, useNavigate } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { analyticsConsentStorageKey } from '../analytics'
import { AnalyticsConsent } from '../AnalyticsConsent'

describe('AnalyticsConsent', () => {
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

  it('shows a consent choice and loads GTM only after accepting', async () => {
    render(
      <MemoryRouter initialEntries={['/solve/']}>
        <AnalyticsConsentHarness />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Analytics preferences' })).toBeInTheDocument()
    expect(document.querySelector('[data-speedcube-gtm="true"]')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Accept analytics' }))

    await waitFor(() => {
      expect(window.localStorage.getItem(analyticsConsentStorageKey)).toBe('granted')
    })
    expect(document.querySelectorAll('[data-speedcube-gtm="true"]')).toHaveLength(1)
    expect(window.dataLayer).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ analytics_event_name: 'page_view', event: 'analytics_event' }),
      ]),
    )
  })

  it('lets a visitor withdraw consent from the preferences control', async () => {
    window.localStorage.setItem(analyticsConsentStorageKey, 'granted')
    render(
      <MemoryRouter initialEntries={['/solve/']}>
        <AnalyticsConsentHarness withPreferencesTrigger />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.queryByRole('region', { name: 'Analytics preferences' })).not.toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Open cookie preferences' }))
    expect(screen.getByRole('dialog')).toHaveClass('left-1/2', 'top-1/2', 'bg-background')
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }))

    await waitFor(() => {
      expect(window.localStorage.getItem(analyticsConsentStorageKey)).toBe('denied')
    })
  })

  it('does not count query-only navigation as another page view', async () => {
    window.localStorage.setItem(analyticsConsentStorageKey, 'granted')
    render(
      <MemoryRouter initialEntries={['/solve/']}>
        <QueryNavigation />
      </MemoryRouter>,
    )

    await waitFor(() => expect(pageViewCount()).toBe(1))
    fireEvent.click(screen.getByRole('button', { name: 'Add query string' }))

    expect(pageViewCount()).toBe(1)
  })
})

function QueryNavigation() {
  const navigate = useNavigate()

  return (
    <>
      <button type='button' onClick={() => navigate('/solve/?source=campaign')}>
        Add query string
      </button>
      <AnalyticsConsentHarness />
    </>
  )
}

function AnalyticsConsentHarness({ withPreferencesTrigger = false }: { withPreferencesTrigger?: boolean }) {
  const [preferencesOpen, setPreferencesOpen] = useState(false)

  return (
    <>
      {withPreferencesTrigger ? (
        <button type='button' onClick={() => setPreferencesOpen(true)}>
          Open cookie preferences
        </button>
      ) : null}
      <AnalyticsConsent
        preferencesOpen={preferencesOpen}
        onPreferencesOpenChange={setPreferencesOpen}
      />
    </>
  )
}

function pageViewCount(): number {
  return (
    window.dataLayer?.filter(
      (event) =>
        typeof event === 'object' &&
        event !== null &&
        'analytics_event_name' in event &&
        event.analytics_event_name === 'page_view',
    ).length ?? 0
  )
}
