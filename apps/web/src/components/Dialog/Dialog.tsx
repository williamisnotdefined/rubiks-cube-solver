import * as DialogPrimitive from '@radix-ui/react-dialog'
import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@src/lib/utils'
import { modalContentClassName, modalOverlayClassName } from '../modalFrame'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close
export const DialogTitle = DialogPrimitive.Title
export const DialogDescription = DialogPrimitive.Description

type DialogContentProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  overlayClassName?: string
  overlayLabel?: string
}

export function DialogContent({
  children,
  className,
  overlayClassName,
  overlayLabel,
  ...props
}: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay asChild>
        <button
          aria-label={overlayLabel}
          className={cn(modalOverlayClassName, 'border-0 p-0', overlayClassName)}
          type='button'
        />
      </DialogPrimitive.Overlay>
      <DialogPrimitive.Content asChild {...props}>
        <div className={cn(modalContentClassName, className)}>{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
