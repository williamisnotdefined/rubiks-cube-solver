import { ChevronRight } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { cn } from '@src/lib/utils'
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
      {links.map((link, index) => (
        <Link
          key={link.path}
          className='group flex items-center justify-between gap-3 border-2 border-foreground bg-card px-4 py-5 font-display text-xl font-extrabold uppercase tracking-tight text-card-foreground shadow-[4px_4px_0_var(--foreground)] outline-none transition-[transform,box-shadow,background-color] hover:-translate-y-0.5 hover:bg-cube-yellow hover:shadow-[6px_6px_0_var(--foreground)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none focus-visible:ring-[3px] focus-visible:ring-ring/50'
          to={localizedPath(link.path, locale)}
        >
          <span aria-hidden='true' className={cn('size-3 shrink-0', cubeSwatches[index % cubeSwatches.length])} />
          <span aria-hidden='true' className='label-mono opacity-40'>
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className='flex-1'>{link.title}</span>
          <ChevronRight
            aria-hidden='true'
            className='size-5 shrink-0 transition-transform group-hover:translate-x-1'
          />
        </Link>
      ))}
    </nav>
  )
}

const cubeSwatches = [
  'bg-cube-blue',
  'bg-cube-yellow',
  'bg-cube-red',
  'bg-cube-green',
  'bg-cube-orange',
  'bg-cube-white',
]
