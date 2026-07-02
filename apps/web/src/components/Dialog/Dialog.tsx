import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useRef, type ComponentPropsWithoutRef } from 'react'
import { cn } from '@src/lib/utils'

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

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay asChild>
        <button
          aria-label={overlayLabel}
          className={cn('fixed inset-0 z-50 border-0 bg-black/50 p-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0', overlayClassName)}
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
        <div
          className={cn('fixed z-50 rounded-lg outline-none', className)}
          data-motion-preset={motionPreset}
        >
          {children}
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
