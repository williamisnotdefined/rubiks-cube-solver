import { ErrorBoundary, type FallbackProps } from 'react-error-boundary'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'motion/react'
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
  const reduceMotion = useReducedMotion()

  return (
    <main className="flex h-full min-h-0 flex-1 items-center justify-center px-3 py-6 sm:px-5">
      <motion.section
        animate={{ opacity: 1, y: 0 }}
        className="grid w-full max-w-2xl gap-5 border border-app-border-strong bg-app-surface p-5 text-left text-app-text shadow-2xl sm:p-7"
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        role="alert"
        transition={{ duration: reduceMotion ? 0 : 0.16, ease: 'easeOut' }}
      >
        <div className="grid gap-2">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-app-muted">
            {t('errorBoundary.kicker')}
          </p>
          <h1 className="text-2xl font-black uppercase tracking-[0.14em] sm:text-3xl">
            {t('errorBoundary.title')}
          </h1>
          <p className="text-sm font-semibold leading-relaxed text-app-muted">
            {t('errorBoundary.description')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="min-h-10 px-4 py-2" type="button" onClick={resetErrorBoundary}>
            {t('errorBoundary.retry')}
          </Button>
        </div>
      </motion.section>
    </main>
  )
}
