import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import type { ComponentPropsWithoutRef, MouseEventHandler } from 'react'
import { cn } from '@src/lib/utils'
import { modalContentClassName, modalOverlayClassName } from '../modalFrame'

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
          className={cn(modalOverlayClassName, 'border-0 p-0', overlayClassName)}
          type='button'
          onClick={onOverlayClick}
        />
      </AlertDialogPrimitive.Overlay>
      <AlertDialogPrimitive.Content asChild {...props}>
        <div className={cn(modalContentClassName, className)}>{children}</div>
      </AlertDialogPrimitive.Content>
    </AlertDialogPrimitive.Portal>
  )
}
