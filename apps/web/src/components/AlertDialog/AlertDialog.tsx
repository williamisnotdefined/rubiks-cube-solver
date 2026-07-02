import cls from 'classnames'
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
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
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay asChild>
        <button
          aria-label={overlayLabel}
          className={cls('fixed inset-0 z-50 border-0 bg-app-bg/85 p-0', overlayClassName)}
          type="button"
          onClick={onOverlayClick}
        />
      </AlertDialogPrimitive.Overlay>
      <AlertDialogPrimitive.Content
        asChild
        {...props}
      >
        <div
          className={cls('fixed z-50 outline-none', className)}
        >
          {children}
        </div>
      </AlertDialogPrimitive.Content>
    </AlertDialogPrimitive.Portal>
  )
}
