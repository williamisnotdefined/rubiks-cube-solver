import type { ComponentType } from 'react'
import type { AppRouteKind } from '@src/seo/routes'
import { stripLocalePath } from '@core/navigation/stripLocalePath'

export type RouteModule = { default: ComponentType }

export const routeLoaders: Record<AppRouteKind, () => Promise<RouteModule>> = {
  solve: () =>
    import('../pages/SolvePage/SolvePageRoute').then((module) => ({
      default: module.SolvePageRoute,
    })),
  timer: () =>
    import('../pages/TimerPage/TimerPage').then((module) => ({ default: module.TimerPage })),
  records: () =>
    import('../pages/WorldRecordsPage/WorldRecordsPageRoute').then((module) => ({
      default: module.WorldRecordsPageRoute,
    })),
  'algorithms-index': () =>
    import('../pages/AlgorithmsPage/AlgorithmsIndexPage').then((module) => ({
      default: module.AlgorithmsIndexPage,
    })),
  'algorithms-puzzle': () =>
    import('../pages/AlgorithmsPage/AlgorithmsPuzzlePage').then((module) => ({
      default: module.AlgorithmsPuzzlePage,
    })),
  'algorithms-set': () =>
    import('../pages/AlgorithmsPage/AlgorithmSetPage').then((module) => ({
      default: module.AlgorithmSetPage,
    })),
  home: () =>
    import('../pages/LandingPage/LandingPage').then((module) => ({
      default: module.LandingPage,
    })),
  channels: () =>
    import('../pages/CubingSitesPage/CubingSitesPage').then((module) => ({
      default: module.CubingSitesPage,
    })),
  stores: () =>
    import('../pages/StoresPage/StoresPage').then((module) => ({ default: module.StoresPage })),
  notation: () =>
    import('../pages/NotationsPage/NotationGuidePage').then((module) => ({
      default: module.NotationGuidePage,
    })),
  sites: () =>
    import('../pages/YouTubeChannelsPage/YouTubeChannelsPage').then((module) => ({
      default: module.YouTubeChannelsPage,
    })),
}

const preloadedKinds = new Set<AppRouteKind>()

export function preloadRoute(kind: AppRouteKind): void {
  if (preloadedKinds.has(kind)) {
    return
  }

  preloadedKinds.add(kind)
  void routeLoaders[kind]().catch(() => {
    preloadedKinds.delete(kind)
  })
}

export function preloadAllRoutes(): void {
  for (const kind of Object.keys(routeLoaders) as AppRouteKind[]) {
    preloadRoute(kind)
  }
}

export function routeKindsFromPathname(pathname: string): AppRouteKind[] {
  const pagePath = stripLocalePath(pathname)

  if (pagePath === '/') {
    return ['home']
  }

  if (pagePath.startsWith('/timer')) {
    return ['timer']
  }

  if (pagePath.startsWith('/records')) {
    return ['records']
  }

  if (pagePath.startsWith('/channels')) {
    return ['channels']
  }

  if (pagePath.startsWith('/sites')) {
    return ['sites']
  }

  if (pagePath.startsWith('/stores')) {
    return ['stores']
  }

  if (pagePath.startsWith('/notations')) {
    return ['notation']
  }

  if (pagePath.startsWith('/algorithms')) {
    const [, , puzzleId, methodId] = pagePath.split('/')
    if (methodId !== undefined && methodId.length > 0) {
      return ['algorithms-set']
    }
    if (puzzleId !== undefined && puzzleId.length > 0) {
      return ['algorithms-puzzle']
    }
    return ['algorithms-index']
  }

  return ['solve']
}
