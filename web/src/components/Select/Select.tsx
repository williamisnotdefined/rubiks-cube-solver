import cls from 'classnames'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import type { ComponentPropsWithoutRef } from 'react'

export const Select = SelectPrimitive.Root
export const SelectGroup = SelectPrimitive.Group
export const SelectValue = SelectPrimitive.Value

const selectTriggerClassName =
  'flex h-12 w-full min-w-0 items-center justify-between gap-2 border border-app-border bg-app-control px-4 py-3 text-base text-app-text outline-none transition-colors focus-visible:border-app-text focus-visible:ring-2 focus-visible:ring-app-focus/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-app-muted aria-invalid:border-app-text md:text-sm'

type SelectTriggerProps = ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>

export function SelectTrigger({ children, className, ...props }: SelectTriggerProps) {
  return (
    <SelectPrimitive.Trigger className={cls(selectTriggerClassName, className)} {...props}>
      {children ?? <SelectPrimitive.Value />}
      <SelectPrimitive.Icon asChild>
        <ChevronDown aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.4} />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

type SelectContentProps = ComponentPropsWithoutRef<typeof SelectPrimitive.Content>

export function SelectContent({ children, className, ...props }: SelectContentProps) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        asChild
        position="popper"
        {...props}
      >
        <div
          className={cls(
            'z-[90] min-w-[var(--radix-select-trigger-width)] overflow-hidden border border-app-border bg-app-surface-raised text-app-text shadow-2xl',
            className,
          )}
        >
          <SelectPrimitive.ScrollUpButton className="flex h-6 cursor-default items-center justify-center border-b border-app-border bg-app-surface-raised text-app-muted">
            <ChevronUp aria-hidden="true" className="size-4" strokeWidth={2.6} />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="max-h-[min(18rem,var(--radix-select-content-available-height))] overflow-y-scroll overscroll-contain p-1 [scrollbar-gutter:stable] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-app-muted [&::-webkit-scrollbar-track]:bg-app-surface-raised">
            {children}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="flex h-6 cursor-default items-center justify-center border-t border-app-border bg-app-surface-raised text-app-muted">
            <ChevronDown aria-hidden="true" className="size-4" strokeWidth={2.6} />
          </SelectPrimitive.ScrollDownButton>
        </div>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

type SelectLabelProps = ComponentPropsWithoutRef<typeof SelectPrimitive.Label>

export function SelectLabel({ className, ...props }: SelectLabelProps) {
  return (
    <SelectPrimitive.Label
      className={cls('px-3 py-2 text-[0.65rem] font-black uppercase tracking-[0.18em] text-app-muted', className)}
      {...props}
    />
  )
}

type SelectItemProps = ComponentPropsWithoutRef<typeof SelectPrimitive.Item>

export function SelectItem({ children, className, ...props }: SelectItemProps) {
  return (
    <SelectPrimitive.Item
      className={cls(
        'relative flex min-h-9 cursor-pointer select-none items-center px-3 pr-9 text-xs font-extrabold uppercase tracking-[0.14em] outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-app-text data-[highlighted]:text-app-inverse',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-3 inline-flex items-center justify-center">
        <Check aria-hidden="true" className="size-4" strokeWidth={2.4} />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}
