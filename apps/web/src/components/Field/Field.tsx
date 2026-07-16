import cls from 'classnames'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

type FieldProps = ComponentPropsWithoutRef<'label'> & {
  children: ReactNode
  controlId?: string
  description?: ReactNode
  error?: ReactNode
  label: string
  labelClassName?: string
}

export function Field({
  children,
  className,
  controlId,
  description,
  error,
  label,
  labelClassName,
  ...props
}: FieldProps) {
  const descriptionId =
    controlId === undefined || description === undefined ? undefined : `${controlId}-description`
  const errorId = controlId === undefined || error === undefined ? undefined : `${controlId}-error`

  if (controlId === undefined) {
    return (
      <label className={cls('grid min-w-0 gap-2', className)} {...props}>
        <span
          className={cls('text-sm font-medium leading-none text-muted-foreground', labelClassName)}
        >
          {label}
        </span>
        {children}
      </label>
    )
  }

  return (
    <div className={cls('grid min-w-0 gap-2', className)}>
      <label
        className={cls('text-sm font-medium leading-none text-muted-foreground', labelClassName)}
        htmlFor={controlId}
        {...props}
      >
        {label}
      </label>
      {children}
      {description === undefined ? null : (
        <p className='text-sm text-muted-foreground' id={descriptionId}>
          {description}
        </p>
      )}
      {error === undefined ? null : (
        <p className='text-sm text-destructive' id={errorId} role='alert'>
          {error}
        </p>
      )}
    </div>
  )
}
