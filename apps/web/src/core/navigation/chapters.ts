import type { AppRouteKind } from '@src/seo/routes'
import { stripLocalePath } from './stripLocalePath'

export type ChapterAccent = 'blue' | 'green' | 'orange' | 'red' | 'yellow'

export type RouteChapter = {
  accent: ChapterAccent
  code: string
  labelKey: string
  number: string
}

export const chapterAccents: Record<
  ChapterAccent,
  { bg: string; border: string; text: string }
> = {
  blue: { bg: 'bg-cube-blue', border: 'border-cube-blue', text: 'text-cube-white' },
  green: { bg: 'bg-cube-green', border: 'border-cube-green', text: 'text-cube-white' },
  orange: { bg: 'bg-cube-orange', border: 'border-cube-orange', text: 'text-foreground' },
  red: { bg: 'bg-cube-red', border: 'border-cube-red', text: 'text-cube-white' },
  yellow: { bg: 'bg-cube-yellow', border: 'border-cube-yellow', text: 'text-foreground' },
}

export const routeChapters: Record<AppRouteKind, RouteChapter> = {
  solve: { accent: 'blue', code: 'SOLVE', labelKey: 'navigation.solve', number: '01' },
  timer: { accent: 'yellow', code: 'TIME', labelKey: 'navigation.timer', number: '02' },
  'algorithms-index': {
    accent: 'orange',
    code: 'ALGS',
    labelKey: 'navigation.algorithms',
    number: '03',
  },
  'algorithms-puzzle': {
    accent: 'orange',
    code: 'ALGS',
    labelKey: 'navigation.algorithms',
    number: '03',
  },
  'algorithms-set': {
    accent: 'orange',
    code: 'ALGS',
    labelKey: 'navigation.algorithms',
    number: '03',
  },
  notation: { accent: 'green', code: 'NOTE', labelKey: 'navigation.notations', number: '04' },
  records: { accent: 'red', code: 'RECS', labelKey: 'navigation.worldRecords', number: '05' },
  channels: { accent: 'blue', code: 'CHAN', labelKey: 'navigation.channels', number: '06' },
  sites: { accent: 'orange', code: 'SITE', labelKey: 'navigation.sites', number: '07' },
  stores: { accent: 'green', code: 'STOR', labelKey: 'navigation.stores', number: '08' },
}

const chapterCodes: Record<string, RouteChapter> = {
  '/solve': routeChapters.solve,
  '/timer': routeChapters.timer,
  '/notations': routeChapters.notation,
  '/records': routeChapters.records,
  '/channels': routeChapters.channels,
  '/sites': routeChapters.sites,
  '/stores': routeChapters.stores,
  '/algorithms': routeChapters['algorithms-index'],
}

export function chapterFromPathname(pathname: string): RouteChapter {
  const pagePath = stripLocalePath(pathname)

  if (pagePath.startsWith('/algorithms/')) {
    return routeChapters['algorithms-puzzle']
  }

  for (const [path, chapter] of Object.entries(chapterCodes)) {
    if (pagePath === path || pagePath.startsWith(`${path}/`)) {
      return chapter
    }
  }

  return routeChapters.solve
}

export function chapterFromNavPath(path: string): RouteChapter {
  return chapterFromPathname(path)
}
