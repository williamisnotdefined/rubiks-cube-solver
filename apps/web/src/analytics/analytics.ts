export type AnalyticsConsent = 'denied' | 'granted'

type DataLayerEvent = {
  event: 'analytics_event'
  analytics_event_name:
    | 'notation_visualizer_used'
    | 'page_view'
    | 'scan_opened'
    | 'solver_result'
    | 'timer_solve_recorded'
  guide_id?: string
  page_locale?: string
  page_location?: string
  page_path?: string
  page_title?: string
  puzzle_slug?: string
  solve_source?: 'notation' | 'scan'
  solve_status?: string
  timer_event_id?: string
  timer_penalty?: string
}

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...arguments_: unknown[]) => void
  }
}

export const analyticsConsentStorageKey = 'speedcube-analytics-consent'

const googleTagManagerContainerId = 'GTM-W92GNDGD'
const googleTagManagerScriptSelector = 'script[data-speedcube-gtm="true"]'

export function storedAnalyticsConsent(): AnalyticsConsent | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  try {
    const storedConsent = window.localStorage.getItem(analyticsConsentStorageKey)
    return storedConsent === 'granted' || storedConsent === 'denied' ? storedConsent : undefined
  } catch {
    return undefined
  }
}

export function saveAnalyticsConsent(consent: AnalyticsConsent): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(analyticsConsentStorageKey, consent)
  } catch {
    // Analytics remains opt-in when storage is unavailable.
  }

  if (consent === 'granted') {
    window.gtag?.('consent', 'update', { analytics_storage: 'granted' })
    loadGoogleTagManager()
    return
  }

  window.gtag?.('consent', 'update', { analytics_storage: 'denied' })
  removeGoogleAnalyticsCookies()
}

export function loadGoogleTagManager(): void {
  if (typeof window === 'undefined' || storedAnalyticsConsent() !== 'granted') {
    return
  }

  if (document.querySelector(googleTagManagerScriptSelector) !== null) {
    return
  }

  let dataLayer = window.dataLayer
  if (dataLayer === undefined) {
    dataLayer = []
    window.dataLayer = dataLayer
  }
  if (window.gtag === undefined) {
    window.gtag = (...arguments_: unknown[]) => {
      dataLayer.push(arguments_)
    }
  }
  window.gtag('consent', 'default', { analytics_storage: 'granted' })
  dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' })

  const script = document.createElement('script')
  script.async = true
  script.dataset.speedcubeGtm = 'true'
  script.src = `https://www.googletagmanager.com/gtm.js?id=${googleTagManagerContainerId}`
  document.head.append(script)
}

export function trackAnalyticsEvent(event: Omit<DataLayerEvent, 'event'>): void {
  if (typeof window === 'undefined' || storedAnalyticsConsent() !== 'granted') {
    return
  }

  window.dataLayer?.push({ event: 'analytics_event', ...event })
}

export function trackPageView({
  locale,
  path,
}: {
  locale: string
  path: string
}): void {
  if (typeof window === 'undefined') {
    return
  }

  const pagePath = path.split(/[?#]/, 1)[0] || '/'

  trackAnalyticsEvent({
    analytics_event_name: 'page_view',
    page_locale: locale,
    page_location: `${window.location.origin}${pagePath}`,
    page_path: pagePath,
    page_title: document.title,
  })
}

export function trackSolverResult({
  puzzleSlug,
  source,
  status,
}: {
  puzzleSlug: string
  source: 'notation' | 'scan'
  status: string
}): void {
  trackAnalyticsEvent({
    analytics_event_name: 'solver_result',
    puzzle_slug: puzzleSlug,
    solve_source: source,
    solve_status: status,
  })
}

export function trackScanOpened(puzzleSlug: string): void {
  trackAnalyticsEvent({
    analytics_event_name: 'scan_opened',
    puzzle_slug: puzzleSlug,
  })
}

export function trackTimerSolveRecorded({
  eventId,
  penalty,
}: {
  eventId: string
  penalty: string
}): void {
  trackAnalyticsEvent({
    analytics_event_name: 'timer_solve_recorded',
    timer_event_id: eventId,
    timer_penalty: penalty,
  })
}

export function trackNotationVisualizerUsed({
  guideId,
  puzzleSlug,
}: {
  guideId: string
  puzzleSlug: string
}): void {
  trackAnalyticsEvent({
    analytics_event_name: 'notation_visualizer_used',
    guide_id: guideId,
    puzzle_slug: puzzleSlug,
  })
}

function removeGoogleAnalyticsCookies(): void {
  const cookieNames = document.cookie
    .split(';')
    .map((cookie) => cookie.trim().split('=')[0])
    .filter((name) => /^_(?:ga|gat|gid)(?:_|$)/.test(name))

  for (const name of cookieNames) {
    expireCookie(`${name}=; Max-Age=0; Path=/; SameSite=Lax`)
    expireCookie(`${name}=; Max-Age=0; Domain=${window.location.hostname}; Path=/; SameSite=Lax`)
  }
}

function expireCookie(value: string): void {
  // Cookie Store is not available in every supported browser, so revocation must use document.cookie.
  // biome-ignore lint/suspicious/noDocumentCookie: Explicitly expiring first-party GA cookies.
  document.cookie = value
}
