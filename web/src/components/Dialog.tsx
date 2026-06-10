import cls from 'classnames'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useRef, type ComponentPropsWithoutRef } from 'react'
import { motion, useReducedMotion } from 'motion/react'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close
export const DialogTitle = DialogPrimitive.Title
export const DialogDescription = DialogPrimitive.Description

type DialogContentProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  motionPreset?: 'dialog' | 'drawer'
  overlayClassName?: string
  overlayLabel?: string
}

export function DialogContent({
  children,
  className,
  motionPreset = 'dialog',
  onOpenAutoFocus,
  overlayClassName,
  overlayLabel,
  ...props
}: DialogContentProps) {
  const contentRef = useRef<HTMLDivElement | null>(null)
  const reduceMotion = useReducedMotion()
  const contentInitial = reduceMotion
    ? false
    : motionPreset === 'drawer'
      ? { opacity: 0, x: -24 }
      : { opacity: 0, scale: 0.97, y: -4 }
  const contentAnimate = motionPreset === 'drawer'
    ? { opacity: 1, x: 0 }
    : { opacity: 1, scale: 1, y: 0 }

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay asChild>
        <motion.button
          animate={{ opacity: 1 }}
          aria-label={overlayLabel}
          className={cls('fixed inset-0 z-50 border-0 bg-app-bg/85 p-0', overlayClassName)}
          initial={reduceMotion ? false : { opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.14 }}
          type="button"
        />
      </DialogPrimitive.Overlay>
      <DialogPrimitive.Content
        asChild
        ref={contentRef}
        onOpenAutoFocus={(event) => {
          if (onOpenAutoFocus !== undefined) {
            onOpenAutoFocus(event)
            return
          }

          event.preventDefault()
          contentRef.current?.focus()
        }}
        {...props}
      >
        <motion.div
          animate={contentAnimate}
          className={cls('fixed z-50 outline-none', className)}
          initial={contentInitial}
          transition={{ duration: reduceMotion ? 0 : 0.16, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
