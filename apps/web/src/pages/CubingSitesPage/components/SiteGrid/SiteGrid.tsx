import type { CubingSite } from '../../sites'
import { SiteCard } from '../SiteCard'

type SiteGridProps = {
  sites: readonly CubingSite[]
}

export function SiteGrid({ sites }: SiteGridProps) {
  return (
    <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'>
      {sites.map((site) => (
        <SiteCard key={site.id} site={site} />
      ))}
    </div>
  )
}
