import cls from 'classnames'
import * as ToastPrimitive from '@radix-ui/react-toast'
import { X } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useToastStore } from '@core/toast/toastStore'

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const clearToasts = useToastStore((state) => state.clearToasts)
  const dismissToast = useToastStore((state) => state.dismissToast)
  const toasts = useToastStore((state) => state.toasts)

  useEffect(() => {
    clearToasts()

    return clearToasts
  }, [clearToasts])

  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {children}
      {toasts.map((toast) => (
        <ToastPrimitive.Root
          asChild
          duration={3500}
          key={toast.id}
          open
          onOpenChange={(open) => {
            if (!open) {
              dismissToast(toast.id)
            }
          }}
        >
          <motion.li
            animate={{ opacity: 1, x: 0 }}
            className={cls(
              'grid gap-2 border bg-app-surface-raised p-3 text-app-text shadow-2xl outline-none',
              {
                'border-app-border': toast.tone === 'neutral',
                'border-app-success/80': toast.tone === 'success',
                'border-app-danger/80': toast.tone === 'error',
              },
            )}
            initial={reduceMotion ? false : { opacity: 0, x: 18 }}
            transition={{ duration: reduceMotion ? 0 : 0.16, ease: 'easeOut' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="grid gap-1">
                <ToastPrimitive.Title className="text-xs font-extrabold uppercase tracking-[0.16em]">
                  {toast.title}
                </ToastPrimitive.Title>
                {toast.description === undefined ? null : (
                  <ToastPrimitive.Description className="text-sm font-semibold leading-relaxed text-app-muted">
                    {toast.description}
                  </ToastPrimitive.Description>
                )}
              </div>
              <ToastPrimitive.Close
                aria-label={t('common.close')}
                className="inline-flex min-h-7 min-w-7 items-center justify-center border border-app-border bg-app-surface text-app-text outline-none transition-colors hover:border-app-text hover:bg-app-control focus-visible:ring-2 focus-visible:ring-app-focus/50"
                type="button"
              >
                <X aria-hidden="true" className="size-4" strokeWidth={2.4} />
              </ToastPrimitive.Close>
            </div>
          </motion.li>
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport className="fixed bottom-3 right-3 z-[90] grid w-[min(calc(100vw-1.5rem),24rem)] gap-2 outline-none" />
    </ToastPrimitive.Provider>
  )
}
