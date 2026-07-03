import type { PageNavRoute } from '@components/layout/PageNav'

export function activeRouteFromPath(pagePath: string): PageNavRoute {
  if (pagePath === '/channels') {
    return 'channels'
  }

  if (pagePath === '/sites') {
    return 'sites'
  }

  if (pagePath.startsWith('/api/wca-data')) {
    return 'api'
  }

  if (pagePath.startsWith('/records')) {
    return 'records'
  }

  if (pagePath.startsWith('/notations')) {
    return 'notations'
  }

  if (pagePath.startsWith('/algoritmos')) {
    return 'algorithms'
  }

  if (pagePath === '/timer') {
    return 'timer'
  }

  return 'solve'
}
