import cls from 'classnames'
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import { motion, useReducedMotion } from 'motion/react'
import type { ComponentPropsWithoutRef } from 'react'

export const AlertDialog = AlertDialogPrimitive.Root
export const AlertDialogAction = AlertDialogPrimitive.Action
export const AlertDialogCancel = AlertDialogPrimitive.Cancel
export const AlertDialogTitle = AlertDialogPrimitive.Title
export const AlertDialogDescription = AlertDialogPrimitive.Description

type AlertDialogContentProps = ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content> & {
  overlayClassName?: string
  overlayLabel?: string
  onOverlayClick?: () => void
}

export function AlertDialogContent({
  children,
  className,
  overlayClassName,
  overlayLabel,
  onOverlayClick,
  ...props
}: AlertDialogContentProps) {
  const reduceMotion = useReducedMotion()

  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay asChild>
        <motion.button
          animate={{ opacity: 1 }}
          aria-label={overlayLabel}
          className={cls('fixed inset-0 z-50 border-0 bg-app-bg/85 p-0', overlayClassName)}
          initial={reduceMotion ? false : { opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.14 }}
          type="button"
          onClick={onOverlayClick}
        />
      </AlertDialogPrimitive.Overlay>
      <AlertDialogPrimitive.Content
        asChild
        {...props}
      >
        <motion.div
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className={cls('fixed z-50 outline-none', className)}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.97, y: -4 }}
          transition={{ duration: reduceMotion ? 0 : 0.16, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      </AlertDialogPrimitive.Content>
    </AlertDialogPrimitive.Portal>
  )
}
