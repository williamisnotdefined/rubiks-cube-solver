import { Link } from 'react-router'

type AlgorithmLink = {
  path: string
  title: string
}

type AlgorithmLinkListProps = {
  ariaLabel: string
  links: readonly AlgorithmLink[]
}

export function AlgorithmLinkList({ ariaLabel, links }: AlgorithmLinkListProps) {
  return (
    <nav className="grid gap-2" aria-label={ariaLabel}>
      {links.map((link) => (
        <Link
          key={link.path}
          className="border border-app-text bg-app-surface px-4 py-3 text-lg font-black uppercase tracking-[0.08em] text-app-text hover:bg-app-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-focus/50"
          to={link.path}
        >
          {link.title}
        </Link>
      ))}
    </nav>
  )
}
