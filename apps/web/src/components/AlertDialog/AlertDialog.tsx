import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import type { ComponentPropsWithoutRef, MouseEventHandler } from 'react'
import { cn } from '@src/lib/utils'

export const AlertDialog = AlertDialogPrimitive.Root
export const AlertDialogAction = AlertDialogPrimitive.Action
export const AlertDialogCancel = AlertDialogPrimitive.Cancel
export const AlertDialogTitle = AlertDialogPrimitive.Title
export const AlertDialogDescription = AlertDialogPrimitive.Description

type AlertDialogContentProps = ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content> & {
  overlayClassName?: string
  overlayLabel?: string
  onOverlayClick?: MouseEventHandler<HTMLButtonElement>
}

export function AlertDialogContent({
  children,
  className,
  overlayClassName,
  overlayLabel,
  onOverlayClick,
  ...props
}: AlertDialogContentProps) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay asChild>
        <button
          aria-label={overlayLabel}
          className={cn('fixed inset-0 z-50 border-0 bg-black/50 p-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0', overlayClassName)}
          type="button"
          onClick={onOverlayClick}
        />
      </AlertDialogPrimitive.Overlay>
      <AlertDialogPrimitive.Content
        asChild
        {...props}
      >
        <div
          className={cn('fixed z-50 rounded-lg outline-none', className)}
        >
          {children}
        </div>
      </AlertDialogPrimitive.Content>
    </AlertDialogPrimitive.Portal>
  )
}
