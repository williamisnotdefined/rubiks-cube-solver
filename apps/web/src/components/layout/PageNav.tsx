import cls from 'classnames'
import { useTranslation } from 'react-i18next'

export type PageNavRoute = 'solve' | 'timer'

type PageNavProps = {
  activeRoute: PageNavRoute
}

export function PageNav({ activeRoute }: PageNavProps) {
  const { t } = useTranslation()

  return (
    <nav
      className="border-b border-[#2b2b2b] bg-[#080808] px-3 py-3 sm:px-5"
      aria-label={t('navigation.primary')}
    >
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-2">
        <a
          className="text-sm font-black uppercase tracking-[0.2em] text-[#f7f7f7]"
          href="#/solve"
        >
          Rubik Solver
        </a>
        <div className="flex border border-[#2b2b2b]">
          <NavLink active={activeRoute === 'solve'} href="#/solve">
            {t('navigation.solve')}
          </NavLink>
          <NavLink active={activeRoute === 'timer'} href="#/timer">
            {t('navigation.timer')}
          </NavLink>
        </div>
      </div>
    </nav>
  )
}

type NavLinkProps = {
  active: boolean
  children: string
  href: string
}

function NavLink({ active, children, href }: NavLinkProps) {
  return (
    <a
      className={cls(
        'border-l border-[#2b2b2b] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] first:border-l-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f7f7f7]/50',
        {
          'bg-[#f7f7f7] text-[#080808]': active,
          'bg-[#101010] text-[#a8a8a8] hover:bg-[#171717] hover:text-[#f7f7f7]': !active,
        },
      )}
      href={href}
    >
      {children}
    </a>
  )
}
