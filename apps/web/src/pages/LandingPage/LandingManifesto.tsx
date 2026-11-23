import { ArrowUpRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const links = [
  {
    href: 'https://github.com/williamisnotdefined/rubiks-cube-solver',
    labelKey: 'landing.manifestoGithub',
  },
  {
    href: '/api/wca-data/v1/docs',
    labelKey: 'landing.manifestoApi',
  },
] as const

export function LandingManifesto() {
  const { t } = useTranslation()

  return (
    <section className='landing-manifesto w-full py-16 lg:py-24'>
      <div data-landing-reveal='true'>
        <div className='mb-4 flex items-center gap-3'>
          <span className='label-mono bg-cube-red px-2 py-1 text-cube-white'>99 / MANIFESTO</span>
        </div>
        <h2 className='ca-brand max-w-[12ch] font-display text-[clamp(2.4rem,10cqi,5rem)] font-extrabold uppercase leading-[0.84] tracking-[-0.06em]'>
          {t('landing.manifestoTitle')}
        </h2>
      </div>

      <div className='mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:items-start'>
        <div className='grid gap-6' data-landing-reveal='true'>
          <p className='max-w-xl text-sm leading-7 text-muted-foreground sm:text-base'>
            {t('landing.manifestoBody')}
          </p>
          <div className='flex flex-wrap gap-2'>
            {links.map((link) => (
              <a
                className='label-mono inline-flex items-center gap-2 bg-card px-3 py-2 text-[0.58rem] shadow-[4px_4px_0_var(--foreground)] transition-transform hover:-translate-y-0.5'
                href={link.href}
                key={link.href}
                rel='noreferrer'
                target={link.href.startsWith('http') ? '_blank' : undefined}
              >
                {t(link.labelKey)}
                <ArrowUpRight aria-hidden='true' className='size-3.5' />
              </a>
            ))}
          </div>
        </div>

        <div
          className='grid grid-cols-3 gap-4 bg-card p-4 shadow-[4px_4px_0_var(--foreground)]'
          data-landing-reveal='true'
        >
          {[
            ['08', t('landing.chaptersNav')],
            ['09', t('navigation.language')],
            ['01', t('landing.rustEngine')],
          ].map(([value, label]) => (
            <div key={label}>
              <span className='font-display text-3xl font-extrabold leading-none'>{value}</span>
              <span className='label-mono mt-1 block text-[0.5rem] opacity-50'>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
