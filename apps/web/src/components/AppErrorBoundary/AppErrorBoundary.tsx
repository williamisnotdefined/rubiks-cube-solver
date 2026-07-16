import { ErrorBoundary, type FallbackProps } from 'react-error-boundary'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@components/Button'

type AppErrorBoundaryProps = {
  children: ReactNode
  resetKeys?: unknown[]
}

export function AppErrorBoundary({ children, resetKeys }: AppErrorBoundaryProps) {
  return (
    <ErrorBoundary FallbackComponent={AppErrorFallback} resetKeys={resetKeys}>
      {children}
    </ErrorBoundary>
  )
}

function AppErrorFallback({ resetErrorBoundary }: FallbackProps) {
  const { t } = useTranslation()

  return (
    <main className='flex h-full min-h-0 flex-1 items-center justify-center px-3 py-6 sm:px-5'>
      <section
        className='grid w-full max-w-2xl gap-5 border border-app-border-strong bg-app-surface p-5 text-left text-app-text shadow-2xl sm:p-7'
        role='alert'
      >
        <div className='grid gap-2'>
          <p className='text-xs font-extrabold uppercase tracking-[0.18em] text-app-muted'>
            {t('errorBoundary.kicker')}
          </p>
          <h1 className='text-2xl font-black uppercase tracking-[0.14em] sm:text-3xl'>
            {t('errorBoundary.title')}
          </h1>
          <p className='text-sm font-semibold leading-relaxed text-app-muted'>
            {t('errorBoundary.description')}
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button size='sm' type='button' onClick={resetErrorBoundary}>
            {t('errorBoundary.retry')}
          </Button>
        </div>
      </section>
    </main>
  )
}
