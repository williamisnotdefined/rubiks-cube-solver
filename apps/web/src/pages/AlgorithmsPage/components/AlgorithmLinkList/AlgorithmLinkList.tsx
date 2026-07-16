import { ChevronRight } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { localeFromPathname, localizedPath } from '@src/seo/routes'

type AlgorithmLink = {
  path: string
  title: string
}

type AlgorithmLinkListProps = {
  ariaLabel: string
  links: readonly AlgorithmLink[]
}

export function AlgorithmLinkList({ ariaLabel, links }: AlgorithmLinkListProps) {
  const location = useLocation()
  const locale = localeFromPathname(location.pathname)

  return (
    <nav className='grid gap-3 sm:grid-cols-2' aria-label={ariaLabel}>
      {links.map((link) => (
        <Link
          key={link.path}
          className='group flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-4 text-base font-semibold text-card-foreground shadow-sm outline-none transition-all hover:bg-accent hover:text-accent-foreground hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50'
          to={localizedPath(link.path, locale)}
        >
          {link.title}
          <ChevronRight
            aria-hidden='true'
            className='size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-accent-foreground'
          />
        </Link>
      ))}
    </nav>
  )
}
